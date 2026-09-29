// ===== clicker.js — вкладка «Кликер»: улучшения, достижения, мини-игра =====

// click — сколько добавляет к силе клика, auto — сколько пузыриков в секунду сам

const UPGRADES = [
  { id: "shake",   ico: "🤲", title: "Встряхнуть сильнее",  sub: "+1 за клик",        cost: 15,      click: 1,   auto: 0 },
  { id: "ice",     ico: "🧊", title: "Лёд в стакан",        sub: "+1 в секунду",      cost: 50,      click: 0,   auto: 1 },
  { id: "bottle2", ico: "🍾", title: "Двухлитровка",        sub: "+2 за клик",        cost: 100,     click: 2,   auto: 0 },
  { id: "straw",   ico: "🥤", title: "Трубочка",            sub: "+5 за клик",        cost: 250,     click: 5,   auto: 0 },
  { id: "kiosk",   ico: "🏪", title: "Ларёк с газявой",     sub: "+5 в секунду",      cost: 500,     click: 0,   auto: 5 },
  { id: "fridge",  ico: "❄️", title: "Холодильник",         sub: "+15 в секунду",     cost: 1500,    click: 0,   auto: 15 },
  { id: "glove",   ico: "🧤", title: "Перчатка газировщика", sub: "+25 за клик",      cost: 3000,    click: 25,  auto: 0 },
  { id: "factory", ico: "🏭", title: "Завод газявы",        sub: "+30 в секунду",     cost: 4000,    click: 0,   auto: 30 },
  { id: "vending", ico: "🥫", title: "Автомат с газявой",   sub: "+80 в секунду",     cost: 12000,   click: 0,   auto: 80 },
  { id: "rocket",  ico: "🚀", title: "Газява в космосе",    sub: "+200 в секунду",    cost: 40000,   click: 0,   auto: 200 },
  { id: "golden",  ico: "🏆", title: "Золотая бутылка",     sub: "+200 за клик",      cost: 100000,  click: 200, auto: 0 },
  { id: "truck",   ico: "🚚", title: "Фура газявы",         sub: "+600 в секунду",    cost: 150000,  click: 0,   auto: 600 },
  { id: "planet",  ico: "🪐", title: "Планета газявы",      sub: "+2 500 в секунду",  cost: 800000,  click: 0,   auto: 2500 },
  { id: "portal",  ico: "🌀", title: "Портал в газявную вселенную", sub: "+12 000 в секунду", cost: 5000000, click: 0, auto: 12000 },
];

// звания по количеству всех собранных пузыриков
const RANKS = [
  [0, "Новичок газявы"], [100, "Любитель пузыриков"], [1000, "Газировщик"],
  [10000, "Сомелье газявы"], [100000, "Газявный магнат"], [1000000, "Властелин газявы 👑"],
  [10000000, "Газявный император 🏛️"], [100000000, "Бог газявы 🌌"],
];


// каждое следующее улучшение дороже на 15%
function upgradeCost(u) {
  return Math.floor(u.cost * Math.pow(1.15, game.owned[u.id] || 0));
}
function clickPower() {
  let power = 1;
  for (const u of UPGRADES) power += u.click * (game.owned[u.id] || 0);
  if (chosen === dailyIndex()) power *= 2;   // выбрана газява дня — клики ×2
  if (boostOn("click2")) power *= 2;         // буст «Клики ×2»
  return Math.round(power * (1 + merchBonus("click")));   // мерч даёт проценты
}
function autoPerSecond() {
  let sum = 0;
  for (const u of UPGRADES) sum += u.auto * (game.owned[u.id] || 0);
  if (boostOn("auto2")) sum *= 2;            // буст «Автосбор ×2»
  return sum * (1 + merchBonus("auto"));
}
// заработок: идёт на баланс, в «всего собрано» (звание, топ сезона) и в «Топ дня»
function addBubbles(n) {
  game.bubbles += n;
  game.total += n;
  addDayEarned(n);
}

function renderClickerBottle() {
  document.getElementById("bigBottle").innerHTML = bottleSVG(SODAS[chosen], 220);
  document.getElementById("bottleName").textContent = `Жми на «${SODAS[chosen].name}»!`;
}

// кнопки улучшений создаём один раз, потом только обновляем цифры
function renderUpgrades() {
  const box = document.getElementById("upgrades");
  for (const u of UPGRADES) {
    const btn = document.createElement("button");
    btn.className = "upgrade";
    btn.id = "up-" + u.id;
    btn.innerHTML = `<span class="ico">${u.ico}</span>
      <span class="info"><div class="title">${u.title}</div><div class="sub"></div></span>
      <span class="cost"></span>`;
    btn.onclick = () => buyUpgrade(u);
    box.appendChild(btn);
  }
}

function buyUpgrade(u) {
  const cost = upgradeCost(u);
  if (game.bubbles < cost) return;
  game.bubbles -= cost;
  game.owned[u.id] = (game.owned[u.id] || 0) + 1;
  saveData("gazyava_clicker", game);
  if (soundOn) { ensureAudio(); playBubbles(); }
  updateClicker();
}

