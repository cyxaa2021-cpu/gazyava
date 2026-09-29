// ===== online.js — онлайн через Firebase: профили, топы, чат, лента дропа, «спасибо», рефералы =====
//
// Как телефон доказывает, что он — владелец своего ID:
// 1) Firebase выдаёт телефону анонимный uid (вход без логина и пароля);
// 2) документ owners/<ID> хранит {uid, k}, где k — секретный ключ этого игрока (лежит только у него в телефоне);
// 3) правила Firestore пускают писать от имени ID только того, чей uid записан в owners/<ID>.
// Сменил телефон — перенёс сохранение через экспорт (ключ k переносится вместе с ним) и снова стал владельцем.

const REF_BONUS = 25000;       // пригласившему — за каждого друга
const REF_BONUS_NEW = 10000;   // новичку, который ввёл ID друга
const CHAT_MAX = 200;          // длина сообщения
const CHAT_COOLDOWN = 3000;    // не чаще одного сообщения в 3 секунды

let online = false;            // подключились и подтвердили свой ID
let playersCache = [];         // загруженные игроки для топов
let topMode = "day";
let lastChatAt = 0;
let lastPushed = "";           // что последний раз отправили в свой профиль (чтобы не слать одно и то же)

// секретный ключ игрока: 24 случайных символа, создаётся один раз
let secretKey = loadData("gazyava_secret", null);
if (!secretKey) {
  secretKey = "";
  for (let i = 0; i < 24; i++) secretKey += ID_CHARS[Math.floor(Math.random() * ID_CHARS.length)];
  saveData("gazyava_secret", secretKey);
}

function serverTime() {
  return firebase.firestore.FieldValue.serverTimestamp();
}

function setOnlineStatus(text) {
  document.getElementById("onlineStatus").textContent = text;
}

// ===== Подключение =====
async function initOnline() {
  if (online) return;
  if (!db || !firebase.auth) { setOnlineStatus("🔴 Офлайн: нет связи с сервером"); return; }
  if (!profile) { setOnlineStatus("🔴 Сначала зарегистрируйся"); return; }
  setOnlineStatus("🟡 Подключаюсь...");
  try {
    await firebase.auth().signInAnonymously();
    const uid = firebase.auth().currentUser.uid;
    // записываем себя владельцем своего ID (правила пустят, только если ключ k совпадает)
    await db.collection("owners").doc(playerId).set({ uid: uid, k: secretKey });
    online = true;
  } catch (e) {
    console.log("online:", e);
    setOnlineStatus(e.code === "permission-denied"
      ? "🔴 Этот ID уже занят другим телефоном. Перенеси прогресс через экспорт/импорт"
      : "🔴 Офлайн — проверь интернет");
    return;
  }
  setOnlineStatus(`🟢 Онлайн · ${profile.nick} (${playerId})`);
  pushPlayer(true);
  listenMyProfile();
  listenChat();
  listenDrops();
  listenRoyalties();
  listenRefs();
  sendReferral();
  listenTrades();    // trades.js
  listenDuels();     // trades.js
}

// ===== Мой профиль в базе (players/<ID>) =====
// Отправляем, только если что-то изменилось. force — отправить обязательно
function pushPlayer(force) {
  if (!online) return;
  const data = {
    nick: profile.nick, city: profile.city, avatar: profile.avatar, wear: game.wear,
    total: Math.floor(game.total), season: game.season, level: passLevel(),
    day: todayKey(), dayScore: game.dayKey === todayKey() ? Math.floor(game.dayEarned) : 0,
  };
  const text = JSON.stringify(data);
  if (!force && text === lastPushed) return;
  lastPushed = text;
  data.updated = serverTime();
  // merge — не трогаем поле thanks (его увеличивают другие игроки)
  db.collection("players").doc(playerId).set(data, { merge: true }).catch(e => console.log("push:", e));
}
setInterval(() => pushPlayer(false), 20000);   // раз в 20 секунд, если что-то поменялось

