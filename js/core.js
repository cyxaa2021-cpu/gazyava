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
let game = loadData("gazyava_clicker", { bubbles: 0, total: 0, owned: {} });
// новые поля — у старых сохранений их нет, заполняем нулями
game.clicks = game.clicks || 0;             // сколько раз нажали на бутылку
game.pointsAdded = game.pointsAdded || 0;   // сколько точек Family добавили
game.bestCatch = game.bestCatch || 0;       // рекорд в «Поймай пузырь»
game.ach = game.ach || {};                  // полученные достижения: {id: true}
game.inv = game.inv || [];                  // инвентарь из кейсов: [{s: номер газявы, r: редкость, v: цена}]
game.casesOpened = game.casesOpened || 0;   // сколько кейсов открыто
game.gotGold = game.gotGold || false;       // выпадала ли ★ Золотая
game.upgradesWon = game.upgradesWon || 0;   // сколько апгрейдов удалось
game.bigWin = game.bigWin || false;         // удался ли апгрейд ×20 и выше

// ===== ID игрока =====
// ID — 6 случайных символов, создаётся один раз и хранится в телефоне
const ID_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";   // без 0/O и 1/I, чтобы не путать
let playerId = loadData("gazyava_id", null);
if (!playerId) {
  playerId = "";
  for (let i = 0; i < 6; i++) playerId += ID_CHARS[Math.floor(Math.random() * ID_CHARS.length)];
  saveData("gazyava_id", playerId);
}
