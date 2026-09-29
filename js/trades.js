// ===== trades.js — трейды и дуэли между игроками =====
//
// ТРЕЙД (обе стороны подтверждают):
//  1. Игрок А выбирает, что отдаёт (бутылки и/или пузыри) и сколько пузырей хочет взамен, и отправляет.
//     Отданное сразу убирается из его инвентаря — «лежит в сделке», чтобы его нельзя было продать второй раз.
//  2. Игрок Б видит предложение и жмёт «Принять» (платит, что просили, и получает бутылки) или «Отказаться».
//  3. Телефон А видит ответ: принято — А получает пузыри, отказ/отмена — А получает свои вещи обратно.
//     После этого А удаляет сделку из базы.
//
// ДУЭЛЬ (кейс против кейса):
//  1. А выбирает соперника и кейс, платит за кейс и сразу «открывает» его (предмет пока в дуэли).
//  2. Б принимает — тоже платит за такой же кейс и открывает. У кого предмет дороже — забирает оба.
//     Ничья — каждый остаётся при своём. Отказ — А просто получает свой предмет.

const TRADE_MAX_ITEMS = 10;

let tradePicks = [];   // бутылки, выбранные для трейда
let incomingTrades = [], outgoingTrades = [], incomingDuels = [], outgoingDuels = [];

// журнал сделок на этом телефоне (последние 20 строк)
function logDeal(text) {
  const log = loadData("gazyava_deals", []);
  log.unshift(new Date().toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) + " · " + text);
  saveData("gazyava_deals", log.slice(0, 20));
  renderDealLog();
}
function renderDealLog() {
  const log = loadData("gazyava_deals", []);
  document.getElementById("dealLog").innerHTML = log.length
    ? log.map(l => `<div>${esc(l)}</div>`).join("") : '<div class="empty">Сделок пока не было</div>';
}

// «уже обработано»: чтобы одно и то же событие не начислилось дважды (например, после перезапуска)
function isDone(key) { return loadData("gazyava_deals_done", []).includes(key); }
function markDone(key) {
  const done = loadData("gazyava_deals_done", []);
  done.push(key);
  saveData("gazyava_deals_done", done.slice(-200));
}

// копия предмета без лишних полей (только то, что храним)
function cleanItem(it) {
  return { s: it.s, r: it.r, m: it.m || 0, v: it.v };
}
function itemsText(items) {
  return items.map(it => SODAS[it.s].name).join(", ");
}

// вернуть вещи в инвентарь / получить чужие
function addItems(items, bubbles) {
  for (const it of items) game.inv.unshift(cleanItem(it));
  game.bubbles += bubbles;
  saveData("gazyava_clicker", game);
  renderInventory();
  updateClicker();
}

// ===== Трейды: форма =====
function startTradeWith(pid) {
  showTab("tab-online");
  document.querySelector('#onlineSubs button[data-sub="subTrades"]').click();
  document.getElementById("tradeTo").value = pid;
  document.getElementById("tradeTo").scrollIntoView({ behavior: "smooth" });
}

function renderTradePicker() {
  tradePicks = tradePicks.filter(it => game.inv.includes(it));
  const box = document.getElementById("tradeInv");
  box.innerHTML = "";
  for (const it of game.inv.slice(0, 60)) {
    const el = document.createElement("div");
    el.className = "item" + (tradePicks.includes(it) ? " picked" : "");
    el.style.borderBottomColor = RARITIES[it.r].color;
    el.innerHTML = itemHTML(it, 40, true);
    el.onclick = () => {
      if (tradePicks.includes(it)) tradePicks = tradePicks.filter(x => x !== it);
      else if (tradePicks.length < TRADE_MAX_ITEMS) tradePicks.push(it);
      else toast(`Максимум ${TRADE_MAX_ITEMS} бутылок`);
      renderTradePicker();
    };
    box.appendChild(el);
  }
  if (!game.inv.length) box.innerHTML = '<div class="empty">Инвентарь пуст</div>';
  let sum = 0;
  for (const it of tradePicks) sum += it.v;
  document.getElementById("tradePicked").textContent = tradePicks.length
    ? `Выбрано: ${tradePicks.length} шт. на ${fmt(sum)} 🫧` : "Нажми на бутылки, которые отдаёшь (до 10)";
}