// сколько раз меня похвалили — показываем в профиле, о новых «спасибо» сообщаем
let myThanks = loadData("gazyava_thanks_seen", 0);
function listenMyProfile() {
  db.collection("players").doc(playerId).onSnapshot(doc => {
    const thanks = (doc.exists && doc.data().thanks) || 0;
    if (thanks > myThanks) toast(`🙏 Тебя похвалили! Всего «спасибо»: ${thanks}`);
    myThanks = thanks;
    saveData("gazyava_thanks_seen", thanks);
  }, () => {});
}

// ===== Топы =====
async function loadTops() {
  if (!online) { renderTops(); return; }
  document.getElementById("topList").innerHTML = '<div class="empty">Загружаю...</div>';
  try {
    const snap = await db.collection("players").orderBy("total", "desc").limit(300).get();
    playersCache = snap.docs.map(d => ({ ...d.data(), id: d.id }));
  } catch (e) {
    toast("Не загрузился топ, проверь интернет");
  }
  renderTops();
}

function renderTops() {
  const box = document.getElementById("topList");
  if (!online) { box.innerHTML = '<div class="empty">Топы работают только онлайн</div>'; return; }
  const today = todayKey(), season = seasonNumber();
  let rows = [];
  if (topMode === "day") {
    rows = playersCache.filter(p => p.day === today && p.dayScore > 0)
      .sort((a, b) => b.dayScore - a.dayScore).map(p => ({ p: p, value: fmt(p.dayScore) + " 🫧" }));
  } else if (topMode === "season") {
    rows = playersCache.filter(p => p.season === season)
      .sort((a, b) => b.total - a.total).map(p => ({ p: p, value: fmt(p.total) + " 🫧" }));
  } else if (topMode === "thanks") {
    rows = playersCache.filter(p => p.thanks > 0)
      .sort((a, b) => b.thanks - a.thanks).map(p => ({ p: p, value: p.thanks + " 🙏" }));
  } else {
    // города: складываем заработок всех игроков города за сезон
    const cities = {};
    for (const p of playersCache.filter(x => x.season === season)) {
      const c = cities[p.city] || (cities[p.city] = { city: p.city, total: 0, count: 0 });
      c.total += p.total;
      c.count++;
    }
    const list = Object.values(cities).sort((a, b) => b.total - a.total);
    box.innerHTML = list.length ? list.map((c, i) => `<div class="row">
        <span class="place">${i + 1}</span><span class="av">🏙️</span>
        <span class="who"><b>${esc(c.city)}</b><small>игроков: ${c.count}</small></span>
        <span class="value">${fmt(c.total)} 🫧</span></div>`).join("")
      : '<div class="empty">Пока пусто</div>';
    return;
  }

  box.innerHTML = rows.length ? "" : '<div class="empty">Пока пусто — будь первым!</div>';
  rows.slice(0, 50).forEach((row, i) => {
    const p = row.p;
    const el = document.createElement("div");
    el.className = "row" + (p.id === playerId ? " me" : "");
    el.innerHTML = `<span class="place">${i < 3 ? ["🥇", "🥈", "🥉"][i] : i + 1}</span>${avatarHTML(p.avatar, p.wear)}
      <span class="who"><b>${esc(p.nick)}</b><small>${p.id} · ${esc(p.city)} · ур. ${p.level || 0}</small></span>
      <span class="value">${row.value}</span>`;
    if (p.id !== playerId) {
      const acts = document.createElement("span");
      acts.className = "acts";
      acts.innerHTML = '<button class="mini">🙏</button><button class="mini">🤝</button><button class="mini">⚔️</button>';
      const [bThanks, bTrade, bDuel] = acts.querySelectorAll("button");
      bThanks.onclick = () => giveThanks(p);
      bTrade.onclick = () => startTradeWith(p.id);   // trades.js
      bDuel.onclick = () => startDuelWith(p.id);     // trades.js
      el.appendChild(acts);
    }
    box.appendChild(el);
  });
}

