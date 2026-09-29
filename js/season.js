// ===== season.js — сезоны, батл-пасс и испытания =====
// Сезон длится 30 дней. Когда начинается новый, прогресс сбрасывается (кроме мерча и профиля),
// а итоги прошлого сезона записываются в историю профиля.

const SEASON_START = new Date(2026, 8, 28).getTime();   // 28.09.2026 — начало 1-го сезона (месяцы в JS с нуля)
const SEASON_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;
const XP_PER_LEVEL = 100;
const PASS_LEVELS = 30;

function seasonNumber() {
  return Math.max(1, Math.floor((Date.now() - SEASON_START) / (SEASON_DAYS * DAY_MS)) + 1);
}
// сколько дней осталось до конца сезона
function seasonDaysLeft() {
  const end = SEASON_START + seasonNumber() * SEASON_DAYS * DAY_MS;
  return Math.ceil((end - Date.now()) / DAY_MS);
}

// ===== Счётчики, по которым считаются испытания =====
function counters() {
  return {
    clicks: game.clicks, cases: game.casesOpened, upgrades: game.upgradesWon, earned: Math.floor(game.total),
    sold: game.stat.sold || 0, chat: game.stat.chat || 0, thanks: game.stat.thanks || 0,
    catch: game.stat.catch || 0, duels: game.stat.duels || 0, duelsWon: game.stat.duelsWon || 0,
    trades: game.stat.trades || 0, visits: game.stat.visits || 0, mythic: game.stat.mythic || 0,
    mutant: game.stat.mutant || 0,
  };
}

// k — какой счётчик, goal — сколько нужно, xp — награда
const DAILY_POOL = [
  { k: "clicks",   goal: 300,   xp: 40, text: "Сделай 300 кликов" },
  { k: "cases",    goal: 10,    xp: 50, text: "Открой 10 кейсов" },
  { k: "upgrades", goal: 1,     xp: 50, text: "Выиграй апгрейд" },
  { k: "earned",   goal: 20000, xp: 40, text: "Собери 20 000 🫧" },
  { k: "sold",     goal: 20,    xp: 30, text: "Продай 20 бутылок" },
  { k: "chat",     goal: 3,     xp: 30, text: "Напиши 3 сообщения в чат" },
  { k: "thanks",   goal: 1,     xp: 30, text: "Похвали другого игрока" },
  { k: "catch",    goal: 1,     xp: 30, text: "Сыграй в «Поймай пузырь»" },
  { k: "duels",    goal: 1,     xp: 60, text: "Сыграй дуэль" },
  { k: "trades",   goal: 1,     xp: 60, text: "Соверши трейд" },
];
const SEASON_POOL = [
  { k: "cases",    goal: 200,     xp: 300, text: "Открой 200 кейсов" },
  { k: "earned",   goal: 1000000, xp: 300, text: "Собери 1 000 000 🫧" },
  { k: "upgrades", goal: 20,      xp: 250, text: "Выиграй 20 апгрейдов" },
  { k: "mythic",   goal: 1,       xp: 500, text: "Выбей ✦ Мифическое" },
  { k: "mutant",   goal: 1,       xp: 400, text: "Выбей ☢️ Мутанта" },
  { k: "duelsWon", goal: 5,       xp: 300, text: "Победи в 5 дуэлях" },
  { k: "trades",   goal: 3,       xp: 200, text: "Соверши 3 трейда" },
  { k: "visits",   goal: 3,       xp: 250, text: "Отметься «Был тут» в 3 местах" },
  { k: "clicks",   goal: 20000,   xp: 250, text: "Сделай 20 000 кликов" },
  { k: "chat",     goal: 30,      xp: 150, text: "Напиши 30 сообщений в чат" },
];

// 3 испытания дня — у всех игроков одинаковые (dayRandom из sodas.js), завтра — другие
function dailyChallenges() {
  const list = DAILY_POOL.map((c, i) => ({ ...c, order: dayRandom(100 + i, 1000) }));
  list.sort((a, b) => a.order - b.order);
  return list.slice(0, 3).map(c => ({ ...c, id: "d:" + todayKey() + ":" + c.k }));
}

// 6 испытаний сезона — в каждом сезоне свой набор («новые испытания»)
function seasonChallenges() {
  const n = seasonNumber();
  const list = SEASON_POOL.map((c, i) => ({ ...c, order: (i * 7 + n * 3) % SEASON_POOL.length }));
  list.sort((a, b) => a.order - b.order);
  return list.slice(0, 6).map(c => ({ ...c, id: "s:" + n + ":" + c.k }));
}

// прогресс дневного испытания = насколько вырос счётчик с начала дня
function dailyBase() {
  if (game.pass.dayKey !== todayKey()) {   // наступил новый день — запоминаем, с чего начали
    game.pass.dayKey = todayKey();
    game.pass.dayBase = counters();
  }
  return game.pass.dayBase;
}
function progress(c) {
  const now = counters()[c.k] || 0;
  if (c.id.startsWith("d:")) return now - (dailyBase()[c.k] || 0);
  return now;   // сезонные — счётчики и так обнуляются в начале сезона
}