async function sendTrade() {
  const to = document.getElementById("tradeTo").value.trim().toUpperCase();
  const give = Math.max(0, Math.floor(Number(document.getElementById("tradeGive").value) || 0));
  const want = Math.max(0, Math.floor(Number(document.getElementById("tradeWant").value) || 0));
  if (!online) { toast("Трейды работают только онлайн"); return; }
  if (to.length !== 6 || to === playerId) { toast("Впиши ID другого игрока (6 символов)"); return; }
  if (!tradePicks.length && give === 0) { toast("Выбери бутылки или впиши пузыри, которые отдаёшь"); return; }
  if (give > game.bubbles) { toast("На балансе нет столько пузырей"); return; }
  const items = tradePicks.map(cleanItem);
  if (!confirm(`Отправить игроку ${to}: ${items.length} бутылок + ${fmt(give)} 🫧, взамен ${fmt(want)} 🫧?`)) return;

  // забираем отданное из инвентаря («кладём в сделку»)
  const picked = tradePicks;
  game.inv = game.inv.filter(x => !picked.includes(x));
  game.bubbles -= give;
  saveData("gazyava_clicker", game);
  tradePicks = [];
  try {
    await db.collection("trades").add({
      from: playerId, fromNick: profile.nick, to: to, items: items, bubbles: give, want: want,
      status: "offer", t: serverTime(),
    });
    toast("🤝 Предложение отправлено!");
    logDeal(`Предложил ${to}: ${items.length} бут. + ${fmt(give)} 🫧 за ${fmt(want)} 🫧`);
    document.getElementById("tradeGive").value = "";
    document.getElementById("tradeWant").value = "";
  } catch (e) {
    addItems(items, give);   // не отправилось — возвращаем
    toast("Не отправилось 😢 Проверь ID и интернет");
  }
  renderInventory();
  renderTradePicker();
  updateClicker();
}
document.getElementById("tradeSend").onclick = sendTrade;

// ===== Трейды: ответы =====
// смена статуса через транзакцию: сработает, только если статус ещё прежний (защита от «одновременных» нажатий)
function changeStatus(col, id, from, to, extra) {
  const ref = db.collection(col).doc(id);
  return db.runTransaction(async tr => {
    const doc = await tr.get(ref);
    if (!doc.exists || doc.data().status !== from) throw new Error("status");
    tr.update(ref, { status: to, ...(extra || {}) });
  });
}

async function acceptTrade(t) {
  if (t.want > game.bubbles) { toast(`Нужно ${fmt(t.want)} 🫧 на балансе`); return; }
  try {
    await changeStatus("trades", t.id, "offer", "accepted");
  } catch (e) { toast("Сделка уже недоступна"); return; }
  markDone("trade:" + t.id);
  game.bubbles -= t.want;
  addStat("trades");
  addItems(t.items, t.bubbles);
  toast(`✅ Трейд принят! +${t.items.length} бут. +${fmt(t.bubbles)} 🫧`);
  logDeal(`Принял трейд от ${t.fromNick}: ${itemsText(t.items) || "—"} + ${fmt(t.bubbles)} 🫧, отдал ${fmt(t.want)} 🫧`);
}
async function declineTrade(t) {
  try { await changeStatus("trades", t.id, "offer", "declined"); toast("Отказался"); }
  catch (e) { toast("Сделка уже недоступна"); }
}
async function cancelTrade(t) {
  try { await changeStatus("trades", t.id, "offer", "cancelled"); }
  catch (e) { toast("Уже поздно — игрок ответил"); }
}

function listenTrades() {
  // входящие: предложения мне
  db.collection("trades").where("to", "==", playerId).onSnapshot(snap => {
    incomingTrades = snap.docs.map(d => ({ ...d.data(), id: d.id })).filter(t => t.status === "offer");
    renderTrades();
  }, () => {});
  // исходящие: мои предложения. Здесь же обрабатываем ответы
  db.collection("trades").where("from", "==", playerId).onSnapshot(snap => {
    outgoingTrades = [];
    for (const d of snap.docs) {
      const t = { ...d.data(), id: d.id };
      if (t.status === "offer") { outgoingTrades.push(t); continue; }
      const key = "trade:" + t.id;
      if (!isDone(key)) {
        markDone(key);
        if (t.status === "accepted") {
          game.bubbles += t.want;
          addStat("trades");
          saveData("gazyava_clicker", game);
          updateClicker();
          toast(`🤝 Игрок ${t.to} принял трейд! +${fmt(t.want)} 🫧`);
          logDeal(`${t.to} принял трейд: +${fmt(t.want)} 🫧`);
        } else {
          addItems(t.items, t.bubbles);   // отказ или отмена — всё возвращается
          toast(t.status === "declined" ? `Игрок ${t.to} отказался от трейда — вещи вернулись` : "Трейд отменён — вещи вернулись");
          logDeal(`Трейд с ${t.to} ${t.status === "declined" ? "отклонён" : "отменён"}, вещи вернулись`);
        }
      }
      d.ref.delete().catch(() => {});   // сделка завершена — убираем из базы
    }
    renderTrades();
  }, () => {});
}