// ===== «Спасибо» =====
// Хвалить одного и того же игрока можно раз в день. Документ thanks/<кто>_<кого>_<день>
// одновременно увеличивает счётчик thanks в профиле того, кого хвалят
async function giveThanks(p) {
  if (!online) return;
  const tid = `${playerId}_${p.id}_${todayKey()}`;
  const batch = db.batch();
  batch.set(db.collection("thanks").doc(tid), { from: playerId, to: p.id, day: todayKey(), t: serverTime() });
  batch.update(db.collection("players").doc(p.id), { thanks: firebase.firestore.FieldValue.increment(1), lastThank: tid });
  try {
    await batch.commit();
    addStat("thanks");
    saveData("gazyava_clicker", game);
    p.thanks = (p.thanks || 0) + 1;
    toast(`🙏 Ты похвалил ${p.nick}!`);
    renderTops();
  } catch (e) {
    console.log("thanks:", e);
    toast("Сегодня ты уже хвалил этого игрока 🙂");
  }
}

// ===== Общий чат =====
function listenChat() {
  db.collection("chat").orderBy("t", "desc").limit(50).onSnapshot(snap => {
    const box = document.getElementById("chatList");
    const atBottom = box.scrollHeight - box.scrollTop - box.clientHeight < 60;
    box.innerHTML = "";
    const msgs = snap.docs.map(d => ({ ...d.data(), id: d.id })).reverse();   // старые сверху
    for (const m of msgs) {
      const el = document.createElement("div");
      el.className = "msg" + (m.pid === playerId ? " mine" : "");
      const time = m.t ? m.t.toDate().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }) : "";
      el.innerHTML = `${avatarHTML(m.avatar, "")}<div class="bubble-msg"><div class="mh"><b>${esc(m.nick)}</b>
        <small>${m.pid} · ${time}</small></div><div class="mt"></div></div>`;
      el.querySelector(".mt").textContent = m.text;   // текст сообщения — только через textContent
      if (m.pid === playerId) {
        const del = document.createElement("button");
        del.className = "mini del";
        del.textContent = "✖";
        del.onclick = () => { if (confirm("Удалить сообщение?")) db.collection("chat").doc(m.id).delete(); };
        el.querySelector(".mh").appendChild(del);
      }
      box.appendChild(el);
    }
    if (!msgs.length) box.innerHTML = '<div class="empty">Тут пока тихо. Напиши первым!</div>';
    if (atBottom) box.scrollTop = box.scrollHeight;   // листаем вниз, только если игрок и так был внизу
  }, () => {});
}

async function sendChat() {
  const input = document.getElementById("chatInput");
  const text = input.value.trim().slice(0, CHAT_MAX);
  if (!text) return;
  if (!online) { toast("Чат работает только онлайн"); return; }
  if (Date.now() - lastChatAt < CHAT_COOLDOWN) { toast("Не так быстро 🙂"); return; }
  lastChatAt = Date.now();
  input.value = "";
  try {
    await db.collection("chat").add({ pid: playerId, nick: profile.nick, avatar: profile.avatar, text: text, t: serverTime() });
    addStat("chat");
    saveData("gazyava_clicker", game);
    const box = document.getElementById("chatList");
    box.scrollTop = box.scrollHeight;
  } catch (e) {
    toast("Не отправилось 😢");
    input.value = text;
  }
}
document.getElementById("chatSend").onclick = sendChat;
document.getElementById("chatInput").onkeydown = (e) => { if (e.key === "Enter") sendChat(); };

// ===== Лента дропа (что редкое выбили игроки) =====
function sendDrop(it, c) {
  if (!online) return;
  db.collection("drops").add({
    pid: playerId, nick: profile.nick, s: it.s, r: it.r, m: it.m || 0, v: it.v, c: c.name, t: serverTime(),
  }).catch(() => {});
}

