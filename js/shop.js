// ===== shop.js — магазин: временные бусты и мерч с пузыриками =====

// ===== Бусты =====
// Действуют min минут. Время окончания хранится в game.boosts[id] (миллисекунды)
const BOOSTS = [
  { id: "click2", ico: "⚡", name: "Клики ×2",                min: 10, price: 5000 },
  { id: "auto2",  ico: "🏭", name: "Автосбор ×2",             min: 10, price: 15000 },
  { id: "sale",   ico: "💸", name: "Продажа +10%",            min: 15, price: 25000 },
  { id: "luck",   ico: "🍀", name: "Удача: мутации ×2",       min: 15, price: 30000 },
  { id: "upg",    ico: "🎯", name: "Точный апгрейд: шанс +10%", min: 15, price: 40000 },
];

function boostOn(id) {
  return (game.boosts[id] || 0) > Date.now();
}

// цена буста — не меньше, чем 2 минуты автосбора (иначе богатым игрокам бусты почти бесплатны)
function boostPrice(b) {
  return Math.max(b.price, Math.round(autoPerSecond() * 120));
}

// сколько осталось: «9:05»
function boostLeft(id) {
  const sec = Math.max(0, Math.ceil((game.boosts[id] - Date.now()) / 1000));
  return Math.floor(sec / 60) + ":" + String(sec % 60).padStart(2, "0");
}

// дать буст (купленный или награда): если уже действует — время добавляется
function giveBoost(id) {
  const b = BOOSTS.find(x => x.id === id);
  game.boosts[id] = Math.max(Date.now(), game.boosts[id] || 0) + b.min * 60000;
}

function buyBoost(b) {
  const price = boostPrice(b);
  if (game.bubbles < price) { toast("Не хватает пузырей 🫧"); return; }
  game.bubbles -= price;
  giveBoost(b.id);
  saveData("gazyava_clicker", game);
  toast(`${b.ico} ${b.name} — на ${b.min} мин!`);
  renderShop();
  updateClicker();
}

// строка активных бустов над кликером и кейсами: «⚡ 9:05 · 🍀 14:59»
function renderBoostLines() {
  const text = BOOSTS.filter(b => boostOn(b.id)).map(b => `${b.ico} ${boostLeft(b.id)}`).join(" · ");
  document.querySelectorAll(".boostline").forEach(el => {
    if (el.textContent !== text) el.textContent = text;
  });
}

// ===== Мерч =====
// Одежда с пузыриками. Бонусы всех купленных вещей складываются, а одну вещь можно «надеть» на аватар.
// bonus: click — к клику, auto — к автосбору, sell — к продаже, mut — к шансу мутаций (0.05 = +5%).
// pass: true — не продаётся, выдаётся только за уровни батл-пасса
const MERCH = [
  { id: "cap",      ico: "🧢", name: "Кепка с пузырями",     price: 20000,   bonus: { click: 0.05 },            text: "+5% к клику" },
  { id: "tee",      ico: "👕", name: "Футболка «Газява»",    price: 60000,   bonus: { auto: 0.05 },             text: "+5% к автосбору" },
  { id: "socks",    ico: "🧦", name: "Носки «Пузырики»",     price: 120000,  bonus: { sell: 0.03 },             text: "+3% к продаже" },
  { id: "hoodie",   ico: "🧥", name: "Худи «Газявный»",      price: 300000,  bonus: { click: 0.1, auto: 0.05 }, text: "+10% к клику, +5% к автосбору" },
  { id: "glasses",  ico: "🕶️", name: "Очки «Радар»",         price: 600000,  bonus: { mut: 0.2 },               text: "мутации выпадают на 20% чаще" },
  { id: "sneakers", ico: "👟", name: "Кроссы с пузырями",    price: 1500000, bonus: { auto: 0.1, sell: 0.03 },  text: "+10% к автосбору, +3% к продаже" },
  { id: "backpack", ico: "🎒", name: "Рюкзак сезона",        pass: true,     bonus: { sell: 0.05 },             text: "+5% к продаже · уровень 10 батл-пасса" },
  { id: "crown",    ico: "🏆", name: "Кубок сезона",         pass: true,     bonus: { click: 0.25, auto: 0.1 }, text: "+25% к клику, +10% к автосбору · уровень 30" },
];

