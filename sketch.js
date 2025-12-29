let imgs = [];
let chars = [];
let selected = null;
// 問答系統狀態
let qaActive = false;
let qaAnswered = false;
let qaQuestion = null;
let qaInput = null;
let qaSubmitBtn = null;
let qaNewBtn = null;
let qaCancelBtn = null;
let qaMessage = '';
let qaTargetIndex = null;
let qaIgnoreUntil = 0; // millis() until which triggers are ignored
// 每側是否允許觸發（索引為 0 與 2）
let triggerEnabled = { 0: true, 2: true };
// 背景資源（已恢復為單色背景）
let particles = [];
// 特效相關變數
let feedbackAnimStart = -9999;
let feedbackType = 'none';
let confetti = [];
// 通關狀態變數
let correctCount = 0;
let levelComplete = false;
// 遊戲狀態
let gameState = 'START'; // START, PLAYING, GAMEOVER
let startBtn;
let currentLevel = 1;
let levelTransitionStart = 0;
let availableQuestions = [];

function preload() {
  // 請確認資料夾 1,2,3 底下分別有 all-1.png, all-2.png, all-3.png
  imgs[0] = loadImage('1/all-1.png', () => {}, () => { console.warn('無法載入 1/all-1.png'); });
  imgs[1] = loadImage('2/all-2.png', () => {}, () => { console.warn('無法載入 2/all-2.png'); });
  imgs[2] = loadImage('3/all-3.png', () => {}, () => { console.warn('無法載入 3/all-3.png'); });
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  imageMode(CENTER);
  initLevelEnvironment();
  // 三個角色平均站在螢幕中間（水平等距，垂直置中）
  const centerY = height / 2;
  const spacing = width / 4;
  const centerX = width / 2;
  // 傳入對應的 sprite sheet 與設定（皆為 10 幀）
  // 注意：只有中間角色 controllable: true（可用鍵盤/滑鼠移動）
  chars.push(new Character(imgs[0], createVector(centerX - spacing, centerY), { frames: 10, size: 220, frameSpeed: 0.18, controllable: false, hp: 50, maxHp: 50 }));
  chars.push(new Character(imgs[1], createVector(centerX, centerY), { frames: 10, size: 220, frameSpeed: 0.14, controllable: true, speed: 3.5, hp: 3, maxHp: 3 })); // 玩家 HP 3
  chars.push(new Character(imgs[2], createVector(centerX + spacing, centerY), { frames: 10, size: 220, frameSpeed: 0.12, controllable: false, hp: 50, maxHp: 50 }));

  // 建立 QA DOM 元件（預設隱藏）
  qaInput = createInput('');
  qaInput.position(width / 2 - 120, height - 140);
  qaInput.size(240, 28);
  qaInput.hide();
  qaInput.style('z-index', '9999');

  qaSubmitBtn = createButton('送出');
  qaSubmitBtn.position(width / 2 + 130, height - 140);
  qaSubmitBtn.mousePressed(handleSubmit);
  qaSubmitBtn.hide();
    qaSubmitBtn.size(80, 34);
    qaSubmitBtn.style('font-size', '14px');
  qaSubmitBtn.style('z-index', '9999');

  qaNewBtn = createButton('新題目');
  qaNewBtn.position(width / 2 + 10, height - 90);
  qaNewBtn.mousePressed(handleNewQuestion);
  qaNewBtn.hide();
    qaNewBtn.size(100, 36);
    qaNewBtn.style('font-size', '14px');
  qaNewBtn.style('z-index', '9999');

  qaCancelBtn = createButton('退出');
  qaCancelBtn.position(width / 2 - 240, height - 140);
  qaCancelBtn.mousePressed(handleCancel);
  qaCancelBtn.hide();
    // 使退出按鈕更顯眼
    qaCancelBtn.size(140, 44);
    qaCancelBtn.style('background-color', '#e63946');
    qaCancelBtn.style('color', '#ffffff');
    qaCancelBtn.style('font-weight', '700');
    qaCancelBtn.style('font-size', '16px');
    qaCancelBtn.style('border-radius', '8px');
    qaCancelBtn.style('border', 'none');
    qaCancelBtn.style('z-index', '9999');

  // 建立開始遊戲按鈕
  startBtn = createButton('開始遊戲');
  startBtn.position(width / 2 - 100, height / 2 + 60);
  startBtn.size(200, 60);
  startBtn.style('font-size', '24px');
  startBtn.style('background-color', '#D32F2F'); // 戰鬥紅
  startBtn.style('color', 'white');
  startBtn.style('border', 'none');
  startBtn.style('border-radius', '10px');
  startBtn.style('cursor', 'pointer');
  startBtn.style('z-index', '10000'); // 確保按鈕在最上層
  startBtn.mousePressed(startGame);
}