function listenDrops() {
  db.collection("drops").orderBy("t", "desc").limit(15).onSnapshot(snap => {
    const box = document.getElementById("dropFeed");
    box.innerHTML = "";
    for (const doc of snap.docs) {
      const d = doc.data();
      if (!SODAS[d.s] || !RARITIES[d.r]) continue;   // вдруг прилетело что-то странное
      const el = document.createElement("div");
      el.className = "drop";
      el.style.borderBottomColor = RARITIES[d.r].color;
      el.innerHTML = `<div class="bot mut${d.m}">${bottleSVG(SODAS[d.s], 34)}</div>
        <div class="dn"></div><div class="val">${fmt(d.v)}</div>`;
      el.querySelector(".dn").textContent = d.nick;
      el.title = `${d.nick}: ${SODAS[d.s].name} из кейса «${d.c}»`;
      el.onclick = () => toast(el.title);
      box.appendChild(el);
    }
    if (!snap.docs.length) box.innerHTML = '<div class="empty">Здесь появятся редкие дропы игроков</div>';
  }, () => {});
}

// ===== 15% владельцам именных кейсов =====
function sendRoyalty(c, count) {
  if (!online || c.owner === playerId) return;   // свой кейс — себе не платим
  db.collection("royalties").add({
    to: c.owner, from: playerId, amount: Math.floor(c.price * ROYALTY) * count, t: serverTime(),
  }).catch(e => console.log("royalty:", e));
}

function listenRoyalties() {
  db.collection("royalties").where("to", "==", playerId).onSnapshot(snap => {
    const done = loadData("gazyava_roy_done", []);   // защита от двойного начисления
    let sum = 0;
    for (const doc of snap.docs) {
      if (!done.includes(doc.id)) {
        done.push(doc.id);
        sum += doc.data().amount;
      }
      doc.ref.delete().catch(() => {});
    }
    saveData("gazyava_roy_done", done.slice(-100));
    if (sum > 0) {
      addBubbles(sum);
      saveData("gazyava_clicker", game);
      updateClicker();
      toast(`💼 Твой кейс открыли! +${fmt(sum)} 🫧`);
    }
  }, () => {});
}

// ===== Рефералы =====
// Новичок при регистрации вписал ID друга -> документ refs/<ID новичка> (второй раз не создать)
async function sendReferral() {
  if (!profile.ref || profile.refSent) return;
  try {
    await db.collection("refs").doc(playerId).set({ from: playerId, nick: profile.nick, to: profile.ref, t: serverTime() });
    game.bubbles += REF_BONUS_NEW;
    toast(`🤝 Бонус новичка по приглашению: +${fmt(REF_BONUS_NEW)} 🫧`);
  } catch (e) {
    console.log("ref:", e);   // уже отправляли раньше — ничего страшного
  }
  profile.refSent = true;
  saveData("gazyava_profile", profile);
  saveData("gazyava_clicker", game);
  updateClicker();
}

function listenRefs() {
  db.collection("refs").where("to", "==", playerId).onSnapshot(snap => {
    profile.refsDone = profile.refsDone || [];   // в профиле — чтобы новый сезон не выдал бонус повторно
    for (const doc of snap.docs) {
      if (profile.refsDone.includes(doc.id)) continue;
      profile.refsDone.push(doc.id);
      addBubbles(REF_BONUS);
      toast(`🤝 ${doc.data().nick} пришёл в игру по твоему ID! +${fmt(REF_BONUS)} 🫧`);
    }
    saveData("gazyava_profile", profile);
    saveData("gazyava_clicker", game);
    updateClicker();
  }, () => {});
}

// ===== Кнопки топов =====
document.querySelectorAll("#topModes button").forEach(b => {
  b.onclick = () => {
    topMode = b.dataset.mode;
    document.querySelectorAll("#topModes button").forEach(x => x.classList.toggle("on", x === b));
    renderTops();
  };
});
document.getElementById("topRefresh").onclick = loadTops;
