// ===== core.js — общее для всех вкладок: сохранение, звук, сообщения, вкладки =====
// Файлы js/ подключаются по порядку (см. конец index.html), и у всех общие переменные.

// звук
let audio = null, echo = null;
let soundOn = true;
let lastBubbles = 0;     // когда последний раз булькали (чтобы не было каши из звуков)
let pingedThisTurn = false;

// ===== Звуки подводной лодки (синтезируются кодом, без файлов) =====

// Луч прошёл над газявой: «пинг» гидролокатора (раз за оборот) + бульканье
function onGazyavaFound(time) {
  if (!soundOn || !audio) return;
  if (!pingedThisTurn) {
    playSonarPing();
    pingedThisTurn = true;
  }
  if (time - lastBubbles > 400) {
    playBubbles();
    lastBubbles = time;
  }
}

// Эхо: звук повторяется всё тише, как под водой.
// Создаём один раз: вход echo -> динамики и echo -> задержка -> (петля) -> динамики
function setupEcho() {
  echo = audio.createGain();
  const delay = audio.createDelay();
  delay.delayTime.value = 0.35;       // эхо через 0.35 с
  const feedback = audio.createGain();
  feedback.gain.value = 0.4;          // каждое следующее эхо на 60% тише
  echo.connect(audio.destination);
  echo.connect(delay);
  delay.connect(feedback);
  feedback.connect(delay);
  delay.connect(audio.destination);
}

// «Пиннннг» сонара: чистый тон, резкое начало, долгое затухание
function playSonarPing() {
  const t = audio.currentTime;
  const osc = audio.createOscillator();
  const gain = audio.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(1200, t);
  osc.frequency.exponentialRampToValueAtTime(1100, t + 1.5);   // тон чуть «плывёт» вниз
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(0.35, t + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 1.8);
  osc.connect(gain);
  gain.connect(echo);
  osc.start(t);
  osc.stop(t + 1.9);
}

// Бульканье: несколько коротких «блупов» в случайные моменты
function playBubbles() {
  const t0 = audio.currentTime;
  const count = 5 + Math.floor(Math.random() * 6);   // 5–10 пузырьков
  for (let i = 0; i < count; i++) {
    playOneBubble(t0 + Math.random() * 0.7);
  }
}

// Один пузырёк «блуп»: тон быстро идёт вверх
function playOneBubble(t) {
  const f = 250 + Math.random() * 450;   // у каждого пузырька своя высота
  const osc = audio.createOscillator();
  const gain = audio.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(f, t);
  osc.frequency.exponentialRampToValueAtTime(f * 2.5, t + 0.07);
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(0.3, t + 0.005);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
  osc.connect(gain);
  gain.connect(audio.destination);
  osc.start(t);
  osc.stop(t + 0.1);
}

// Звук создаём один раз и только после нажатия (иначе айфон не даст играть)
function ensureAudio() {
  if (!audio) {
    audio = new (window.AudioContext || window.webkitAudioContext)();
    setupEcho();
  }
  if (audio.state === "suspended") audio.resume();
}

// ===== Всплывающее сообщение =====
let toastTimer = null;
function toast(text) {
  const el = document.getElementById("toast");
  el.textContent = text;
  el.style.display = "block";
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.style.display = "none"; }, 3000);
}

// ===== Помощники =====