function renderTrades() {
  const inBox = document.getElementById("tradeIn");
  inBox.innerHTML = incomingTrades.length ? "" : '<div class="empty">Нет входящих предложений</div>';
  for (const t of incomingTrades) {
    const el = document.createElement("div");
    el.className = "deal";
    el.innerHTML = `<div><b></b> (${t.from}) предлагает:</div>
      <div class="dgive">${t.items.map(it => itemHTML(it, 34, true)).join("")}</div>
      <div>${t.items.length} бут. + ${fmt(t.bubbles)} 🫧 · хочет взамен <b>${fmt(t.want)} 🫧</b></div>
      <div class="btns"><button class="main">✅ Принять</button><button class="danger">❌ Отказаться</button></div>`;
    el.querySelector("b").textContent = t.fromNick;
    const [ok, no] = el.querySelectorAll(".btns button");
    ok.onclick = () => acceptTrade(t);
    no.onclick = () => declineTrade(t);
    inBox.appendChild(el);
  }
  const outBox = document.getElementById("tradeOut");
  outBox.innerHTML = outgoingTrades.length ? "" : '<div class="empty">Нет отправленных предложений</div>';
  for (const t of outgoingTrades) {
    const el = document.createElement("div");
    el.className = "deal";
    el.innerHTML = `<div>Игроку <b>${t.to}</b>: ${t.items.length} бут. + ${fmt(t.bubbles)} 🫧 за ${fmt(t.want)} 🫧 · ждём ответа...</div>
      <div class="btns"><button class="danger">↩️ Отменить</button></div>`;
    el.querySelector("button").onclick = () => cancelTrade(t);
    outBox.appendChild(el);
  }
}

// ===== Дуэли =====
const DUEL_CASES = CASES.filter(c => !c.owner);   // именные кейсы в дуэлях не участвуют

function startDuelWith(pid) {
  showTab("tab-online");
  document.querySelector('#onlineSubs button[data-sub="subDuels"]').click();
  document.getElementById("duelTo").value = pid;
}

function renderDuelCases() {
  document.getElementById("duelCase").innerHTML =
    DUEL_CASES.map(c => `<option value="${c.id}">${c.ico} ${c.name} — ${fmt(c.price)} 🫧</option>`).join("");
}

async function sendDuel() {
  const to = document.getElementById("duelTo").value.trim().toUpperCase();
  const c = DUEL_CASES.find(x => x.id === document.getElementById("duelCase").value);
  if (!online) { toast("Дуэли работают только онлайн"); return; }
  if (to.length !== 6 || to === playerId) { toast("Впиши ID другого игрока (6 символов)"); return; }
  if (game.bubbles < c.price) { toast("Не хватает пузырей на кейс"); return; }
  // платим и сразу открываем свой кейс — предмет «лежит в дуэли»
  game.bubbles -= c.price;
  game.casesOpened++;
  const itemA = makeItem(c);
  saveData("gazyava_clicker", game);
  updateClicker();
  try {
    await db.collection("duels").add({
      from: playerId, fromNick: profile.nick, to: to, caseId: c.id, itemA: itemA, status: "open", t: serverTime(),
    });
    toast(`⚔️ Вызов отправлен! Твой предмет спрятан до ответа ${to}`);
    logDeal(`Вызвал ${to} на дуэль (${c.name})`);
  } catch (e) {
    addItems([itemA], 0);   // не отправилось — предмет просто остаётся тебе
    toast("Вызов не отправился — предмет остался тебе");
  }
}
document.getElementById("duelSend").onclick = sendDuel;

async function acceptDuel(d) {
  const c = CASES.find(x => x.id === d.caseId);
  if (!c) return;
  if (game.bubbles < c.price) { toast(`Нужно ${fmt(c.price)} 🫧 на кейс`); return; }
  const itemB = makeItem(c);
  const winner = itemB.v > d.itemA.v ? "to" : itemB.v < d.itemA.v ? "from" : "draw";
  try {
    await changeStatus("duels", d.id, "open", "done", { itemB: itemB, winner: winner });
  } catch (e) { toast("Дуэль уже недоступна"); return; }
  markDone("duel:" + d.id);
  game.bubbles -= c.price;
  game.casesOpened++;
  addStat("duels");
  if (winner === "to") { addStat("duelsWon"); addItems([d.itemA, itemB], 0); }
  else if (winner === "draw") addItems([itemB], 0);
  else { saveData("gazyava_clicker", game); updateClicker(); }
  showDuelResult(itemB, d.itemA, winner === "to" ? "win" : winner === "draw" ? "draw" : "lose", d.fromNick);
  logDeal(`Дуэль с ${d.fromNick}: ${winner === "to" ? "победа 🏆" : winner === "draw" ? "ничья" : "поражение"}`);
}
async function declineDuel(d) {
  try { await changeStatus("duels", d.id, "open", "declined"); toast("Отказался от дуэли"); }
  catch (e) { toast("Дуэль уже недоступна"); }
}
async function cancelDuel(d) {
  try { await changeStatus("duels", d.id, "open", "cancelled"); }
  catch (e) { toast("Уже поздно — соперник ответил"); }
}