function claimChallenge(c) {
  if (game.pass.done[c.id] || progress(c) < c.goal) return;
  game.pass.done[c.id] = true;
  const oldLevel = passLevel();
  game.pass.xp += c.xp;
  saveData("gazyava_clicker", game);
  toast(`✅ +${c.xp} XP` + (passLevel() > oldLevel ? ` · 🎉 Уровень ${passLevel()}!` : ""));
  renderSeason();
}

// ===== Уровни батл-пасса =====
function passLevel() {
  return Math.min(PASS_LEVELS, Math.floor(game.pass.xp / XP_PER_LEVEL));
}

// награда за уровень: 10 — рюкзак, 30 — кубок, каждый 5-й — буст, остальные — пузыри
function levelReward(l) {
  if (l === 10) return { merch: "backpack", text: "🎒 Рюкзак сезона" };
  if (l === 30) return { merch: "crown", text: "🏆 Кубок сезона" };
  if (l % 5 === 0) {
    const b = BOOSTS[(l / 5) % BOOSTS.length];
    return { boost: b.id, text: `${b.ico} ${b.name}` };
  }
  return { bubbles: 1500 * l, text: `${fmt(1500 * l)} 🫧` };
}

function claimLevel(l) {
  if (game.pass.claimed[l] || passLevel() < l) return;
  const r = levelReward(l);
  game.pass.claimed[l] = true;
  if (r.bubbles) game.bubbles += r.bubbles;
  if (r.boost) giveBoost(r.boost);
  if (r.merch) game.merch[r.merch] = true;
  saveData("gazyava_clicker", game);
  toast("🎁 Награда: " + r.text);
  renderSeason();
  updateClicker();
}

// ===== Вкладка «Сезон» (внутри профиля) =====
function renderSeason() {
  const level = passLevel();
  const inLevel = level >= PASS_LEVELS ? XP_PER_LEVEL : game.pass.xp % XP_PER_LEVEL;
  document.getElementById("seasonHead").innerHTML =
    `<b>🎟️ Сезон ${seasonNumber()}</b> · осталось ${seasonDaysLeft()} дн.<br>
     Уровень <b>${level}</b> из ${PASS_LEVELS} · ${inLevel}/${XP_PER_LEVEL} XP
     <div class="bar"><div style="width:${inLevel / XP_PER_LEVEL * 100}%"></div></div>`;

  renderChallengeList("dailyList", dailyChallenges());
  renderChallengeList("seasonList", seasonChallenges());

  const box = document.getElementById("passLevels");
  box.innerHTML = "";
  for (let l = 1; l <= PASS_LEVELS; l++) {
    const r = levelReward(l);
    const el = document.createElement("button");
    const got = !!game.pass.claimed[l];
    el.className = "lvl" + (got ? " got" : level >= l ? " ready" : "");
    el.innerHTML = `<b>${l}</b><span>${r.text}</span>${got ? "✅" : level >= l ? "🎁" : "🔒"}`;
    el.onclick = () => claimLevel(l);
    box.appendChild(el);
  }

  // история прошлых сезонов (хранится в профиле)
  const hist = (profile && profile.history) || [];
  document.getElementById("seasonHistory").textContent = hist.length
    ? "Прошлые сезоны: " + hist.map(h => `S${h.season}: ${fmt(h.total)} 🫧, ур. ${h.level}`).join(" · ")
    : "";
}

function renderChallengeList(boxId, list) {
  const box = document.getElementById(boxId);
  box.innerHTML = "";
  for (const c of list) {
    const p = Math.min(progress(c), c.goal);
    const done = !!game.pass.done[c.id];
    const el = document.createElement("div");
    el.className = "chal" + (done ? " done" : "");
    el.innerHTML = `<div class="ct">${c.text}<small>${fmt(p)} / ${fmt(c.goal)} · +${c.xp} XP</small>
      <div class="bar"><div style="width:${p / c.goal * 100}%"></div></div></div>
      <button class="mini">${done ? "✅" : "Забрать"}</button>`;
    const btn = el.querySelector("button");
    btn.disabled = done || p < c.goal;
    btn.onclick = () => claimChallenge(c);
    box.appendChild(el);
  }
}

// ===== Смена сезона и сброс =====
// Вызывается при запуске: если наступил новый сезон — подводим итоги и начинаем заново
function checkSeason() {
  const n = seasonNumber();
  if (!game.season) {             // первый запуск v3 — просто запоминаем сезон, ничего не сбрасываем
    game.season = n;
    saveData("gazyava_clicker", game);
    return;
  }
  if (game.season >= n) return;
  if (profile) {
    profile.history = profile.history || [];
    profile.history.push({ season: game.season, total: Math.floor(game.total), level: passLevel() });
    saveData("gazyava_profile", profile);
  }
  const old = game.season;
  resetGame(false);
  alert(`🎉 Начался сезон ${n}!\nИтоги сезона ${old} сохранены в профиле. Прогресс обнулён, мерч остался. Новые испытания уже ждут!`);
}

// Сброс: full = true — вообще всё (кнопка в настройках), false — новый сезон (мерч остаётся)
function resetGame(full) {
  const keep = full ? {} : { merch: game.merch, wear: game.wear };
  game = fixGame(keep);
  game.season = seasonNumber();
  saveData("gazyava_clicker", game);
}
