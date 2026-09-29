// ===== cases.js — вкладка «Кейсы»: кейсы, мутации, инвентарь, апгрейдер, скример =====
// Всё только на пузыри из кликера — настоящих денег тут нет.

// Редкости. chance — шанс выпадения в %, mult — цена предмета = цена кейса × mult.
// Баланс v3: в среднем кейс возвращает ~74% цены, с мутациями ~83% (раньше было 90%) — см. ПЛАН_v3.txt
const RARITIES = [
  { name: "Ширпотреб",       color: "#b0c3d9", chance: 60,   mult: 0.2 },
  { name: "Армейское",       color: "#4b69ff", chance: 24,   mult: 0.5 },
  { name: "Запрещённое",     color: "#8847ff", chance: 10,   mult: 1.3 },
  { name: "Засекреченное",   color: "#d32ce6", chance: 4.3,  mult: 3 },
  { name: "Тайное",          color: "#eb4b4b", chance: 1.3,  mult: 8 },
  { name: "👑 Легендарное",  color: "#ffd700", chance: 0.35, mult: 25 },
  { name: "✦ Мифическое",    color: "#00e5ff", chance: 0.05, mult: 100 },
];
const LEGEND_R = 5;                    // номер «Легендарного»
const TOP_R = RARITIES.length - 1;     // номер самой редкой редкости (Мифическое)

// Мутации: с небольшим шансом бутылка выпадает «особой» — дороже в mult раз и с эффектом на картинке.
// Номер 0 — обычная бутылка без мутации
const MUTATIONS = [
  { name: "",             mult: 1,   chance: 0 },
  { name: "🧊 Ледяная",   mult: 1.5, chance: 5 },
  { name: "✨ Золотая",   mult: 3,   chance: 2 },
  { name: "🌈 Радужная",  mult: 5,   chance: 0.8 },
  { name: "☢️ Мутант",    mult: 10,  chance: 0.2 },
];

const FREE_MAX_PRICE = 10000;   // бесплатно раз в день можно открыть кейс не дороже этого
const ROYALTY = 0.15;           // сколько от цены именного кейса получает его владелец
const SCREAM_CHANCE = 0.004;    // шанс скримера за одну прокрутку (0.4%)

// sodas — номера напитков, которые могут выпасть (редкость случайная).
// items — для именных кейсов: у каждого напитка своя редкость {s: номер, r: редкость}
const CASES = [
  { id: "mineral", ico: "💧", name: "Минеральный", price: 100,   color: "#90caf9", sodas: [16, 17, 18, 19] },
  { id: "basic",   ico: "📦", name: "Обычный",     price: 300,   color: "#b0c3d9", sodas: [5, 6, 7, 8, 16, 19] },
  { id: "dobry",   ico: "🟢", name: "Добрый",      price: 800,   color: "#43a047", sodas: [6, 7, 8] },
  { id: "daily",   ico: "🔥", name: "Газява дня",  price: 1500,  color: "#ff8c00", sodas: [dailyIndex()] },   // меняется каждый день
  { id: "ussr",    ico: "🎖️", name: "Советский",   price: 2000,  color: "#eb4b4b", sodas: [0, 1, 2, 3, 4, 17, 18] },
  { id: "energy",  ico: "⚡", name: "Энергетики",  price: 2500,  color: "#76ff03", sodas: ENERGY.map((e, i) => ENERGY_START + i) },
  { id: "citrus",  ico: "🍋", name: "Цитрусовый",  price: 4000,  color: "#f4d03f", sodas: [7, 8, 11, 12, 13, 15] },
  { id: "cola",    ico: "🥊", name: "Кола-войны",  price: 7000,  color: "#8b0000", sodas: [6, 9, 10] },
  { id: "import",  ico: "🌍", name: "Импортный",   price: 10000, color: "#4b69ff", sodas: [9, 10, 11, 12, 13, 14, 15] },
  { id: "legend",  ico: "👑", name: "Легендарный", price: 50000, color: "#ffd700", sodas: SODAS.slice(0, BASE_COUNT).map((s, i) => i) },
  // именные кейсы: владелец (owner — ID в игре) получает 15% от цены при каждом открытии другими игроками
  { id: "ilya", ico: "😌", name: "Маленькие радости", by: "Илья К.", owner: "FC9EX5", price: 66666, color: "#ff80ab",
    items: [0, 1, 3, 1, 1, 2, 0, 2, 4, 0, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 6].map((r, i) => ({ s: ILYA_START + i, r: r })) },
  { id: "yura", ico: "🔋", name: "Заряд от Юры", by: "Юра Щ.", owner: "4H2K44", price: 66666, color: "#1565c0",
    items: [{ s: 9, r: 0 }, { s: 9, r: 1 }, { s: YURA_START, r: 2 }, { s: YURA_START, r: 3 }, { s: YURA_START, r: 4 },
            { s: ENERGY_START + 9, r: 5 }] },   // Coca-Cola, Lipton зелёный, 👑 Red Bull
];