// сумма бонусов вида kind от всего купленного мерча
function merchBonus(kind) {
  let sum = 0;
  for (const m of MERCH) if (game.merch[m.id]) sum += m.bonus[kind] || 0;
  return sum;
}

function buyMerch(m) {
  if (game.merch[m.id] || m.pass) return;
  if (game.bubbles < m.price) { toast("Не хватает пузырей 🫧"); return; }
  if (!confirm(`Купить «${m.name}» за ${fmt(m.price)} 🫧?`)) return;
  game.bubbles -= m.price;
  game.merch[m.id] = true;
  game.wear = m.id;   // сразу надеваем обновку
  saveData("gazyava_clicker", game);
  toast(`${m.ico} ${m.name} — твоё! Надето на аватар`);
  renderShop();
  updateClicker();
}

function wearMerch(m) {
  game.wear = game.wear === m.id ? "" : m.id;   // повторное нажатие — снять
  saveData("gazyava_clicker", game);
  renderShop();
}

// аватар с надетой вещью в уголке (используется в профиле, топах, чате)
function avatarHTML(avatar, wear) {
  const m = MERCH.find(x => x.id === wear);
  return `<span class="av">${esc(avatar || "🥤")}${m ? `<span class="wear">${m.ico}</span>` : ""}</span>`;
}

// ===== Вкладка «Магазин» (внутри профиля) =====
function renderShop() {
  const boostBox = document.getElementById("boostShop");
  boostBox.innerHTML = "";
  for (const b of BOOSTS) {
    const btn = document.createElement("button");
    btn.className = "upgrade";
    btn.innerHTML = `<span class="ico">${b.ico}</span>
      <span class="info"><div class="title">${b.name}</div>
      <div class="sub">${boostOn(b.id) ? "⏱ осталось " + boostLeft(b.id) + " · купить ещё +" : "на "}${b.min} мин</div></span>
      <span class="cost">${fmt(boostPrice(b))} 🫧</span>`;
    btn.disabled = game.bubbles < boostPrice(b);
    btn.onclick = () => buyBoost(b);
    boostBox.appendChild(btn);
  }

  const merchBox = document.getElementById("merchShop");
  merchBox.innerHTML = "";
  for (const m of MERCH) {
    const have = !!game.merch[m.id];
    const el = document.createElement("div");
    el.className = "merch" + (have ? " have" : "") + (game.wear === m.id ? " worn" : "");
    el.innerHTML = `<div class="mico">${m.ico}</div><div class="mnm">${m.name}</div><div class="msub">${m.text}</div>
      <button class="mini"></button>`;
    const btn = el.querySelector("button");
    if (have) {
      btn.textContent = game.wear === m.id ? "✅ Надето" : "Надеть";
      btn.onclick = () => wearMerch(m);
    } else if (m.pass) {
      btn.textContent = "🎟️ Батл-пасс";
      btn.disabled = true;
    } else {
      btn.textContent = fmt(m.price) + " 🫧";
      btn.disabled = game.bubbles < m.price;
      btn.onclick = () => buyMerch(m);
    }
    merchBox.appendChild(el);
  }
  const bonus = ["click", "auto", "sell", "mut"].map(k => Math.round(merchBonus(k) * 100));
  document.getElementById("merchTotal").textContent =
    `Бонусы мерча: клик +${bonus[0]}% · автосбор +${bonus[1]}% · продажа +${bonus[2]}% · мутации +${bonus[3]}%`;
}
