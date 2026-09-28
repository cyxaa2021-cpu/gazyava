// ===== cases.js — вкладка «Кейсы»: кейсы, инвентарь, апгрейдер =====

// Всё только на пузыри из кликера — настоящих денег тут нет.

// Редкости как в CS. chance — шанс выпадения в %, mult — цена предмета = цена кейса × mult.
// В среднем кейс возвращает ~90% своей цены (как и в жизни, кейсы — в минус)
const RARITIES = [
  { name: "Ширпотреб",     color: "#b0c3d9", chance: 55,  mult: 0.25 },
  { name: "Армейское",     color: "#4b69ff", chance: 25,  mult: 0.6 },
  { name: "Запрещённое",   color: "#8847ff", chance: 12,  mult: 1.5 },
  { name: "Засекреченное", color: "#d32ce6", chance: 6,   mult: 3.5 },
  { name: "Тайное",        color: "#eb4b4b", chance: 1.8, mult: 8 },
  { name: "★ Золотая",     color: "#ffd700", chance: 0.2, mult: 40 },
];
const GOLD_R = RARITIES.length - 1;   // номер самой редкой редкости

// sodas — номера газяв из массива SODAS, которые могут выпасть из кейса
// (номера: 0 Байкал … 5 Лимонад, 6–8 Добрый, 9–15 импорт, 16–19 минералки)
const CASES = [
  { id: "mineral", ico: "💧", name: "Минеральный", price: 100,   color: "#90caf9", sodas: [16, 17, 18, 19] },
  { id: "basic",   ico: "📦", name: "Обычный",     price: 300,   color: "#b0c3d9", sodas: [5, 6, 7, 8, 16, 19] },
  { id: "dobry",   ico: "🟢", name: "Добрый",      price: 800,   color: "#43a047", sodas: [6, 7, 8] },
  { id: "daily",   ico: "🔥", name: "Газява дня",  price: 1500,  color: "#ff8c00", sodas: [dailyIndex()] },   // одна газява, меняется каждый день
  { id: "ussr",    ico: "🎖️", name: "Советский",   price: 2000,  color: "#eb4b4b", sodas: [0, 1, 2, 3, 4, 17, 18] },
  { id: "citrus",  ico: "🍋", name: "Цитрусовый",  price: 4000,  color: "#f4d03f", sodas: [7, 8, 11, 12, 13, 15] },
  { id: "cola",    ico: "🥊", name: "Кола-войны",  price: 7000,  color: "#8b0000", sodas: [6, 9, 10] },
  { id: "import",  ico: "🌍", name: "Импортный",   price: 10000, color: "#4b69ff", sodas: [9, 10, 11, 12, 13, 14, 15] },
  { id: "legend",  ico: "👑", name: "Легендарный", price: 50000, color: "#ffd700", sodas: SODAS.map((s, i) => i) },   // все 20 газяв
];

const CELL = 104;        // ширина ячейки ленты (100) + отступ (4), px
const STRIP_LEN = 50;    // сколько предметов в ленте
const WIN_POS = 45;      // на каком месте ленты лежит выигрыш
const SPIN_TIME = 6000;  // сколько крутится лента, мс

let spinning = false;    // крутится ли сейчас лента
let spinItem = null;     // что выпало
let spinCase = null;     // какой кейс открывали (для кнопки «Ещё»)
let lastTickCell = -1;   // какая ячейка была под чертой (для щелчков)

// случайная редкость с учётом шансов: «отнимаем» шансы, пока число не уйдёт ниже нуля
function rollRarity() {
  let x = Math.random() * 100;
  for (let i = 0; i < RARITIES.length; i++) {
    x -= RARITIES[i].chance;
    if (x < 0) return i;
  }
  return 0;
}

// новый предмет из кейса: случайная газява из кейса + случайная редкость
function makeItem(c) {
  const r = rollRarity();
  const s = c.sodas[Math.floor(Math.random() * c.sodas.length)];
  return { s: s, r: r, v: Math.max(1, Math.round(c.price * RARITIES[r].mult)) };
}