function resize() {
  // учитываем плотность пикселей, чтобы на айфоне не было мыла
  const dpr = window.devicePixelRatio || 1;
  canvas.width = canvas.clientWidth * dpr;
  canvas.height = canvas.clientHeight * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function setStatus(text) {
  document.getElementById("status").textContent = text;
}

// расстояние между двумя точками на Земле в метрах (формула гаверсинусов)
function distance(a, b) {
  const R = 6371000, rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad, dLon = (b.lon - a.lon) * rad;
  const x = Math.sin(dLat / 2) ** 2 +
            Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

function formatDist(m) {
  return m < 1000 ? `${Math.round(m)} м` : `${(m / 1000).toFixed(1)} км`;
}

// сохранение в памяти телефона (localStorage). try — на случай, если браузер запретил
function loadData(key, byDefault) {
  try {
    const value = localStorage.getItem(key);
    return value === null ? byDefault : JSON.parse(value);
  } catch (e) {
    return byDefault;
  }
}
function saveData(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) {}
}

// сколько времени прошло: «5 мин назад»
function ago(ms) {
  const min = Math.round((Date.now() - ms) / 60000);
  if (min < 1) return "только что";
  if (min < 60) return min + " мин назад";
  if (min < 1440) return Math.round(min / 60) + " ч назад";
  return Math.round(min / 1440) + " дн назад";
}

// число с пробелами: 12345 -> «12 345»
function fmt(n) {
  return Math.floor(n).toLocaleString("ru-RU");
}

// ===== Вкладки =====

document.querySelectorAll("#tabbar button").forEach(btn => {
  btn.onclick = () => showTab(btn.dataset.tab);
});

function showTab(id) {
  document.querySelectorAll(".tab").forEach(t => t.classList.toggle("active", t.id === id));
  document.querySelectorAll("#tabbar button").forEach(b => b.classList.toggle("active", b.dataset.tab === id));
  // пока карта была скрыта, она «потеряла» размер — пересчитываем
  if (id === "tab-radar" && map) {
    map.invalidateSize();
    resize();
    if (me) map.setView([me.lat, me.lon], map.getZoom(), { animate: false });
  }
  if (id === "tab-profile") renderProfile();
}

// ===== Сохранение игры =====
// состояние игры: сколько пузыриков сейчас, сколько всего, сколько куплено улучшений
let game = fixGame(loadData("gazyava_clicker", {}));

// Заполняет недостающие поля. Нужна для старых сохранений (там новых полей нет)
// и для сброса: fixGame({}) — это новая игра с нуля
function fixGame(g) {
  g.bubbles = g.bubbles || 0;             // пузыри на балансе
  g.total = g.total || 0;                 // всего заработано (для званий и топа сезона)
  g.owned = g.owned || {};                // купленные улучшения кликера: {id: сколько}
  g.clicks = g.clicks || 0;               // сколько раз нажали на бутылку
  g.pointsAdded = g.pointsAdded || 0;     // сколько точек Family добавили
  g.bestCatch = g.bestCatch || 0;         // рекорд в «Поймай пузырь»
  g.ach = g.ach || {};                    // полученные достижения: {id: true}
  g.inv = g.inv || [];                    // инвентарь: [{s: номер напитка, r: редкость, m: мутация, v: цена}]
  g.casesOpened = g.casesOpened || 0;     // сколько кейсов открыто
  g.gotGold = g.gotGold || false;         // выпадала ли 👑 Легендарная
  g.upgradesWon = g.upgradesWon || 0;     // сколько апгрейдов удалось
  g.bigWin = g.bigWin || false;           // удался ли апгрейд ×20 и выше
  g.stat = g.stat || {};                  // прочие счётчики для испытаний: продано, сообщений в чат...
  g.dayKey = g.dayKey || "";              // какой сегодня день (для «Топа дня»)
  g.dayEarned = g.dayEarned || 0;         // сколько заработано сегодня
  g.freeDay = g.freeDay || "";            // в какой день уже крутили бесплатный кейс
  g.boosts = g.boosts || {};              // бусты: {id: до какого времени действует}
  g.merch = g.merch || {};                // купленный мерч: {id: true}
  g.wear = g.wear || "";                  // какой мерч надет на аватар
  g.pass = g.pass || { xp: 0, claimed: {}, done: {}, dayKey: "", dayBase: {} };   // батл-пасс
  g.season = g.season || 0;               // номер сезона (0 — ещё не знаем)
  return g;
}

// прибавить к счётчику испытаний: addStat("sold", 3)
function addStat(name, n) {
  game.stat[name] = (game.stat[name] || 0) + (n === undefined ? 1 : n);
}

// сегодняшняя дата строкой: «2026-09-28»
function todayKey() {
  const d = new Date();
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}

// учёт заработка за сегодня (для «Топа дня»): в новый день счётчик начинается с нуля
function addDayEarned(n) {
  if (game.dayKey !== todayKey()) { game.dayKey = todayKey(); game.dayEarned = 0; }
  game.dayEarned += n;
}

// ===== Настройки =====
// Хранятся отдельно от игры — сброс прогресса и новый сезон их не трогают
let settings = loadData("gazyava_settings", {});
settings.scream = settings.scream !== false;                // скример включён, пока его не выключили
settings.autoSell = settings.autoSell || [];                // autoSell[номер редкости] = true — продавать сразу
settings.keepMutated = settings.keepMutated !== false;      // мутации не продавать автоматически
function saveSettings() { saveData("gazyava_settings", settings); }

// ===== Подвкладки (кнопки-переключатели внутри вкладки) =====
// Кнопки: <button data-sub="имя">, блоки: <div class="sub" id="имя">. Показываем выбранный блок
function setupSubtabs(barId, onShow) {
  const bar = document.getElementById(barId);
  bar.querySelectorAll("button").forEach(btn => {
    btn.onclick = () => {
      bar.querySelectorAll("button").forEach(b => {
        b.classList.toggle("on", b === btn);
        document.getElementById(b.dataset.sub).style.display = b === btn ? "" : "none";
      });
      if (onShow) onShow(btn.dataset.sub);
    };
  });
  bar.querySelector("button").click();   // сразу открываем первую
}

// защита от «вредного» текста: превращает < > & " в безопасные символы (для innerHTML)
function esc(text) {
  return String(text).replace(/[&<>"]/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch]));
}

// ===== ID игрока =====
// ID — 6 случайных символов, создаётся один раз и хранится в телефоне
const ID_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";   // без 0/O и 1/I, чтобы не путать
let playerId = loadData("gazyava_id", null);
if (!playerId) {
  playerId = "";
  for (let i = 0; i < 6; i++) playerId += ID_CHARS[Math.floor(Math.random() * ID_CHARS.length)];
  saveData("gazyava_id", playerId);
}