function draw() {
  if (gameState === 'START') {
    drawStartScreen();
    return;
  }
  if (gameState === 'GAMEOVER') {
    drawGameOverScreen();
    return;
  }
  if (gameState === 'VICTORY') {
    drawVictoryScreen();
    return;
  }
  if (gameState === 'LEVEL_TRANSITION') {
    drawLevelTransitionScreen();
    return;
  }
  push();
  // 答錯時震動畫面
  if (feedbackType === 'wrong' && millis() - feedbackAnimStart < 400) {
    translate(random(-10, 10), random(-10, 10));
  }
  if (currentLevel >= 3) {
    drawOceanBackground();
  } else if (currentLevel >= 2) {
    drawRuinsBackground();
  } else {
    drawWarBackground();
  }
  // 只有中間角色支援鍵盤持續移動
  handleContinuousKeys();

  // 檢查中間角色是否接近左右角色以觸發招式與對話
  checkTriggers();

  for (let c of chars) {
    c.update();
    c.draw();
  }
  // 若問答介面啟動，繪製遮罩與題目文字
  if (qaActive || qaAnswered) {
    // 將 QA DOM 元件位置更新到題目框下方
    updateQAPositions();
    push();
    noStroke();
    fill(0, 150);
    rect(0, 0, width, height);

    const boxW = min(640, width - 80);
    const boxH = 220;
    const bx = width / 2 - boxW / 2;
    const by = height / 2 - boxH / 2 - 60;

    fill(255);
    rect(bx, by, boxW, boxH, 12);

    if (levelComplete) {
      // 通關畫面
      fill(255, 140, 0);
      textSize(36);
      textAlign(CENTER, CENTER);
      text(currentLevel >= 3 ? "★ 恭喜通關 ★" : `★ 第 ${currentLevel} 關通過 ★`, bx + boxW / 2, by + boxH / 2 - 20);
      textSize(20);
      fill(80);
      text("你已成功答對 3 題！", bx + boxW / 2, by + boxH / 2 + 30);
    } else {
      // 一般問答畫面
      fill(10);
      textSize(22);
      textAlign(LEFT, TOP);
      if (qaQuestion) text(qaQuestion.text, bx + 18, by + 16);
      textSize(20);
      fill(255, 50, 50); // 使用紅色讓回饋更明顯
      text(qaMessage, bx + 18, by + 160);
    }
    pop();
  }
  // 簡短提示（可移除）
  noStroke();
  fill(255, 200);
  textSize(14);
  textAlign(LEFT, TOP);
  text('412730730郭睿濬', 30, 30);
  text(`Level: ${currentLevel}`, 30, 50);

  // 答對時的彩帶特效
  if (feedbackType === 'correct' && millis() - feedbackAnimStart < 2500) {
    noStroke();
    for (let p of confetti) {
      fill(p.c);
      rect(p.x, p.y, p.size, p.size);
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.2; // 重力
    }
  }
  pop();

  // 答錯時的紅色閃爍 (畫在最上層)
  if (feedbackType === 'wrong' && millis() - feedbackAnimStart < 400) {
    noStroke();
    fill(255, 0, 0, map(millis() - feedbackAnimStart, 0, 400, 100, 0));
    rect(0, 0, width, height);
  }
  // 答對時的綠色閃爍
  if (feedbackType === 'correct' && millis() - feedbackAnimStart < 400) {
    noStroke();
    fill(0, 255, 0, map(millis() - feedbackAnimStart, 0, 400, 80, 0));
    rect(0, 0, width, height);
  }
}

function drawStartScreen() {
  drawStartBackground(); // 改用專屬的開始畫面背景
  
  push();
  textAlign(CENTER, CENTER);
  
  // 標題陰影
  fill(0, 150);
  textSize(64);
  text("淡江大亂鬥", width / 2 + 4, height / 2 - 60 + 4);
  
  // 標題本體
  fill(255, 215, 0); // 金色
  textStyle(BOLD);
  text("淡江大亂鬥", width / 2, height / 2 - 60);
  
  textSize(20);
  fill(220);
  text("412730730郭睿濬", width / 2, height - 40);
  pop();
}

function drawGameOverScreen() {
  background(0); // 全黑背景
  drawWarBackground(); // 疊加戰場背景但更暗
  
  push();
  fill(0, 150);
  rect(0, 0, width, height); // 半透明遮罩
  
  textAlign(CENTER, CENTER);
  textSize(64);
  fill(255, 0, 0);
  textStyle(BOLD);
  text("YOU DIED", width / 2, height / 2 - 60);
  
  textSize(24);
  fill(200);
  text("勝敗乃兵家常事，大俠請重新來過", width / 2, height / 2 + 10);
  pop();

  // 按鈕會由 startGame 邏輯重置，這裡只需顯示畫面
}

function drawVictoryScreen() {
  background(0);
  drawOceanBackground(); // 使用海洋背景作為基底
  
  push();
  fill(0, 150);
  rect(0, 0, width, height); // 半透明遮罩
  
  textAlign(CENTER, CENTER);
  textSize(64);
  fill(255, 215, 0); // 金色
  textStyle(BOLD);
  text("VICTORY", width / 2, height / 2 - 60);
  
  textSize(24);
  fill(255);
  text("恭喜你通過所有試煉！", width / 2, height / 2 + 10);
  pop();
}