function listenDuels() {
  db.collection("duels").where("to", "==", playerId).onSnapshot(snap => {
    incomingDuels = snap.docs.map(d => ({ ...d.data(), id: d.id })).filter(d => d.status === "open");
    renderDuels();
  }, () => {});
  db.collection("duels").where("from", "==", playerId).onSnapshot(snap => {
    outgoingDuels = [];
    for (const doc of snap.docs) {
      const d = { ...doc.data(), id: doc.id };
      if (d.status === "open") { outgoingDuels.push(d); continue; }
      const key = "duel:" + d.id;
      if (!isDone(key)) {
        markDone(key);
        if (d.status === "done") {
          addStat("duels");
          if (d.winner === "from") { addStat("duelsWon"); addItems([d.itemA, d.itemB], 0); }
          else if (d.winner === "draw") addItems([d.itemA], 0);
          showDuelResult(d.itemA, d.itemB, d.winner === "from" ? "win" : d.winner === "draw" ? "draw" : "lose", d.to);
          logDeal(`Дуэль с ${d.to}: ${d.winner === "from" ? "победа 🏆" : d.winner === "draw" ? "ничья" : "поражение"}`);
        } else {
          addItems([d.itemA], 0);   // отказ или отмена — свой предмет забираешь
          toast(d.status === "declined" ? `${d.to} отказался от дуэли — предмет твой` : "Дуэль отменена — предмет твой");
        }
      }
      doc.ref.delete().catch(() => {});
    }
    renderDuels();
  }, () => {});
}

function renderDuels() {
  const inBox = document.getElementById("duelIn");
  inBox.innerHTML = incomingDuels.length ? "" : '<div class="empty">Никто не вызывал</div>';
  for (const d of incomingDuels) {
    const c = CASES.find(x => x.id === d.caseId);
    const el = document.createElement("div");
    el.className = "deal";
    el.innerHTML = `<div>⚔️ <b></b> (${d.from}) вызывает тебя! Кейс «${c ? c.name : "?"}» — ${c ? fmt(c.price) : "?"} 🫧</div>
      <div class="btns"><button class="main">⚔️ Принять</button><button class="danger">❌ Отказаться</button></div>`;
    el.querySelector("b").textContent = d.fromNick;
    const [ok, no] = el.querySelectorAll(".btns button");
    ok.onclick = () => acceptDuel(d);
    no.onclick = () => declineDuel(d);
    inBox.appendChild(el);
  }
  const outBox = document.getElementById("duelOut");
  outBox.innerHTML = outgoingDuels.length ? "" : '<div class="empty">Нет отправленных вызовов</div>';
  for (const d of outgoingDuels) {
    const el = document.createElement("div");
    el.className = "deal";
    el.innerHTML = `<div>Ждём ответа от <b>${d.to}</b>...</div><div class="btns"><button class="danger">↩️ Отменить</button></div>`;
    el.querySelector("button").onclick = () => cancelDuel(d);
    outBox.appendChild(el);
  }
}

// окно результата дуэли: мой предмет против предмета соперника
function showDuelResult(itemMine, itemTheirs, result, rival) {
  const title = result === "win" ? "🏆 ПОБЕДА!" : result === "draw" ? "🤝 Ничья" : "💥 Поражение";
  document.getElementById("duelTitle").textContent = `${title} · дуэль с ${rival}`;
  const box = document.getElementById("duelItems");
  box.innerHTML = "";
  for (const [it, who] of [[itemMine, "Твой"], [itemTheirs, "Соперника"]]) {
    const el = document.createElement("div");
    el.className = "item";
    el.style.borderBottomColor = RARITIES[it.r].color;
    el.innerHTML = `<div class="rar">${who}</div>` + itemHTML(it, 70);
    box.appendChild(el);
  }
  document.getElementById("duelText").textContent = result === "win" ? "Оба предмета твои!"
    : result === "draw" ? "Каждый остаётся при своём" : "Предметы забирает соперник";
  document.getElementById("duelBox").classList.add("show");
  if (soundOn && audio) { if (result === "win") playSonarPing(); playBubbles(); }
}
document.getElementById("duelClose").onclick = () => document.getElementById("duelBox").classList.remove("show");