function updateClicker() {
  document.getElementById("bubblesCount").textContent = fmt(game.bubbles) + " 🫧";
  document.getElementById("rates").textContent =
    `+${fmt(clickPower())} за клик · +${fmt(autoPerSecond())} в секунду` +
    (chosen === dailyIndex() ? " · 🔥×2" : "");
  renderBoostLines();   // активные бусты с таймером (shop.js)
  let rank = RANKS[0][1];
  for (const [need, name] of RANKS) if (game.total >= need) rank = name;
  document.getElementById("rank").textContent = "🏅 " + rank;

  for (const u of UPGRADES) {
    const btn = document.getElementById("up-" + u.id);
    const count = game.owned[u.id] || 0;
    const cost = upgradeCost(u);
    btn.querySelector(".sub").textContent = u.sub + (count ? `  (есть: ${count})` : "");
    btn.querySelector(".cost").textContent = fmt(cost) + " 🫧";
    btn.disabled = game.bubbles < cost;
  }
  updateCasesBalance();
  checkAchievements();
}

// клик по бутылке
document.getElementById("bigBottle").onclick = (e) => {
  const power = clickPower();
  addBubbles(power);
  game.clicks++;
  spawnFloat(e, "+" + fmt(power));
  if (soundOn) { ensureAudio(); playOneBubble(audio.currentTime); }
  updateClicker();
};

// всплывающее «+N» и пузырики в месте нажатия
function spawnFloat(e, text) {
  const btn = document.getElementById("bigBottle");
  const rect = btn.getBoundingClientRect();
  const x = (e.clientX || rect.left + rect.width / 2) - rect.left;
  const y = (e.clientY || rect.top + rect.height / 2) - rect.top;
  const items = [];

  const label = document.createElement("div");
  label.className = "float";
  label.textContent = text;
  label.style.left = x + "px";
  label.style.top = y + "px";
  items.push(label);

  for (let i = 0; i < 3; i++) {
    const b = document.createElement("div");
    const size = 6 + Math.random() * 10;
    b.className = "bubble";
    b.style.width = b.style.height = size + "px";
    b.style.left = (x + (Math.random() - 0.5) * 60) + "px";
    b.style.top = (y + (Math.random() - 0.5) * 20) + "px";
    items.push(b);
  }
  for (const el of items) {
    btn.appendChild(el);
    setTimeout(() => el.remove(), 1200);   // убираем после анимации
  }
}

// автоматические пузырики: 10 раз в секунду по 1/10 от «в секунду»
setInterval(() => {
  const perSecond = autoPerSecond();
  if (perSecond > 0) {
    addBubbles(perSecond / 10);
    updateClicker();
  }
}, 100);

// сохраняем игру каждые 2 секунды и когда приложение сворачивают
setInterval(() => saveData("gazyava_clicker", game), 2000);
document.addEventListener("visibilitychange", () => saveData("gazyava_clicker", game));

// ===== Достижения =====
// check — функция, которая говорит, выполнено ли условие
const ACHIEVEMENTS = [
  { id: "first",   ico: "🫧", title: "Первый пузырь",       check: () => game.total >= 1 },
  { id: "clicks",  ico: "👆", title: "100 кликов",          check: () => game.clicks >= 100 },
  { id: "k1",      ico: "🥉", title: "1 000 пузырей",       check: () => game.total >= 1000 },
  { id: "k100",    ico: "🥇", title: "100 000 пузырей",     check: () => game.total >= 100000 },
  { id: "buy",     ico: "🛒", title: "Первая покупка",      check: () => Object.keys(game.owned).length > 0 },
  { id: "factory", ico: "🏭", title: "Свой завод",          check: () => (game.owned.factory || 0) > 0 },
  { id: "rocket",  ico: "🚀", title: "Газява в космосе",    check: () => (game.owned.rocket || 0) > 0 },
  { id: "visit1",  ico: "🧭", title: "Разведчик: 1 точка",  check: () => visitedCount() >= 1 },
  { id: "visit5",  ico: "🗺️", title: "Турист: 5 точек",     check: () => visitedCount() >= 5 },
  { id: "mapper",  ico: "📌", title: "Картограф",           check: () => game.pointsAdded >= 1 },
  { id: "catch30", ico: "🎯", title: "Ловкач: 30 пузырей",  check: () => game.bestCatch >= 30 },
  { id: "daily",   ico: "🔥", title: "В тренде дня",        check: () => chosen === dailyIndex() },
  { id: "case1",   ico: "📦", title: "Первый кейс",         check: () => game.casesOpened >= 1 },
  { id: "gold",    ico: "⭐", title: "👑 Легендарка",    check: () => game.gotGold },
  { id: "upwin",   ico: "⬆️", title: "Удачный апгрейд",     check: () => game.upgradesWon >= 1 },
  { id: "case50",  ico: "🎰", title: "Кейсоман: 50 кейсов", check: () => game.casesOpened >= 50 },
  { id: "risk",    ico: "🎲", title: "Рисковый: ×20 и выше", check: () => game.bigWin },
  { id: "portal",  ico: "🌀", title: "Открыл портал",       check: () => (game.owned.portal || 0) > 0 },
  { id: "mythic",  ico: "✦",  title: "Мифическая газява",   check: () => (game.stat.mythic || 0) > 0 },
  { id: "mutant",  ico: "☢️", title: "Поймал мутанта",      check: () => (game.stat.mutant || 0) > 0 },
  { id: "trade1",  ico: "🤝", title: "Первый трейд",        check: () => (game.stat.trades || 0) > 0 },
  { id: "duel1",   ico: "⚔️", title: "Победа в дуэли",      check: () => (game.stat.duelsWon || 0) > 0 },
  { id: "chat1",   ico: "💬", title: "Болтун: 10 сообщений", check: () => (game.stat.chat || 0) >= 10 },
];