const STRIP_LEN = 50;    // сколько предметов в ленте
const WIN_POS = 45;      // на каком месте ленты лежит выигрыш

let spinning = false;    // крутится ли сейчас лента
let spinItems = [];      // что выпало (при открытии нескольких — несколько предметов)
let spinCase = null;     // какой кейс открывали (для кнопки «Ещё»)
let spinCell = 104;      // ширина ячейки ленты + отступ, px
let lastTickCell = -1;   // какая ячейка была под чертой (для щелчков)
let openCount = 1;       // сколько кейсов открывать за раз
let autoOpen = false;    // автооткрытие включено
let autoTimer = null;

// случайная редкость с учётом шансов: «отнимаем» шансы, пока число не уйдёт ниже нуля
function rollRarity() {
  let x = Math.random() * 100;
  for (let i = 0; i < RARITIES.length; i++) {
    x -= RARITIES[i].chance;
    if (x < 0) return i;
  }
  return 0;
}

// во сколько раз мутации выпадают чаще: буст «Удача» ×2, очки из мерча +20%
function mutationLuck() {
  return (boostOn("luck") ? 2 : 1) * (1 + merchBonus("mut"));
}
function rollMutation() {
  let x = Math.random() * 100 / mutationLuck();
  for (let i = 1; i < MUTATIONS.length; i++) {
    x -= MUTATIONS[i].chance;
    if (x < 0) return i;
  }
  return 0;
}

// новый предмет из кейса
function makeItem(c) {
  let r = rollRarity();
  let s;
  if (c.items) {
    // именной кейс: берём напиток выпавшей редкости; если такого нет — ближайшей редкости ниже
    let list = [];
    while (r > 0 && !(list = c.items.filter(it => it.r === r)).length) r--;
    if (!list.length) list = c.items.filter(it => it.r === r);
    s = list[Math.floor(Math.random() * list.length)].s;
  } else {
    s = c.sodas[Math.floor(Math.random() * c.sodas.length)];
  }
  const m = rollMutation();
  return { s: s, r: r, m: m, v: Math.max(1, Math.round(c.price * RARITIES[r].mult * MUTATIONS[m].mult)) };
}

// начинка карточки предмета: бутылка (с эффектом мутации), название, редкость, цена.
// compact — только бутылка и цена (для маленьких лент)
function itemHTML(it, bottleH, compact) {
  const rar = RARITIES[it.r];
  const m = it.m || 0;
  const bottle = `<div class="bot mut${m}">${bottleSVG(SODAS[it.s], bottleH)}</div>`;
  if (compact) return bottle + `<div class="val">${fmt(it.v)}</div>`;
  return bottle + `
    <div class="inm">${SODAS[it.s].name}</div>
    <div class="rar" style="color:${rar.color}">${rar.name}</div>
    ${m ? `<div class="mut">${MUTATIONS[m].name}</div>` : ""}
    <div class="val">${fmt(it.v)} 🫧</div>`;
}

// бесплатный кейс: раз в день, не дороже FREE_MAX_PRICE, именные — никогда
function isFree(c) {
  return game.freeDay !== todayKey() && c.price <= FREE_MAX_PRICE && !c.owner;
}

// цена продажи: буст «Продажа +10%» и мерч увеличивают её
function sellMult() {
  return (boostOn("sale") ? 1.1 : 1) * (1 + merchBonus("sell"));
}
function sellPrice(it) {
  return Math.round(it.v * sellMult());
}