// начинка карточки предмета: бутылка, название, редкость, цена
function itemHTML(it, bottleH) {
  const rar = RARITIES[it.r];
  return bottleSVG(SODAS[it.s], bottleH) + `
    <div class="inm">${SODAS[it.s].name}</div>
    <div class="rar" style="color:${rar.color}">${rar.name}</div>
    <div class="val">${fmt(it.v)} 🫧</div>`;
}

function renderCases() {
  const box = document.getElementById("caseList");
  for (const c of CASES) {
    const btn = document.createElement("button");
    btn.className = "case";
    btn.id = "case-" + c.id;
    btn.style.borderColor = c.color;
    btn.innerHTML = `<span class="ico">${c.ico}</span><div class="cnm">${c.name}</div>
      <div class="price">${fmt(c.price)} 🫧</div>`;
    btn.onclick = () => openCase(c);
    box.appendChild(btn);
  }
  // шансы честно показываем игроку
  document.getElementById("chances").innerHTML = RARITIES.map(r =>
    `<span style="color:${r.color}">${r.name} ${r.chance}%</span>`).join(" · ");
}

// баланс и доступность кейсов (вызывается из updateClicker)
function updateCasesBalance() {
  document.getElementById("casesBalance").textContent = fmt(game.bubbles) + " 🫧";
  for (const c of CASES) {
    document.getElementById("case-" + c.id).disabled = spinning || upBusy || game.bubbles < c.price;
  }
}

function openCase(c) {
  if (spinning || upBusy || game.bubbles < c.price) return;
  ensureAudio();
  spinning = true;
  spinCase = c;
  game.bubbles -= c.price;
  game.casesOpened++;
  // результат решаем сразу и сразу сохраняем: если закрыть приложение во время прокрутки,
  // предмет не пропадёт. Лента — только красивая анимация
  spinItem = makeItem(c);
  game.inv.unshift(spinItem);
  saveData("gazyava_clicker", game);
  updateClicker();

  // лента: случайные предметы, а на месте WIN_POS — наш выигрыш
  const strip = document.getElementById("strip");
  strip.innerHTML = "";
  for (let i = 0; i < STRIP_LEN; i++) {
    const it = i === WIN_POS ? spinItem : makeItem(c);
    const cell = document.createElement("div");
    cell.className = "item cell";
    cell.style.borderBottomColor = RARITIES[it.r].color;
    cell.innerHTML = itemHTML(it, 56);
    strip.appendChild(cell);
  }
  document.getElementById("spinTitle").textContent = `${c.ico} Кейс «${c.name}»`;
  document.getElementById("spinResult").style.display = "none";
  document.getElementById("spin").style.display = "flex";

  // сдвигаем ленту так, чтобы под жёлтой чертой оказалась ячейка WIN_POS
  // (+ случайный сдвиг внутри ячейки, чтобы черта не всегда была ровно по центру)
  const windowW = document.getElementById("spinWindow").clientWidth;
  const shift = WIN_POS * CELL + 50 - windowW / 2 + (Math.random() - 0.5) * 80;
  strip.style.transition = "none";
  strip.style.transform = "translateX(0px)";
  strip.offsetWidth;   // заставляем браузер применить начальное положение, иначе анимации не будет
  strip.style.transition = `transform ${SPIN_TIME}ms cubic-bezier(0.1, 0.7, 0.1, 1)`;
  strip.style.transform = `translateX(${-shift}px)`;

  lastTickCell = -1;
  requestAnimationFrame(spinTick);
  setTimeout(showSpinResult, SPIN_TIME + 200);
}

// «щёлк» каждый раз, когда под чертой проезжает новая ячейка
function spinTick() {
  if (!spinning) return;
  const strip = document.getElementById("strip");
  const x = new DOMMatrix(getComputedStyle(strip).transform).m41;   // текущий сдвиг ленты, px
  const cellNow = Math.floor((-x + document.getElementById("spinWindow").clientWidth / 2) / CELL);
  if (cellNow !== lastTickCell) {
    lastTickCell = cellNow;
    if (soundOn && audio) playTick();
  }
  requestAnimationFrame(spinTick);
}