function checkAchievements() {
  const got = [];
  for (const a of ACHIEVEMENTS) {
    if (!game.ach[a.id] && a.check()) {
      game.ach[a.id] = true;
      got.push(a.ico + " " + a.title);
    }
  }
  if (got.length) {
    toast("🏆 Достижение: " + got.join(", "));
    saveData("gazyava_clicker", game);
    renderAchievements();
  }
}

function renderAchievements() {
  const box = document.getElementById("achList");
  box.innerHTML = "";
  for (const a of ACHIEVEMENTS) {
    const el = document.createElement("div");
    el.className = game.ach[a.id] ? "ach got" : "ach";
    el.innerHTML = `<span class="ico">${a.ico}</span>${a.title}`;
    box.appendChild(el);
  }
}

// ===== Мини-игра «Поймай пузырь» =====
const CATCH_TIME = 30;       // длительность игры, секунд
const CATCH_REWARD = 10;     // пузырей в кликер за каждое очко

let catchScore = 0, catchLeft = 0;
let catchSpawn = null, catchTimer = null;   // таймеры: появление пузырей и обратный отсчёт
let catchRunning = false;                   // идёт ли игра (чтобы награду не дали дважды)

function startCatch() {
  ensureAudio();
  catchRunning = true;
  catchScore = 0;
  catchLeft = CATCH_TIME;
  document.getElementById("catchField").innerHTML = "";
  document.getElementById("catchEnd").style.display = "none";
  document.getElementById("catchGame").style.display = "block";
  updateCatchTop();
  catchSpawn = setInterval(spawnCatchBubble, 450);
  catchTimer = setInterval(() => {
    catchLeft--;
    updateCatchTop();
    if (catchLeft <= 0) endCatch();
  }, 1000);
}

function updateCatchTop() {
  document.getElementById("catchTop").textContent = `⏱ ${catchLeft}   🫧 ${catchScore}`;
}

// новый пузырь внизу экрана; CSS-анимация сама поднимает его вверх
function spawnCatchBubble() {
  const field = document.getElementById("catchField");
  const b = document.createElement("div");
  const gold = Math.random() < 0.1;          // 10% — золотой пузырь, +5 очков
  const size = 45 + Math.random() * 40;
  b.className = gold ? "cb gold" : "cb";
  b.style.width = b.style.height = size + "px";
  b.style.left = Math.random() * (field.clientWidth - size) + "px";
  b.style.animationDuration = (2.5 + Math.random() * 2) + "s";   // разная скорость
  b.onpointerdown = () => {
    catchScore += gold ? 5 : 1;
    if (soundOn) playOneBubble(audio.currentTime);
    b.remove();
    updateCatchTop();
  };
  b.addEventListener("animationend", () => b.remove());   // улетел — не поймали
  field.appendChild(b);
}

function endCatch() {
  if (!catchRunning) {   // игра уже закончена — ✖ просто закрывает окно
    document.getElementById("catchGame").style.display = "none";
    return;
  }
  catchRunning = false;
  clearInterval(catchSpawn);
  clearInterval(catchTimer);
  document.getElementById("catchField").innerHTML = "";
  const reward = catchScore * CATCH_REWARD;
  const isRecord = catchScore > game.bestCatch;
  if (isRecord) game.bestCatch = catchScore;
  addStat("catch");   // для испытаний батл-пасса
  addBubbles(reward);
  saveData("gazyava_clicker", game);
  updateClicker();
  document.getElementById("catchResult").innerHTML =
    `Поймано: <b>${catchScore}</b> 🫧<br>Рекорд: ${game.bestCatch}${isRecord ? " 🎉 НОВЫЙ!" : ""}<br>` +
    `+${fmt(reward)} пузырей в кликер`;
  document.getElementById("catchEnd").style.display = "flex";
}

document.getElementById("catchBtn").onclick = startCatch;
document.getElementById("catchAgain").onclick = startCatch;
document.getElementById("catchExit").onclick = endCatch;
document.getElementById("catchClose").onclick = () => {
  document.getElementById("catchGame").style.display = "none";
};