// ===== Список кейсов =====
function renderCases() {
  const box = document.getElementById("caseList");
  for (const c of CASES) {
    const btn = document.createElement("button");
    btn.className = c.owner ? "case named" : "case";
    btn.id = "case-" + c.id;
    btn.style.borderColor = c.color;
    btn.innerHTML = `<span class="info-i">ℹ️</span><span class="ico">${c.ico}</span><div class="cnm">${c.name}</div>
      ${c.by ? `<div class="by">от ${c.by}</div>` : ""}<div class="price"></div>`;
    btn.onclick = () => openCase(c);
    // ℹ️ — показать, что внутри (и не открывать кейс)
    btn.querySelector(".info-i").onclick = (e) => { e.stopPropagation(); showCaseInfo(c); };
    box.appendChild(btn);
  }
  // сколько открывать за раз
  const cb = document.getElementById("openCount");
  for (const n of [1, 3, 5, 10]) {
    const b = document.createElement("button");
    b.textContent = "×" + n;
    b.onclick = () => { openCount = n; updateCasesBalance(); };
    cb.appendChild(b);
  }
  // шансы честно показываем игроку
  document.getElementById("chances").innerHTML =
    RARITIES.map(r => `<span style="color:${r.color}">${r.name} ${r.chance}%</span>`).join(" · ") +
    "<br>Мутации: " + MUTATIONS.slice(1).map(m => `${m.name} ${m.chance}% (×${m.mult})`).join(" · ");
}

// баланс, цены и доступность кейсов (вызывается из updateClicker)
function updateCasesBalance() {
  document.getElementById("casesBalance").textContent = fmt(game.bubbles) + " 🫧";
  for (const c of CASES) {
    const btn = document.getElementById("case-" + c.id);
    const free = isFree(c) && openCount === 1;
    btn.querySelector(".price").textContent = free ? "🎁 БЕСПЛАТНО" : fmt(c.price * openCount) + " 🫧";
    btn.classList.toggle("free", free);
    btn.disabled = spinning || upBusy || (!free && game.bubbles < c.price * openCount);
  }
  document.querySelectorAll("#openCount button").forEach(b => b.classList.toggle("on", b.textContent === "×" + openCount));
  document.getElementById("autoBtn").textContent = autoOpen ? "🔁 Автооткрытие: ВКЛ" : "🔁 Автооткрытие: выкл";
  document.getElementById("autoBtn").classList.toggle("on", autoOpen);
}

document.getElementById("autoBtn").onclick = () => { autoOpen = !autoOpen; updateCasesBalance(); };

function showCaseInfo(c) {
  // список: либо напитки с их редкостями, либо просто напитки (редкость — любая)
  const list = c.items
    ? c.items.map(it => `<div class="ci"><span style="color:${RARITIES[it.r].color}">■</span> ${SODAS[it.s].name}
        <small>${RARITIES[it.r].name}</small><br><small class="dim">${esc(SODAS[it.s].desc)}</small></div>`)
    : c.sodas.map(s => `<div class="ci">🥤 ${SODAS[s].name}</div>`);
  document.getElementById("caseInfoTitle").textContent = `${c.ico} ${c.name}`;
  document.getElementById("caseInfoText").innerHTML =
    `<div class="info">Цена ${fmt(c.price)} 🫧` + (c.owner ? ` · ${c.by} (ID ${c.owner}) получает ${ROYALTY * 100}% с каждого открытия` : "") +
    `</div>` + list.join("");
  document.getElementById("caseInfo").classList.add("show");
}
document.getElementById("caseInfoClose").onclick = () => document.getElementById("caseInfo").classList.remove("show");