function drawLevelTransitionScreen() {
  background(0);
  textAlign(CENTER, CENTER);
  textSize(60);
  fill(255);
  text(`Level ${currentLevel}`, width / 2, height / 2);
  
  if (millis() - levelTransitionStart > 2000) {
    gameState = 'PLAYING';
    resetCharacters();
    initLevelEnvironment();
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  // 重新排列三個角色（保留相對位置）
  const centerY = height / 2;
  const spacing = width / 4;
  const centerX = width / 2;
  if (chars.length >= 3) {
    chars[0].pos.set(centerX - spacing, centerY);
    chars[1].pos.set(centerX, centerY);
    chars[2].pos.set(centerX + spacing, centerY);
  }
  // 重新定位 QA DOM（若顯示中）
  if (qaActive) updateQAPositions();
  if (startBtn) startBtn.position(width / 2 - 100, height / 2 + 60);
  // 不需重新產生自訂背景
}
// 初始化關卡環境（背景粒子）
function initLevelEnvironment() {
  particles = []; // 清空舊的粒子
  for (let i = 0; i < 400; i++) {
    let p = {
      x: random(width),
      y: random(height),
      size: random(1, 4),
      alpha: random(80, 200)
    };
    if (currentLevel >= 3) {
      // 海洋：上升的氣泡
      p.vy = random(-1, -3);
      p.vx = random(-0.5, 0.5);
    } else if (currentLevel >= 2) {
      // 廢墟：緩慢飄動的塵埃
      p.vy = random(-0.2, -0.8);
      p.vx = random(-0.5, 0.5);
    } else {
      // 戰場：快速上升的火星
      p.vy = random(-1, -3);
      p.vx = 0;
    }
    particles.push(p);
  }
}

// 繪製戰爭感背景
function drawWarBackground() {
  background('#2c1d12'); // 深棕色背景
  drawArena('war'); // 繪製擂台
  noStroke();
  for (const p of particles) {
    // 橘紅色調的粒子，像火星
    fill(255, random(50, 150), 0, p.alpha);
    ellipse(p.x, p.y, p.size);
    p.y += p.vy;
    // 如果飄出頂部，重新回到下方
    if (p.y < 0) p.y = height;
  }
}

// 繪製廢墟感背景 (Level 2+)
function drawRuinsBackground() {
  background(30, 35, 40); // 深灰藍色背景
  
  // 遠景廢墟剪影
  fill(15, 20, 25);
  noStroke();
  beginShape();
  vertex(0, height);
  for (let x = 0; x <= width; x += 40) {
    // 使用 noise 產生破碎的建築輪廓
    let h = map(noise(x * 0.01, currentLevel * 100), 0, 1, 50, 250);
    if (x % 80 < 40) h += 60; // 增加一些方塊感
    vertex(x, height - h);
  }
  vertex(width, height);
  endShape(CLOSE);

  drawArena('ruins'); // 繪製廢墟風格擂台

  // 繪製塵埃粒子
  noStroke();
  for (const p of particles) {
    fill(200, 200, 210, p.alpha * 0.5); // 灰白色塵埃
    ellipse(p.x, p.y, p.size);
    p.y += p.vy;
    p.x += p.vx;
    // 循環
    if (p.y < 0) p.y = height;
    if (p.x > width) p.x = 0;
    if (p.x < 0) p.x = width;
  }
}

// 繪製海洋背景 (Level 3)
function drawOceanBackground() {
  background(0, 105, 148); // 海洋藍背景
  
  // 海底光影效果
  noStroke();
  for (let x = 0; x <= width; x += 50) {
    let alpha = map(sin(x * 0.02 + millis() * 0.001), -1, 1, 10, 40);
    fill(255, 255, 255, alpha);
    rect(x, 0, 50, height);
  }

  drawArena('ocean'); // 繪製海洋風格擂台

  // 繪製氣泡粒子
  noStroke();
  for (const p of particles) {
    fill(255, 255, 255, p.alpha * 0.6); // 白色半透明氣泡
    ellipse(p.x, p.y, p.size);
    p.y += p.vy;
    p.x += p.vx + sin(millis() * 0.005 + p.y * 0.01) * 0.5; // 左右搖擺上升
    
    // 循環
    if (p.y < 0) p.y = height;
    if (p.x > width) p.x = 0;
    if (p.x < 0) p.x = width;
  }
}

// 繪製開始畫面的背景（戰鬥氣息濃厚）
function drawStartBackground() {
  // 燃燒的戰場氛圍：深紅黑色背景
  background(20, 5, 5);

  // 背景火光暈染
  noStroke();
  let t = millis() * 0.001;
  for (let i = 0; i < 5; i++) {
    let x = width * noise(i, t * 0.1);
    let y = height * (0.4 + 0.6 * noise(i + 10, t * 0.1));
    let s = width * (0.5 + 0.5 * noise(i + 20));
    fill(200, 50, 0, 20); // 淡淡的紅光
    ellipse(x, y, s);
  }

  // 向上飄的火星
  for (let i = 0; i < 60; i++) {
    let seed = i * 100;
    let speed = 1 + (i % 3);
    // 讓火星隨時間往上飄，並循環
    let y = (height + (i * 50) - (millis() * 0.1 * speed)) % (height + 50) - 20;
    let x = (width * noise(seed, y * 0.002)) + (sin(millis() * 0.002 + i) * 20);
    
    let size = random(2, 6);
    let alpha = map(y, height, 0, 255, 0); // 越往上越淡
    fill(255, 100 + random(155), 0, alpha);
    ellipse(x, y, size);
  }

  // 地面剪影 (焦土)
  fill(10, 0, 0);
  beginShape();
  vertex(0, height);
  for (let x = 0; x <= width; x += 50) {
    vertex(x, height * 0.85 - noise(x * 0.01) * 50);
  }
  vertex(width, height);
  endShape(CLOSE);
}

// 繪製擂台
function drawArena(theme = 'war') {
  const arenaY = height / 2 + 150; // 擂台地板的 Y 軸位置
  const arenaRadiusX = width * 0.4; // 擂台的 X 半徑
  const arenaRadiusY = 80; // 擂台的 Y 半徑（透視感）

  push();
  noStroke();

  // 擂台平台 (深色橢圓)
  if (theme === 'ruins') {
    fill(50, 55, 60); // 廢墟：冷灰色
  } else if (theme === 'ocean') {
    fill(20, 40, 60); // 海洋：深藍色
  } else {
    fill(40, 35, 30); // 戰場：深棕色
  }
  ellipse(width / 2, arenaY, arenaRadiusX * 2, arenaRadiusY * 2);

  // 平台內圈 (較亮)
  if (theme === 'ruins') {
    fill(70, 75, 80);
  } else if (theme === 'ocean') {
    fill(30, 60, 90);
  } else {
    fill(65, 60, 55);
  }
  ellipse(width / 2, arenaY, arenaRadiusX * 1.8, arenaRadiusY * 1.8);

  // 繪製柱子和繩索
  const numPosts = 8;
  const postHeight = 280;
  let postPositions = [];

  for (let i = 0; i < numPosts; i++) {
    const angle = TWO_PI / numPosts * i;
    const x = width / 2 + cos(angle) * arenaRadiusX;
    // 根據角度微調 Y，模擬橢圓透視
    const y = arenaY + sin(angle) * arenaRadiusY;
    postPositions.push({ x, y });

    // 繪製柱子
    fill(theme === 'ruins' ? 100 : (theme === 'ocean' ? 60 : 80));
    rect(x - 5, y - postHeight, 10, postHeight);
  }

  // 繪製繩索 (連接柱子)
  if (theme === 'ruins') {
    stroke(100, 120, 130); // 廢墟：灰藍色繩索
  } else if (theme === 'ocean') {
    stroke(0, 200, 255); // 海洋：亮藍色繩索
  } else {
    stroke(200, 50, 50); // 戰場：紅色繩索
  }
  strokeWeight(4);
  for (let i = 0; i < postPositions.length; i++) {
    const p1 = postPositions[i];
    const p2 = postPositions[(i + 1) % postPositions.length]; // 連接到下一根柱子
    // 畫兩層繩索
    line(p1.x, p1.y - postHeight * 0.6, p2.x, p2.y - postHeight * 0.6);
    line(p1.x, p1.y - postHeight * 0.9, p2.x, p2.y - postHeight * 0.9);
  }

  pop();
}

class Character {
  constructor(img, pos, opts = {}) {
    this.img = img;
    this.pos = pos.copy();
    this.vel = createVector(0, 0);
    this.speed = opts.speed || 3;
    this.size = opts.size || 120;
    this.autonomous = opts.autonomous || false;
    this.controllable = opts.controllable || false; // 新增：是否可被玩家控制
    this.dragging = false;
    this.noiseOffset = random(1000);

    // sprite 帧數與動畫
    this.frameCount = opts.frames || 10;
    this.frameIndex = 0;
    this.frameSpeed = opts.frameSpeed || 0.16; // 每 draw 增加的帧數（小數允許平滑）
    // 計算單帧寬高（假設水平排列）
    this.frameW = this.img ? (this.img.width / this.frameCount) : 0;
    this.frameH = this.img ? this.img.height : 0;

    // 招式相關
    this.attackTimer = 0; // 正在發動招式的計時（frame）
    this.attackDuration = 60; // 招式持續時間（frame）
    this.cooldownTimer = 0; // 冷卻計時（frame）
    this.cooldownDuration = 150; // 冷卻總長（frame）

    // 戰鬥數值
    this.maxHp = opts.maxHp || 10;
    this.hp = opts.hp !== undefined ? opts.hp : this.maxHp;
    this.hitTimer = 0; // 受傷閃爍計時
    // 對話相關（conversation 物件會被放在參與者共用）
    this.conversation = null;
  }

  triggerAttack(partner = null) {
    // 若在冷卻或正在發動，忽略
    if (this.cooldownTimer > 0 || this.attackTimer > 0) return;
    this.attackTimer = this.attackDuration;
    this.cooldownTimer = this.cooldownDuration;
    // 同時可啟動對話
    if (partner) {
      this.startConversation(partner);
    }
  }

  takeDamage(amount) {
    this.hp -= amount;
    if (this.hp < 0) this.hp = 0;
    this.hitTimer = 20; // 受傷特效持續 20 frames
  }

  startConversation(partner) {
    // 若已有 conversation 則忽略
    if (this.conversation || (partner && partner.conversation)) return;

    // 簡單對話片段庫（可擴充或替換）
    const linesA = [ // 挑釁的台詞
      "站住！你是誰？",
      "這裡不歡迎你。",
      "準備受死吧！",
      "又一個來送死的。"
    ];
    const linesB = [ // 回應的台詞
      "你管不著！",
      "這條路是我的。",
      "放馬過來！",
      "廢話少說！"
    ];
    // 建立交替對話內容（隨機抽取幾句）
    const rounds = 4; // 交談交換次數（句數）
    const lines = [];
    for (let i = 0; i < rounds; i++) {
      // 偶數由 this（被觸發者）先說，奇數由 partner 回應
      lines.push(random(linesA));
      lines.push(random(linesB));
    }

    const conv = {
      lines: lines,
      index: 0,
      perLine: 90, // 每句顯示時間（frame）
      timer: 90,
      participants: [this, partner],
      active: true
    };
    // 將 conversation 物件 reference 放到雙方，便於顯示與同步
    this.conversation = conv;
    partner.conversation = conv;
  }

  update() {
    // 動畫更新（不依賴於是否被拖曳）
    this.frameIndex = (this.frameIndex + this.frameSpeed) % this.frameCount;

    if (this.dragging && this.controllable) {
      // 由滑鼠拖曳控制位置，平滑跟隨（僅中間角色會觸發）
      const target = createVector(mouseX, mouseY);
      this.pos.lerp(target, 0.25);
      this.vel.mult(0.5);
    } else if (this.autonomous && !this.controllable) {
      // 若設定為自漫遊且非 controllable（可選）
      const t = millis() * 0.0005 + this.noiseOffset;
      const angle = noise(t) * TWO_PI * 2;
      const v = p5.Vector.fromAngle(angle).mult(this.speed * 0.6);
      this.vel.lerp(v, 0.05);
      this.pos.add(this.vel);
    } else {
      // 若為玩家可控制但非拖曳（會被外部鍵盤邏輯改變 vel），或純靜止的 AI
      this.pos.add(this.vel);
      // 輕微摩擦
      this.vel.mult(0.85);
    }

    // 招式計時器
    if (this.attackTimer > 0) {
      this.attackTimer--;
    }
    if (this.cooldownTimer > 0) {
      this.cooldownTimer--;
    }

    // 對話計時器（共享 conversation 物件處理）
    if (this.conversation && this.conversation.active) {
      // 僅由 participants[0] 或 participants[1] 任何一方更新（每個 frame 都會跑到，但只在 index 滾動時同步）
      const conv = this.conversation;
      conv.timer--;
      if (conv.timer <= 0) {
        conv.index++;
        if (conv.index >= conv.lines.length) {
          // 結束對話
          conv.active = false;
          for (let p of conv.participants) {
            if (p) p.conversation = null;
          }
        } else {
          conv.timer = conv.perLine;
        }
      }
    }

    // 受傷計時
    if (this.hitTimer > 0) this.hitTimer--;

    // 邊界約束（停在畫面內）
    this.pos.x = constrain(this.pos.x, this.size * 0.4, width - this.size * 0.4);
    this.pos.y = constrain(this.pos.y, this.size * 0.4, height - this.size * 0.4);
  }

  draw() {
    push();
    translate(this.pos.x, this.pos.y);

    // Level 2 火焰特效 (僅在第二關顯示)
    if (currentLevel === 2) {
      noStroke();
      blendMode(ADD); // 使用 ADD 混合模式產生發光效果
      const t = millis() * 0.005;
      for (let i = 0; i < 8; i++) {
        // 讓火焰在角色腳邊環繞
        const angle = (i / 8) * TWO_PI + t;
        const radius = this.size * 0.25 + sin(t * 2 + i) * 10;
        const x = cos(angle) * radius;
        const y = this.size * 0.4; // 火焰基底高度

        const flameSize = random(20, 45);
        const r = 255;
        const g = 100 + random(120);
        fill(r, g, 0, random(80, 160));
        // 繪製向上飄動的火焰形狀
        ellipse(x, y - random(flameSize * 0.5), flameSize * 0.5, flameSize);
      }
      blendMode(BLEND); // 重設混合模式，避免影響其他繪圖
    }

    // Level 3 海浪特效 (第三關顯示)
    if (currentLevel >= 3) {
      noStroke();
      blendMode(ADD);
      const t = millis() * 0.004;
      for (let i = 0; i < 6; i++) {
        // 圍繞角色的波浪圈
        const angle = (i / 6) * TWO_PI + t;
        const rOffset = sin(t * 2 + i) * 10;
        const x = cos(angle) * (this.size * 0.4 + rOffset);
        const y = sin(angle) * (this.size * 0.15) + this.size * 0.4; // 壓扁成橢圓，位於腳底
        
        fill(0, 255, 255, 120); // 青藍色水波
        ellipse(x, y, 18, 10);
      }
      blendMode(BLEND); // 重設混合模式，避免影響其他繪圖
    }

    // 受傷震動與變色
    if (this.hitTimer > 0) {
      translate(random(-8, 8), random(-8, 8));
      tint(255, 100, 100); // 變紅
    }

    // 招式視覺效果（若正在發動：放大與光暈）
    if (this.attackTimer > 0) {
      const p = 1 - (this.attackTimer / this.attackDuration); // 0 -> 1
      // 光暈
      // 模擬爆炸效果，使用多層、顏色不同的圓形
      noStroke();
      const baseGlow = this.size * (1 + p * 2.5);
      // 外層紅色
      fill(255, 0, 0, 150 * (1 - p));
      ellipse(0, 0, baseGlow, baseGlow * 0.7);
      // 內層橘黃色
      fill(255, 180, 0, 200 * (1 - p));
      ellipse(0, 0, baseGlow * 0.6, baseGlow * 0.4);
    }

    // 如果圖片還沒載入，畫一個佔位圓
    if (this.img && this.frameW > 0) {
      // 計算顯示寬高以符合 this.size 並維持帧比例
      const asp = this.frameW / this.frameH;
      let w = this.size;
      let h = this.size;
      if (asp > 1) h = w / asp;
      else w = h * asp;

      // 若正在發動招式，稍微放大 sprite
      if (this.attackTimer > 0) {
        const scaleFactor = 1 + 0.35 * (1 - (this.attackTimer / this.attackDuration));
        w *= scaleFactor;
        h *= scaleFactor;
      }

      // 計算來源 x（整數）
      const srcX = floor(this.frameIndex) * this.frameW;
      image(this.img, 0, 0, w, h, srcX, 0, this.frameW, this.frameH);
    } else {
      noStroke();
      fill(200);
      ellipse(0, 0, this.size * 0.8);
    }

    // 若冷卻中，畫出冷卻條
    if (this.cooldownTimer > 0 && this.cooldownTimer < this.cooldownDuration) {
      const cw = this.size;
      const ch = 6;
      push();
      translate(-cw / 2, this.size * 0.6);
      noStroke();
      fill(60);
      rect(0, 0, cw, ch, 3);
      fill(210, 210, 210); // 將冷卻條改為灰色
      const pct = 1 - (this.cooldownTimer / this.cooldownDuration);
      rect(0, 0, cw * pct, ch, 3);
      pop();
    }

    // 對話泡泡繪製：只有當 conversation active 且此刻輪到自己發言時顯示
    if (this.conversation && this.conversation.active) {
      const conv = this.conversation;
      const speaker = conv.participants[conv.index % 2];
      if (speaker === this) {
        const textStr = conv.lines[conv.index] || '';
        drawSpeechBubble(0, -this.size * 0.75, textStr, this.size * 0.9);
      }
    }

    // 繪製血量條 (HP Bar)
    const barW = this.size;
    const barH = 10;
    const barY = -this.size * 0.6 - 15;
    
    // 血條背景
    noStroke();
    fill(50);
    rect(-barW / 2, barY, barW, barH, 4);
    
    // 血條本體
    const hpPct = this.hp / this.maxHp;
    fill(hpPct > 0.5 ? '#4CAF50' : (hpPct > 0.2 ? '#FFC107' : '#FF5252'));
    rect(-barW / 2, barY, barW * hpPct, barH, 4);

    pop();
  }

  isHit(x, y) {
    return dist(x, y, this.pos.x, this.pos.y) < this.size * 0.5;
  }
}

// 按鍵一次性事件（保留） — 僅對中間角色（chars[1]）生效
function keyPressed() {
  // 支援 Esc 退出問答
  if (keyCode === 27) {
    handleCancel();
    return;
  }
  const s = 3;
  const mid = chars[1];
  if (!mid || !mid.controllable) return;

  // 支援 WASD 與 箭頭鍵
  if (key === 'w' || key === 'W' || keyCode === UP_ARROW) mid.vel.add(0, -s);
  if (key === 's' || key === 'S' || keyCode === DOWN_ARROW) mid.vel.add(0, s);
  if (key === 'a' || key === 'A' || keyCode === LEFT_ARROW) mid.vel.add(-s, 0);
  if (key === 'd' || key === 'D' || keyCode === RIGHT_ARROW) mid.vel.add(s, 0);
}

// 支援持續按鍵控制（使移動更靈活） — 僅控制中間角色
function handleContinuousKeys() {
  const s = 0.5; // 每 frame 加速度
  const mid = chars[1];
  if (!mid || !mid.controllable) return;

  // WASD 或 箭頭
  if (keyIsDown(87) || keyIsDown(UP_ARROW)) mid.vel.add(0, -s); // W / up
  if (keyIsDown(83) || keyIsDown(DOWN_ARROW)) mid.vel.add(0, s); // S / down
  if (keyIsDown(65) || keyIsDown(LEFT_ARROW)) mid.vel.add(-s, 0); // A / left
  if (keyIsDown(68) || keyIsDown(RIGHT_ARROW)) mid.vel.add(s, 0); // D / right
}

function mousePressed() {
  // 只允許中間角色被點擊拖曳
  const mid = chars[1];
  if (mid && mid.isHit(mouseX, mouseY) && mid.controllable) {
    mid.dragging = true;
    selected = mid;
  } else {
    selected = null;
  }
}

function mouseReleased() {
  for (let c of chars) c.dragging = false;
  selected = null;
}

// 檢查中間角色是否接近左右角色並觸發招式與對話
function checkTriggers() {
  if (chars.length < 3) return;
  const mid = chars[1];
  if (!mid) return;

  // 若在短暫免觸發期間，略過
  if (millis() < qaIgnoreUntil) return;

  // 判定距離門檻（水平接近或整體距離）
  for (let i of [0, 2]) {
    const other = chars[i];
    const dx = abs(mid.pos.x - other.pos.x);
    const dy = abs(mid.pos.y - other.pos.y);
    // 門檻可調：以角色寬度為基準
    const thresholdX = (mid.size + other.size) * 0.6;
    const thresholdY = (mid.size + other.size) * 0.6;
    // 如果此側暫時被禁止觸發，檢查玩家是否已離開來重新啟用
    if (!triggerEnabled[i]) {
      if (dx > thresholdX * 1.2 || dy > thresholdY * 1.2) {
        triggerEnabled[i] = true;
      }
      continue;
    }

    if (dx < thresholdX && dy < thresholdY) {
      other.triggerAttack(mid); // 傳入 mid 作為對話夥伴
      // 啟動互動（若尚未進行中）
      if (!qaActive) {
        if (i === 0) {
          // 左邊角色：給予提示
          startHintMode(i);
        } else {
          // 右邊角色：回答問題 (戰鬥)
          startMathChallenge(i);
        }
      }
    }
  }
}

// 淡江大學問題庫
const tkuQuestions = [
  { text: '淡江大學的英文縮寫？\n(A) NTU  (B) TKU  (C) NCCU', answer: 'B' },
  { text: '淡江大學的校訓？\n(A) 樸實剛毅  (B) 禮義廉恥  (C) 敦品勵學', answer: 'A' },
  { text: '淡江大學位於哪裡？\n(A) 板橋  (B) 淡水  (C) 三重', answer: 'B' },
  { text: '克難坡共有幾階？\n(A) 100  (B) 132  (C) 150', answer: 'B' },
  { text: '圖書館的名稱？\n(A) 覺生  (B) 逸仙  (C) 中正', answer: 'A' },
  { text: '像船的建築物是？\n(A) 體育館  (B) 海事博物館  (C) 文館', answer: 'B' },
  { text: '淡江大學位於哪座崗？\n(A) 華岡  (B) 五虎崗  (C) 陽明山', answer: 'B' },
  { text: '創辦人是誰？\n(A) 張建邦  (B) 馬英九  (C) 李登輝', answer: 'A' },
  { text: '宮廷式建築教室叫？\n(A) 宮燈教室  (B) 四合院  (C) 三合院', answer: 'A' },
  { text: '校慶在幾月？\n(A) 3月  (B) 5月  (C) 11月', answer: 'C' },
  { text: '淡江大學的校花是？\n(A) 杜鵑花  (B) 玫瑰花  (C) 宮燈蘭', answer: 'C' },
  { text: '離淡水校區最近的捷運站是？\n(A) 紅樹林站  (B) 淡水站  (C) 竹圍站', answer: 'B' },
  { text: '淡江大學最初是以什麼起家？\n(A) 英文專科學校  (B) 數學專科學校  (C) 理工學院', answer: 'A' },
  { text: '淡江大學的體育館名稱是？\n(A) 中正體育館  (B) 紹謨紀念體育館  (C) 淡江體育館', answer: 'B' },
  { text: '被學生暱稱為「蛋捲」的是哪個系的系館？\n(A) 建築系  (B) 資工系  (C) 電機系', answer: 'A' },
  { text: '校園內的白色拱橋叫什麼名字？\n(A) 驚聲橋  (B) 克難橋  (C) 五虎橋', answer: 'A' },
  { text: '哪個校區以全英語授課聞名？\n(A) 台北校區  (B) 淡水校區  (C) 蘭陽校區', answer: 'C' },
  { text: '淡江大學的文學院大樓簡稱？\n(A) 文館  (B) 商館  (C) 工館', answer: 'A' },
  { text: '海事博物館的實習船原名是？\n(A) 月亮號  (B) 太陽號  (C) 彩雲號', answer: 'C' },
  { text: '學生餐廳主要在哪棟大樓？\n(A) 圖書館  (B) 商管大樓  (C) 學生活動中心', answer: 'C' }
];

// 淡江大學小知識（提示庫）
const tkuHints = [
  "你知道嗎？淡江大學的英文縮寫是 TKU 喔！",
  "淡江大學的校訓是「樸實剛毅」。",
  "淡江大學的校本部主要位於淡水區。",
  "考驗體力的克難坡一共有 132 階。",
  "學校的圖書館名稱是「覺生紀念圖書館」。",
  "校園裡那棟像船一樣的建築是海事博物館。",
  "淡江大學座落於「五虎崗」之上。",
  "淡江大學的創辦人是張建邦博士。",
  "古色古香的宮廷式建築教室稱為「宮燈教室」。",
  "淡江大學的校慶通常是在 11 月舉行。",
  "傳說中淡江的校花是「宮燈蘭」。",
  "離淡水校區最近的捷運站是淡水站，轉公車很方便。",
  "淡江大學最早的前身是「英文專科學校」。",
  "體育館的正式名稱是「紹謨紀念體育館」。",
  "建築系的系館因為外型特殊，有時候被暱稱為「蛋捲」。",
  "校園內那座白色的拱橋叫做「驚聲橋」。",
  "以全英語授課聞名的校區是位於宜蘭的「蘭陽校區」。",
  "文學院大樓通常被簡稱為「文館」。",
  "海事博物館那艘船原本的名字叫做「彩雲號」。",
  "學生餐廳主要集中在「學生活動中心」。"
];

// 從問題庫中隨機產生一個關於淡江大學的問題
function generateQuestion() {
  if (availableQuestions.length === 0) {
    availableQuestions = [...tkuQuestions];
  }
  const index = floor(random(availableQuestions.length));
  const question = availableQuestions[index];
  availableQuestions.splice(index, 1);
  return {
    text: question.text,
    answer: question.answer
  };
}

// 啟動提示模式 (左邊角色)
function startHintMode(sideIndex) {
  qaActive = true;
  qaAnswered = false;
  
  const hint = random(tkuHints);
  qaQuestion = { text: "【小提示】\n" + hint, answer: "" };
  
  qaTargetIndex = sideIndex;
  if (sideIndex === 0 || sideIndex === 2) triggerEnabled[sideIndex] = false;
  qaIgnoreUntil = millis() + 1200;

  // 隱藏輸入框與送出按鈕，只顯示確認鍵
  qaInput.hide();
  qaSubmitBtn.hide();
  qaNewBtn.hide();
  
  qaCancelBtn.html('知道了'); // 將按鈕文字改為「知道了」
  qaCancelBtn.show();
  
  qaMessage = '';
  
  if (chars[1]) {
    chars[1].controllable = false;
    chars[1].vel.set(0, 0);
  }
}

function startMathChallenge(sideIndex) {
  qaActive = true;
  qaAnswered = false;
  // 重置計數與狀態
  correctCount = 0;
  levelComplete = false;
  qaQuestion = generateQuestion();
  qaTargetIndex = sideIndex;
  // 禁止此側在未離開前再次觸發
  if (sideIndex === 0 || sideIndex === 2) triggerEnabled[sideIndex] = false;
  // 設定短暫免觸發，避免馬上被重新觸發
  qaIgnoreUntil = millis() + 1200;
  // 顯示輸入元件
  qaInput.value('');
  qaInput.attribute('placeholder', '請輸入 A, B 或 C');
  qaInput.show();
  qaSubmitBtn.show();
  qaCancelBtn.html('退出'); // 確保按鈕文字正確
  qaCancelBtn.show();
  qaNewBtn.hide();
  qaMessage = '';
  // 暫停玩家移動
  if (chars[1]) {
    chars[1].controllable = false;
    chars[1].vel.set(0, 0);
  }
}

function handleSubmit() {
  if (!qaActive || !qaQuestion) return;
  const v = qaInput.value().trim();
  // 忽略大小寫比對答案
  if (v.toUpperCase() === qaQuestion.answer.toUpperCase()) {
    correctCount++; // 增加答對題數
    
    // 玩家攻擊特效
    if (chars[1]) chars[1].triggerAttack();
    // 敵人受傷
    if (qaTargetIndex !== null && chars[qaTargetIndex]) chars[qaTargetIndex].takeDamage(10);

    if (correctCount >= 3) {
      // 達成通關條件
      levelComplete = true;
      qaAnswered = true;
      qaSubmitBtn.hide();
      qaNewBtn.hide();
      qaInput.hide(); // 隱藏輸入框
      // 將退出按鈕改為下一關或領取證書
      if (qaCancelBtn) {
        if (currentLevel < 3) {
          qaCancelBtn.html('下一關');
        } else {
          qaCancelBtn.html('完成通關');
        }
      }
      
      // 觸發大量彩帶特效
      feedbackType = 'correct';
      feedbackAnimStart = millis();
      confetti = [];
      for (let i = 0; i < 200; i++) {
        confetti.push({
          x: width / 2,
          y: height / 2,
          vx: random(-8, 8),
          vy: random(-12, -4),
          c: color(random(255), random(255), random(255)),
          size: random(8, 15)
        });
      }
    } else {
      // 尚未通關，顯示答對並允許下一題
      qaAnswered = true;
      qaMessage = `答對了！(目前累積: ${correctCount}/3)`;
      qaSubmitBtn.hide();
      qaNewBtn.show();
      // 回復玩家控制
      if (chars[1]) chars[1].controllable = true;

      // 觸發答對特效 (彩帶)
      feedbackType = 'correct';
      feedbackAnimStart = millis();
      confetti = [];
      for (let i = 0; i < 100; i++) {
        confetti.push({
        x: width / 2,
        y: height / 2,
        vx: random(-5, 5),
        vy: random(-10, -2),
        c: color(random(255), random(255), random(255)),
        size: random(6, 12)
      });
      }
    }
  } else {
    // 答錯懲罰
    if (chars[1]) chars[1].takeDamage(1); // 玩家扣血
    // 敵人攻擊特效
    if (qaTargetIndex !== null && chars[qaTargetIndex]) chars[qaTargetIndex].triggerAttack();

    // 檢查是否死亡
    if (chars[1] && chars[1].hp <= 0) {
      gameState = 'GAMEOVER';
      handleCancel(); // 關閉問答介面
      if (startBtn) {
        startBtn.html('回到主選單');
        startBtn.show();
      }
      return;
    }

    qaMessage = `答錯了！受到傷害！(剩餘 HP: ${chars[1].hp})`;
    // 觸發答錯特效 (震動 + 紅閃)
    feedbackType = 'wrong';
    feedbackAnimStart = millis();
  }
}

function startGame() {
  if (gameState === 'GAMEOVER' || gameState === 'VICTORY') {
    gameState = 'START';
    if (startBtn) {
      startBtn.html('開始遊戲');
      startBtn.show(); // 確保按鈕顯示
    }
    return;
  }

  gameState = 'PLAYING';
  // 重置玩家血量
  currentLevel = 1;
  availableQuestions = [...tkuQuestions]; // 初始化題目池
  resetCharacters();
  
  if (startBtn) startBtn.hide();
}

function handleNewQuestion() {
  // 產生新題目並重新啟動問答狀態（再次鎖定玩家）
  qaQuestion = generateQuestion();
  qaAnswered = false;
  qaMessage = '';
  qaInput.value('');
  qaInput.show();
  qaSubmitBtn.show();
  qaNewBtn.hide();
  if (chars[1]) chars[1].controllable = false;
}

function handleCancel() {
  // 紀錄是否為通關狀態
  const wasLevelComplete = levelComplete;

  // 關閉問答介面並恢復遊戲控制
  qaActive = false;
  qaAnswered = false;
  qaQuestion = null;
  qaMessage = '';
  qaTargetIndex = null;
  levelComplete = false;
  // 設定較長的免觸發時間，避免立即再次觸發
  qaIgnoreUntil = millis() + 1500;
  if (qaInput) qaInput.hide();
  if (qaSubmitBtn) qaSubmitBtn.hide();
  if (qaNewBtn) qaNewBtn.hide();
  if (qaCancelBtn) qaCancelBtn.hide();
  // 回復玩家控制
  if (chars[1]) chars[1].controllable = true;

  // 如果是通關後點擊，則進入下一關
  if (wasLevelComplete) {
    if (currentLevel < 3) {
      startNextLevelTransition();
    } else {
      gameState = 'VICTORY';
      if (startBtn) {
        startBtn.html('回到主選單');
        startBtn.show();
      }
    }
  } else {
    // 一般退出，確保文字為預設
    if (qaCancelBtn) qaCancelBtn.html('退出');
  }
}

// 根據題目框位置把 DOM 元件靠近題目框下方排列
function updateQAPositions() {
  const boxW = min(640, width - 80);
  const boxH = 220;
  const bx = width / 2 - boxW / 2;
  const by = height / 2 - boxH / 2 - 60;
  if (qaInput) qaInput.position(bx + 18, by + boxH + 12);
  if (qaSubmitBtn) qaSubmitBtn.position(bx + boxW - 120, by + boxH + 12);
  // 將退出按鈕置中並放大以顯眼
  if (qaCancelBtn) qaCancelBtn.position(bx + boxW / 2 - 70, by + boxH + 12 + 36);
  if (qaNewBtn) qaNewBtn.position(bx + boxW - 110, by + boxH + 12 + 36);
}

// 繪製對話泡泡的輔助函式
function drawSpeechBubble(x, y, txt, maxWidth) {
  push();
  textFont('Arial');
  textSize(14);
  textAlign(CENTER, TOP);
  // 計算文字與泡泡大小
  const padding = 12;
  const lines = wrapTextToLines(txt, maxWidth - padding * 2);
  let bw = 0;
  for (let l of lines) {
    bw = max(bw, textWidth(l));
  }
  bw += padding * 2;
  const bh = lines.length * (textAscent() + textDescent()) + padding * 2;

  // 位置偏移讓泡泡在角色頭上方
  const bx = x - bw / 2;
  const by = y - bh - 8;

  // 泡泡矩形
  noStroke();
  fill(255, 245);
  rect(bx, by, bw, bh, 8);

  // 三角尾巴
  fill(255, 245);
  triangle(x - 8, by + bh, x + 8, by + bh, x, by + bh + 10);

  // 文字
  fill(10);
  let ty = by + padding;
  for (let l of lines) {
    text(l, x, ty);
    ty += (textAscent() + textDescent());
  }
  pop();
}

// 簡單把長字串根據寬度斷行（回傳陣列）
function wrapTextToLines(txt, maxW) {
  const words = txt.split(' ');
  const lines = [];
  let cur = '';
  for (let w of words) {
    const test = cur ? cur + ' ' + w : w;
    if (textWidth(test) > maxW && cur) {
      lines.push(cur);
      cur = w;
    } else {
      cur = test;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

function startNextLevelTransition() {
  currentLevel++;
  gameState = 'LEVEL_TRANSITION';
  levelTransitionStart = millis();
  
  // 重置遊戲邏輯狀態
  correctCount = 0;
  levelComplete = false;
  qaActive = false;
  qaAnswered = false;
  qaQuestion = null;
  qaMessage = '';
  qaTargetIndex = null;
  
  // 隱藏 UI
  if (qaInput) qaInput.hide();
  if (qaSubmitBtn) qaSubmitBtn.hide();
  if (qaNewBtn) qaNewBtn.hide();
  if (qaCancelBtn) qaCancelBtn.hide();
}

function resetCharacters() {
  const centerY = height / 2;
  const spacing = width / 4;
  const centerX = width / 2;

  if (chars[1]) {
    chars[1].hp = chars[1].maxHp;
    chars[1].pos.set(centerX, centerY);
    chars[1].vel.set(0, 0);
  }
  if (chars[0]) {
    chars[0].hp = chars[0].maxHp;
    chars[0].pos.set(centerX - spacing, centerY);
  }
  if (chars[2]) {
    chars[2].hp = chars[2].maxHp;
    chars[2].pos.set(centerX + spacing, centerY);
  }
}