function playTick() {
  const t = audio.currentTime;
  const osc = audio.createOscillator();
  const gain = audio.createGain();
  osc.type = "square";
  osc.frequency.value = 1800;
  gain.gain.setValueAtTime(0.05, t);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.03);
  osc.connect(gain);
  gain.connect(audio.destination);
  osc.start(t);
  osc.stop(t + 0.04);
}

function showSpinResult() {
  spinning = false;
  const it = spinItem;
  if (it.r === GOLD_R) game.gotGold = true;   // здесь, а не раньше — чтобы достижение не выдало приз до конца ленты
  const box = document.getElementById("spinItem");
  box.innerHTML = itemHTML(it, 120);
  box.style.borderBottomColor = RARITIES[it.r].color;
  box.style.boxShadow = `0 0 25px ${RARITIES[it.r].color}`;
  document.getElementById("spinSell").textContent = `💰 ${fmt(it.v)}`;
  document.getElementById("spinResult").style.display = "flex";
  if (soundOn) {
    if (it.r >= 3) playSonarPing();   // редкий предмет — торжественный «пинг»
    playBubbles();
  }
  renderInventory();
  updateClicker();
}

function closeSpin() {
  document.getElementById("spin").style.display = "none";
}

document.getElementById("spinTake").onclick = closeSpin;
document.getElementById("spinSell").onclick = () => { sellItem(spinItem); closeSpin(); };
document.getElementById("spinAgain").onclick = () => {
  if (game.bubbles < spinCase.price) { toast("Не хватает пузырей 🫧 — покликай ещё"); return; }
  openCase(spinCase);
};

// ===== Инвентарь =====
let upPick = null;   // предмет, выбранный для апгрейда

function renderInventory() {
  const box = document.getElementById("inv");
  box.innerHTML = "";
  if (!game.inv.includes(upPick)) upPick = null;   // предмет продали — снимаем выбор
  let sum = 0;
  for (const it of game.inv) {
    sum += it.v;
    const el = document.createElement("div");
    el.className = it === upPick ? "item picked" : "item";
    el.style.borderBottomColor = RARITIES[it.r].color;
    el.innerHTML = itemHTML(it, 60) +
      `<div class="ibtns"><button class="mini sell">💰</button><button class="mini up">⬆️</button></div>`;
    el.querySelector(".sell").onclick = () => sellItem(it);
    el.querySelector(".up").onclick = () => pickForUpgrade(it);
    box.appendChild(el);
  }
  if (!game.inv.length) box.innerHTML = '<div class="empty">Пусто. Открой кейс!</div>';
  document.getElementById("invTitle").textContent = `🎒 Инвентарь: ${game.inv.length} шт. на ${fmt(sum)} 🫧`;
  document.getElementById("sellAll").style.display = game.inv.length ? "" : "none";
  renderUpgrader();
}

// продажа: пузыри возвращаются на баланс. В total (звание) не идут — это не «заработок»
function sellItem(it) {
  if (upBusy) return;
  game.inv = game.inv.filter(x => x !== it);
  game.bubbles += it.v;
  saveData("gazyava_clicker", game);
  if (soundOn) { ensureAudio(); playBubbles(); }
  renderInventory();
  updateClicker();
}

document.getElementById("sellAll").onclick = () => {
  if (upBusy || !game.inv.length) return;
  let sum = 0;
  for (const it of game.inv) sum += it.v;
  if (!confirm(`Продать все предметы (${game.inv.length} шт.) за ${fmt(sum)} 🫧?`)) return;
  game.inv = [];
  game.bubbles += sum;
  saveData("gazyava_clicker", game);
  renderInventory();
  updateClicker();
};