// ===== Открытие кейса =====
function openCase(c) {
  if (spinning || upBusy) return;
  const free = isFree(c) && openCount === 1;
  const count = free ? 1 : openCount;
  const cost = free ? 0 : c.price * count;
  if (game.bubbles < cost) { toast("Не хватает пузырей 🫧"); stopAuto(); return; }
  ensureAudio();
  clearTimeout(autoTimer);
  spinning = true;
  spinCase = c;
  game.bubbles -= cost;
  if (free) game.freeDay = todayKey();
  game.casesOpened += count;
  // результат решаем сразу и сразу сохраняем: если закрыть приложение во время прокрутки,
  // предметы не пропадут. Лента — только красивая анимация
  spinItems = [];
  for (let i = 0; i < count; i++) {
    const it = makeItem(c);
    spinItems.push(it);
    game.inv.unshift(it);
  }
  saveData("gazyava_clicker", game);
  updateClicker();

  // онлайн (online.js): 15% владельцу именного кейса и лента дропа для редких предметов
  if (c.owner && !free) sendRoyalty(c, count);
  for (const it of spinItems) if (it.r >= 3 || it.m) sendDrop(it, c);

  const time = autoOpen ? 2500 : count > 1 ? 4500 : 6000;   // сколько крутится лента, мс
  buildStrips(c, time);
  requestAnimationFrame(spinTick);
  setTimeout(showSpinResult, time + 200);
  // скример: с маленьким шансом в случайный момент прокрутки (если не выключен в настройках)
  if (settings.scream && Math.random() < SCREAM_CHANCE) setTimeout(showScream, 500 + Math.random() * (time - 1000));
}

// ленты: по одной на каждый предмет. Чем больше лент, тем они меньше
function buildStrips(c, time) {
  const box = document.getElementById("spinStrips");
  const n = spinItems.length;
  const compact = n > 3;
  const cellW = compact ? 56 : n > 1 ? 76 : 100;   // ширина ячейки, px
  const bottleH = compact ? 36 : n > 1 ? 44 : 56;
  spinCell = cellW + 4;
  box.innerHTML = "";
  box.className = compact ? "compact" : n > 1 ? "multi" : "";

  for (const win of spinItems) {
    const wnd = document.createElement("div");
    wnd.className = "spinWindow";
    const strip = document.createElement("div");
    strip.className = "strip";
    // лента: случайные предметы, а на месте WIN_POS — наш выигрыш
    for (let i = 0; i < STRIP_LEN; i++) {
      const it = i === WIN_POS ? win : makeItem(c);
      const cell = document.createElement("div");
      cell.className = "item cell";
      cell.style.width = cellW + "px";
      cell.style.borderBottomColor = RARITIES[it.r].color;
      cell.innerHTML = itemHTML(it, bottleH, compact);
      strip.appendChild(cell);
    }
    const marker = document.createElement("div");
    marker.className = "spinMarker";
    wnd.append(strip, marker);
    box.appendChild(wnd);
  }
  document.getElementById("spinTitle").textContent = `${c.ico} ${c.name}` + (n > 1 ? ` ×${n}` : "");
  document.getElementById("spinResult").style.display = "none";
  document.getElementById("spinStrips").style.display = "";
  document.getElementById("spinStop").style.display = autoOpen ? "" : "none";
  document.getElementById("spin").style.display = "flex";

  // сдвигаем каждую ленту так, чтобы под жёлтой чертой оказалась ячейка WIN_POS
  // (+ случайный сдвиг внутри ячейки, чтобы черта не всегда была ровно по центру)
  const windowW = box.clientWidth;
  box.querySelectorAll(".strip").forEach(strip => {
    const shift = WIN_POS * spinCell + cellW / 2 - windowW / 2 + (Math.random() - 0.5) * cellW * 0.8;
    strip.style.transition = "none";
    strip.style.transform = "translateX(0px)";
    strip.offsetWidth;   // заставляем браузер применить начальное положение, иначе анимации не будет
    strip.style.transition = `transform ${time}ms cubic-bezier(0.1, 0.7, 0.1, 1)`;
    strip.style.transform = `translateX(${-shift}px)`;
  });
  lastTickCell = -1;
}