// ===== Апгрейдер =====
// Ставим предмет и выбираем множитель. Шанс = 95% / множитель.
// Стрелка останавливается на случайном месте круга: попала в зелёное — предмет дорожает,
// нет — сгорает. 5% — «комиссия», иначе апгрейд был бы бесплатной лотереей
const UP_MULTS = [1.5, 2, 3, 5, 10, 20, 50, 100];   // во сколько раз дороже станет предмет
// на сколько ступеней вырастет редкость при каждом множителе
const UP_STEPS = { 1.5: 0, 2: 1, 3: 1, 5: 2, 10: 3, 20: 3, 50: 4, 100: 5 };
const UP_TIME = 4000;                      // сколько крутится стрелка (как в CSS #arrow), мс

let upMult = 2;
let upBusy = false;   // крутится ли стрелка
let upRot = 0;        // текущий угол стрелки, градусов

function upChance() {
  return 0.95 / upMult;
}

// что получим при удаче: та же газява, редкость выше, цена × множитель
function upgradedItem(it) {
  return { s: it.s, r: Math.min(it.r + UP_STEPS[upMult], GOLD_R), v: Math.round(it.v * upMult) };
}

function pickForUpgrade(it) {
  if (upBusy) return;
  upPick = it;
  renderInventory();
  document.getElementById("upgrader").scrollIntoView({ behavior: "smooth" });
}

function renderUpgrader() {
  // кнопки ×2 ×5 ×10
  const mb = document.getElementById("upMults");
  mb.innerHTML = "";
  for (const m of UP_MULTS) {
    const b = document.createElement("button");
    b.textContent = "×" + m;
    b.className = m === upMult ? "on" : "";
    b.onclick = () => { if (!upBusy) { upMult = m; renderUpgrader(); } };
    mb.appendChild(b);
  }
  // зелёный сектор круга = шанс победы (conic-gradient рисует круговую диаграмму)
  const deg = upChance() * 360;
  document.getElementById("wheel").style.background =
    `conic-gradient(#39ff14 0deg ${deg}deg, #222 ${deg}deg 360deg)`;
  const percent = upChance() * 100;
  // маленькие шансы (×100 — меньше 1%) показываем с двумя знаками после запятой
  document.getElementById("upChance").textContent = percent.toFixed(percent < 10 ? 2 : 1) + "%";

  const from = document.getElementById("upFrom");
  const to = document.getElementById("upTo");
  if (upPick) {
    from.innerHTML = itemHTML(upPick, 60);
    to.innerHTML = itemHTML(upgradedItem(upPick), 60);
  } else {
    from.innerHTML = "Нажми ⬆️ у предмета в инвентаре";
    to.innerHTML = "❓";
  }
  document.getElementById("upGo").disabled = !upPick || upBusy;
}

function doUpgrade() {
  if (!upPick || upBusy) return;
  ensureAudio();
  upBusy = true;
  document.getElementById("upGo").disabled = true;
  const it = upPick;
  const target = upgradedItem(it);
  const roll = Math.random();          // где остановится стрелка: доля круга от 0 до 1
  const win = roll < upChance();       // попала в зелёный сектор — победа

  // результат сразу записываем в сохранение (как с кейсами)
  game.inv = game.inv.filter(x => x !== it);
  if (win) game.inv.unshift(target);
  saveData("gazyava_clicker", game);
  updateClicker();

  // стрелка делает 5 полных оборотов и останавливается на roll
  upRot = upRot - (upRot % 360) + 360 * 5 + roll * 360;
  document.getElementById("arrow").style.transform = `rotate(${upRot}deg)`;

  setTimeout(() => {
    upBusy = false;
    upPick = null;
    if (win) {
      game.upgradesWon++;
      if (target.r === GOLD_R) game.gotGold = true;
      if (upMult >= 20) game.bigWin = true;
      toast(`🎉 Апгрейд удался! ${SODAS[target.s].name} — ${fmt(target.v)} 🫧`);
      if (soundOn) { playSonarPing(); playBubbles(); }
    } else {
      toast("💥 Мимо... предмет сгорел");
    }
    saveData("gazyava_clicker", game);
    renderInventory();
    updateClicker();
  }, UP_TIME + 200);
}

document.getElementById("upGo").onclick = doUpgrade;