// «щёлк» каждый раз, когда под чертой первой ленты проезжает новая ячейка
function spinTick() {
  if (!spinning) return;
  const strip = document.querySelector("#spinStrips .strip");
  const x = new DOMMatrix(getComputedStyle(strip).transform).m41;   // текущий сдвиг ленты, px
  const cellNow = Math.floor((-x + strip.parentNode.clientWidth / 2) / spinCell);
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

// автопродажа: включена для этой редкости и (если так настроено) это не мутация
function shouldAutoSell(it) {
  if (!settings.autoSell[it.r]) return false;
  return !(it.m && settings.keepMutated);
}

function showSpinResult() {
  spinning = false;
  let sum = 0, autoSum = 0, autoCount = 0, best = 0;
  for (const it of spinItems) {
    sum += it.v;
    best = Math.max(best, it.r);
    if (it.r >= LEGEND_R) game.gotGold = true;   // здесь, а не раньше — чтобы достижение не выдало приз до конца ленты
    if (it.r === TOP_R) addStat("mythic");
    if (it.m === 4) addStat("mutant");
    if (shouldAutoSell(it) && game.inv.includes(it)) {
      game.inv = game.inv.filter(x => x !== it);
      autoSum += sellPrice(it);
      autoCount++;
      it.sold = true;   // пометка только для окна результата
    }
  }
  if (autoCount) { game.bubbles += autoSum; addStat("sold", autoCount); }
  saveData("gazyava_clicker", game);

  // карточки выпавшего
  const box = document.getElementById("spinGot");
  box.className = spinItems.length > 1 ? "many" : "";
  box.innerHTML = "";
  for (const it of spinItems) {
    const el = document.createElement("div");
    el.className = "item";
    el.style.borderBottomColor = RARITIES[it.r].color;
    el.style.boxShadow = `0 0 ${it.r >= 3 ? 25 : 10}px ${RARITIES[it.r].color}`;
    el.innerHTML = itemHTML(it, spinItems.length > 1 ? 50 : 120) + (it.sold ? '<div class="sold">💸 продано</div>' : "");
    box.appendChild(el);
  }
  document.getElementById("spinSum").textContent = `Выпало на ${fmt(sum)} 🫧` +
    (autoCount ? ` · автопродано ${autoCount} шт. за ${fmt(autoSum)}` : "");
  updateSpinSell();
  document.getElementById("spinStrips").style.display = "none";
  document.getElementById("spinResult").style.display = "flex";
  if (soundOn && audio) {
    if (best >= 3) playSonarPing();   // редкий предмет — торжественный «пинг»
    playBubbles();
  }
  renderInventory();
  updateClicker();
  // автооткрытие: через секунду крутим ещё раз
  if (autoOpen) autoTimer = setTimeout(() => {
    if (autoOpen && document.getElementById("spin").style.display === "flex") openCase(spinCase);
  }, 1200);
}

// кнопка «Продать выпавшее»: только то, что ещё лежит в инвентаре
function updateSpinSell() {
  const left = spinItems.filter(it => game.inv.includes(it));
  let sum = 0;
  for (const it of left) sum += sellPrice(it);
  const btn = document.getElementById("spinSell");
  btn.style.display = left.length ? "" : "none";
  btn.textContent = `💰 Продать (${left.length}) за ${fmt(sum)}`;
}

function closeSpin() {
  stopAuto();
  document.getElementById("spin").style.display = "none";
}
function stopAuto() {
  autoOpen = false;
  clearTimeout(autoTimer);
  document.getElementById("spinStop").style.display = "none";
  updateCasesBalance();
}

document.getElementById("spinTake").onclick = closeSpin;
document.getElementById("spinStop").onclick = stopAuto;
document.getElementById("spinSell").onclick = () => {
  const left = spinItems.filter(it => game.inv.includes(it));
  sellItems(left);
  updateSpinSell();
};
document.getElementById("spinAgain").onclick = () => openCase(spinCase);

// ===== Скример =====
function showScream() {
  if (!settings.scream) return;
  const el = document.getElementById("scream");
  el.style.display = "flex";
  if (audio) playScream();
  if (navigator.vibrate) navigator.vibrate(400);
  setTimeout(() => { el.style.display = "none"; }, 1600);
}
document.getElementById("scream").onclick = () => { document.getElementById("scream").style.display = "none"; };

// крик: шум + визжащий тон, который быстро скачет вверх-вниз (синтезируется, без файлов)
function playScream() {
  const t = audio.currentTime;
  const len = 1.4;
  // белый шум — случайные числа в звуковом буфере
  const buffer = audio.createBuffer(1, audio.sampleRate * len, audio.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const noise = audio.createBufferSource();
  noise.buffer = buffer;
  const noiseGain = audio.createGain();
  noiseGain.gain.setValueAtTime(0.6, t);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, t + len);
  noise.connect(noiseGain);
  noiseGain.connect(audio.destination);
  noise.start(t);

  const osc = audio.createOscillator();
  const gain = audio.createGain();
  osc.type = "sawtooth";
  for (let i = 0; i < 14; i++) osc.frequency.setValueAtTime(i % 2 ? 900 : 1500, t + i * 0.1);
  gain.gain.setValueAtTime(0.5, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + len);
  osc.connect(gain);
  gain.connect(audio.destination);
  osc.start(t);
  osc.stop(t + len);
}

// ===== Инвентарь =====
const INV_SHOW = 150;   // больше не рисуем — иначе после автооткрытия телефон начнёт тормозить
let upPicks = [];       // предметы, выбранные для апгрейда

function renderInventory() {
  const box = document.getElementById("inv");
  box.innerHTML = "";
  upPicks = upPicks.filter(it => game.inv.includes(it));   // проданные снимаем с апгрейда
  let sum = 0;
  for (const it of game.inv) sum += it.v;
  for (const it of game.inv.slice(0, INV_SHOW)) {
    const el = document.createElement("div");
    el.className = upPicks.includes(it) ? "item picked" : "item";
    el.style.borderBottomColor = RARITIES[it.r].color;
    el.innerHTML = itemHTML(it, 60) +
      `<div class="ibtns"><button class="mini sell">💰</button><button class="mini up">⬆️</button></div>`;
    el.querySelector(".sell").onclick = () => sellItems([it]);
    el.querySelector(".up").onclick = () => pickForUpgrade(it);
    box.appendChild(el);
  }
  if (game.inv.length > INV_SHOW) {
    box.insertAdjacentHTML("beforeend", `<div class="empty">…и ещё ${game.inv.length - INV_SHOW} шт.</div>`);
  }
  if (!game.inv.length) box.innerHTML = '<div class="empty">Пусто. Открой кейс!</div>';
  document.getElementById("invTitle").textContent = `🎒 Инвентарь: ${game.inv.length} шт. на ${fmt(sum)} 🫧`;
  document.getElementById("sellAll").style.display = game.inv.length ? "" : "none";
  renderUpgrader();
}

// продажа: пузыри возвращаются на баланс. В «всего собрано» (звание) не идут — это не «заработок»
function sellItems(list) {
  if (upBusy || !list.length) return;
  let sum = 0;
  for (const it of list) sum += sellPrice(it);
  game.inv = game.inv.filter(x => !list.includes(x));
  game.bubbles += sum;
  addStat("sold", list.length);
  saveData("gazyava_clicker", game);
  if (soundOn) { ensureAudio(); playBubbles(); }
  if (list.length > 1) toast(`💰 Продано ${list.length} шт. за ${fmt(sum)} 🫧`);
  renderInventory();
  updateClicker();
}

document.getElementById("sellAll").onclick = () => {
  if (upBusy || !game.inv.length) return;
  let sum = 0;
  for (const it of game.inv) sum += sellPrice(it);
  if (!confirm(`Продать все предметы (${game.inv.length} шт.) за ${fmt(sum)} 🫧?`)) return;
  sellItems(game.inv.slice());
};

// ===== Апгрейдер =====
// Ставим несколько бутылок и/или пузыри с баланса и выбираем множитель. Шанс = 85% / множитель.
// Стрелка останавливается на случайном месте круга: попала в зелёное — получаем бутылку
// дороже в «множитель» раз, нет — всё поставленное сгорает. 15% — «комиссия» (раньше 5%)
const UP_MULTS = [1.5, 2, 3, 5, 10, 20, 50, 100];   // во сколько раз дороже станет ставка
// на сколько ступеней вырастет редкость при каждом множителе
const UP_STEPS = { 1.5: 0, 2: 1, 3: 1, 5: 2, 10: 3, 20: 3, 50: 4, 100: 5 };
const UP_BASE = 0.85;
const UP_MAX_ITEMS = 10;                   // сколько бутылок можно поставить за раз
const UP_TIME = 4000;                      // сколько крутится стрелка (как в CSS #arrow), мс

let upMult = 2;
let upBusy = false;   // крутится ли стрелка
let upRot = 0;        // текущий угол стрелки, градусов

function upChance() {
  const boost = boostOn("upg") ? 1.1 : 1;   // буст «Точный апгрейд»
  return Math.min(0.95, UP_BASE / upMult * boost);
}

// сколько пузырей с баланса ставим (поле ввода)
function upStake() {
  return Math.max(0, Math.floor(Number(document.getElementById("upStake").value) || 0));
}
// общая стоимость ставки: бутылки + пузыри
function upTotal() {
  let sum = upStake();
  for (const it of upPicks) sum += it.v;
  return sum;
}

// что получим при удаче: напиток самой дорогой поставленной бутылки, редкость выше, цена = ставка × множитель
function upgradedItem() {
  let base = { s: chosen, r: 0, m: 0 };   // ставим только пузыри — получим бутылку своей газявы
  for (const it of upPicks) if (it.v > (base.v || 0)) base = it;
  return { s: base.s, r: Math.min(base.r + UP_STEPS[upMult], TOP_R), m: base.m || 0, v: Math.round(upTotal() * upMult) };
}

function pickForUpgrade(it) {
  if (upBusy) return;
  if (upPicks.includes(it)) upPicks = upPicks.filter(x => x !== it);   // повторное нажатие — убрать
  else if (upPicks.length >= UP_MAX_ITEMS) { toast(`Максимум ${UP_MAX_ITEMS} бутылок за раз`); return; }
  else upPicks.push(it);
  renderInventory();
  if (upPicks.length === 1) document.getElementById("upgrader").scrollIntoView({ behavior: "smooth" });
}

function renderUpgrader() {
  // кнопки ×1.5 ×2 … ×100
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
  const stake = upStake();
  if (upPicks.length || stake > 0) {
    from.innerHTML = (upPicks.length ? itemHTML(upPicks[0], 50) : "") +
      (upPicks.length > 1 ? `<div class="val">+ ещё ${upPicks.length - 1} шт.</div>` : "") +
      (stake > 0 ? `<div class="val">+ ${fmt(stake)} 🫧</div>` : "") +
      `<div class="rar">Ставка: ${fmt(upTotal())}</div>`;
    to.innerHTML = itemHTML(upgradedItem(), 50);
  } else {
    from.innerHTML = "Нажми ⬆️ у бутылок (до 10) или впиши пузыри ниже";
    to.innerHTML = "❓";
  }
  document.getElementById("upGo").disabled = upBusy || (!upPicks.length && stake <= 0);
}

document.getElementById("upStake").oninput = renderUpgrader;

function doUpgrade() {
  if (upBusy) return;
  const stake = upStake();
  if (!upPicks.length && stake <= 0) return;
  if (stake > game.bubbles) { toast("На балансе нет столько пузырей"); return; }
  ensureAudio();
  upBusy = true;
  document.getElementById("upGo").disabled = true;
  const target = upgradedItem();
  const chance = upChance();
  const roll = Math.random();          // где остановится стрелка: доля круга от 0 до 1
  const win = roll < chance;           // попала в зелёный сектор — победа

  // результат сразу записываем в сохранение (как с кейсами)
  game.bubbles -= stake;
  game.inv = game.inv.filter(x => !upPicks.includes(x));
  if (win) game.inv.unshift(target);
  saveData("gazyava_clicker", game);
  updateClicker();

  // стрелка делает 5 полных оборотов и останавливается на roll
  upRot = upRot - (upRot % 360) + 360 * 5 + roll * 360;
  document.getElementById("arrow").style.transform = `rotate(${upRot}deg)`;

  setTimeout(() => {
    upBusy = false;
    upPicks = [];
    document.getElementById("upStake").value = "";
    if (win) {
      game.upgradesWon++;
      if (target.r >= LEGEND_R) game.gotGold = true;
      if (target.r === TOP_R) addStat("mythic");
      if (upMult >= 20) game.bigWin = true;
      toast(`🎉 Апгрейд удался! ${SODAS[target.s].name} — ${fmt(target.v)} 🫧`);
      if (soundOn) { playSonarPing(); playBubbles(); }
    } else {
      toast("💥 Мимо... ставка сгорела");
    }
    saveData("gazyava_clicker", game);
    renderInventory();
    updateClicker();
  }, UP_TIME + 200);
}

document.getElementById("upGo").onclick = doUpgrade;
