// ===== profile.js — профиль, регистрация, сохранение кодом, админка =====

// Профиль хранится отдельно от игры (ключ gazyava_profile), чтобы сброс прогресса его не трогал:
// {nick, city, avatar, ref — ID пригласившего друга, promo — промокод уже активирован, created — дата}
let profile = loadData("gazyava_profile", null);

const AVATARS = ["🥤", "🫧", "🧃", "🍾", "🥫", "🧋", "🐸", "🐱", "🐶", "🦊", "🐼", "🐧",
                 "🦖", "👽", "🤖", "😎", "🤠", "🥷", "👑", "💀", "🦄", "🐙", "🐝", "🔥"];
const CITIES = ["Самара", "Тольятти", "Сызрань", "Новокуйбышевск", "Чапаевск", "Жигулёвск",
                "Москва", "Санкт-Петербург", "Казань", "Уфа", "Оренбург", "Саратов", "Ульяновск", "Пенза"];

// Промокод. В коде лежит не само слово, а его «отпечаток» SHA-256:
// из отпечатка слово обратно не получить, поэтому подсмотреть промокод в исходнике нельзя
const PROMO_HASH = "a9fbccf6f09d31ade0da76e86d511051bfd70613c21b12a637ee33fc6e22fbbb";
const PROMO_BONUS = 100000;

let regAvatar = AVATARS[0];   // какой аватар выбран в окне регистрации

// ===== Окно регистрации =====
// Первый раз — регистрация (с промокодом и ID друга), потом — просто изменение ника, города, аватара
function openRegister() {
  const isNew = !profile;
  regAvatar = isNew ? AVATARS[0] : profile.avatar;
  document.getElementById("regTitle").textContent = isNew ? "🥤 Добро пожаловать!" : "✏️ Изменить профиль";
  document.getElementById("regInfo").textContent = isNew ? "Заполни профиль — так тебя увидят в топах" : "";
  document.getElementById("regNick").value = isNew ? "" : profile.nick;
  document.getElementById("regCity").value = isNew ? "" : profile.city;
  document.getElementById("regPromo").value = "";
  document.getElementById("regRef").value = "";
  document.getElementById("regExtra").style.display = isNew ? "" : "none";    // промокод и друг — только при регистрации
  document.getElementById("regCancel").style.display = isNew ? "none" : "";  // при регистрации отменить нельзя
  renderAvatarChoice();
  document.getElementById("register").classList.add("show");
}

function renderAvatarChoice() {
  const box = document.getElementById("regAvatars");
  box.innerHTML = "";
  for (const a of AVATARS) {
    const b = document.createElement("button");
    b.textContent = a;
    b.className = a === regAvatar ? "on" : "";
    b.onclick = () => { regAvatar = a; renderAvatarChoice(); };
    box.appendChild(b);
  }
}

// «самара  » -> «Самара»: убираем лишние пробелы, каждое слово с большой буквы
function normCity(text) {
  return text.trim().replace(/\s+/g, " ").split(" ")
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
}

// отпечаток SHA-256 строки в виде 64 шестнадцатеричных символов
async function sha256(text) {
  const bytes = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, "0")).join("");
}

async function saveRegister() {
  const nick = document.getElementById("regNick").value.trim().replace(/\s+/g, " ");
  const city = normCity(document.getElementById("regCity").value);
  const ref = document.getElementById("regRef").value.trim().toUpperCase();
  // промокод: без пробелов, большими буквами, Ё = Е — чтобы не мучиться с раскладкой
  const promo = document.getElementById("regPromo").value.replace(/\s/g, "").toUpperCase().replace(/Ё/g, "Е");

  if (nick.length < 2) { toast("Ник — минимум 2 символа"); return; }
  if (city.length < 2) { toast("Напиши свой город"); return; }

  if (profile) {   // просто изменение профиля
    profile.nick = nick;
    profile.city = city;
    profile.avatar = regAvatar;
    finishRegister("Профиль сохранён 👍");
    return;
  }

  // новая регистрация: проверяем ID друга и промокод
  if (ref && (ref.length !== 6 || ref === playerId)) { toast("ID друга — 6 символов, и не твой собственный"); return; }
  let promoOk = false;
  if (promo) {
    if (!window.crypto || !crypto.subtle) { toast("Промокод работает только на сайте (https)"); return; }
    promoOk = (await sha256(promo)) === PROMO_HASH;
    if (!promoOk) { toast("Промокод не подошёл 😢 Проверь или оставь поле пустым"); return; }
  }

  profile = { nick: nick, city: city, avatar: regAvatar, ref: ref, promo: promoOk, created: Date.now() };
  if (promoOk) {
    game.bubbles += PROMO_BONUS;   // подарок идёт на баланс, но не в «всего собрано» (звание не растёт)
    saveData("gazyava_clicker", game);
  }
  finishRegister(promoOk ? `🎁 Промокод активирован: +${fmt(PROMO_BONUS)} 🫧` : `Привет, ${nick}! 🥤`);
}

function finishRegister(message) {
  saveData("gazyava_profile", profile);
  document.getElementById("register").classList.remove("show");
  renderProfile();
  updateClicker();
  toast(message);
}

document.getElementById("regSave").onclick = saveRegister;
document.getElementById("regCancel").onclick = () => document.getElementById("register").classList.remove("show");
document.getElementById("pEdit").onclick = openRegister;

// подсказки городов в поле «Город»
document.getElementById("cityList").innerHTML = CITIES.map(c => `<option value="${c}">`).join("");

// ===== Вкладка «Профиль» =====
function renderProfile() {
  if (!profile) return;
  document.getElementById("pAvatar").textContent = profile.avatar;
  // ник и город пишет сам игрок — выводим через textContent, а не innerHTML (так безопаснее)
  document.getElementById("pNick").textContent = profile.nick;
  document.getElementById("pInfo").textContent = `🆔 ${playerId} · 📍 ${profile.city}`;

  // самый дорогой предмет в инвентаре
  let best = null;
  for (const it of game.inv) if (!best || it.v > best.v) best = it;

  let rank = RANKS[0][1];
  for (const [need, name] of RANKS) if (game.total >= need) rank = name;

  const stats = [
    ["🫧", "Баланс", fmt(game.bubbles)],
    ["💎", "Всего собрано", fmt(game.total)],
    ["🏅", "Звание", rank],
    ["👆", "Кликов", fmt(game.clicks)],
    ["📦", "Кейсов открыто", fmt(game.casesOpened)],
    ["⬆️", "Удачных апгрейдов", fmt(game.upgradesWon)],
    ["🎒", "Предметов", fmt(game.inv.length)],
    ["⭐", "Лучший предмет", best ? `${SODAS[best.s].name} (${fmt(best.v)})` : "—"],
    ["🏆", "Достижения", `${Object.keys(game.ach).length} из ${ACHIEVEMENTS.length}`],
    ["🎯", "Рекорд «Поймай пузырь»", game.bestCatch],
    ["📅", "В игре с", new Date(profile.created).toLocaleDateString("ru-RU")],
    ["🤝", "Позвал в игру", profile.ref || "—"],
  ];
  document.getElementById("pStats").innerHTML = stats.map(([ico, label, value]) =>
    `<div class="pstat"><span class="ico">${ico}</span><span class="lbl">${label}</span><b>${value}</b></div>`).join("");
}

// нажали на ID — копируем его, чтобы отправить другу
document.getElementById("pInfo").onclick = () => copyText(playerId, "ID скопирован: " + playerId);

// пока открыт профиль — обновляем цифры раз в секунду (баланс растёт от автокликов)
setInterval(() => {
  if (document.getElementById("tab-profile").classList.contains("active")) renderProfile();
}, 1000);

// ===== Экспорт / импорт сохранения =====
// Код = все ключи localStorage, начинающиеся на gazyava_, упакованные в JSON и base64.
// Пароль админа в код НЕ попадает. GZ1: в начале — чтобы узнать «свой» код
const SAVE_PREFIX = "GZ1:";

function makeSaveCode() {
  saveData("gazyava_clicker", game);   // сначала сохраняем самое свежее
  const data = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key.startsWith("gazyava_") && key !== "gazyava_admin_pass") data[key] = localStorage.getItem(key);
  }
  // btoa понимает только латиницу, поэтому русские буквы сначала переводим в %D0%B0 (encodeURIComponent)
  return SAVE_PREFIX + btoa(unescape(encodeURIComponent(JSON.stringify(data))));
}

// обратное превращение; если код испорчен — вернёт null
function readSaveCode(code) {
  code = code.trim();
  if (!code.startsWith(SAVE_PREFIX)) return null;
  try {
    const data = JSON.parse(decodeURIComponent(escape(atob(code.slice(SAVE_PREFIX.length)))));
    return data.gazyava_clicker ? data : null;
  } catch (e) {
    return null;
  }
}

function openSaveBox(isExport) {
  document.getElementById("saveTitle").textContent = isExport ? "📤 Экспорт прогресса" : "📥 Импорт прогресса";
  document.getElementById("saveInfo").textContent = isExport
    ? "Скопируй код и сохрани в заметки. Никому не отправляй — по нему можно забрать твой прогресс."
    : "Вставь код из экспорта. Текущий прогресс на этом телефоне заменится!";
  const area = document.getElementById("saveCode");
  area.value = isExport ? makeSaveCode() : "";
  area.readOnly = isExport;
  document.getElementById("saveCopy").style.display = isExport ? "" : "none";
  document.getElementById("saveApply").style.display = isExport ? "none" : "";
  document.getElementById("saveBox").classList.add("show");
}

function applySaveCode() {
  const data = readSaveCode(document.getElementById("saveCode").value);
  if (!data) { toast("Код не подходит 😢 Скопируй его целиком"); return; }
  if (!confirm("Загрузить прогресс из кода? Всё, что сейчас на этом телефоне, заменится.")) return;
  for (const key in data) {
    if (key.startsWith("gazyava_")) localStorage.setItem(key, data[key]);
  }
  // автосохранение (раз в 2 секунды и при закрытии страницы) записывает переменную game —
  // подменяем и её, иначе старая игра перезапишет загруженную
  game = JSON.parse(data.gazyava_clicker);
  location.reload();   // перезапускаем игру уже с новым прогрессом
}

// копирование в буфер: новый способ (clipboard) и запасной (выделить текст + copy)
function copyText(text, message) {
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(text).then(() => toast(message), () => toast("Не скопировалось — выдели вручную"));
  } else {
    const area = document.getElementById("saveCode");
    area.value = text;
    area.select();
    document.execCommand("copy");
    toast(message);
  }
}

document.getElementById("pExport").onclick = () => openSaveBox(true);
document.getElementById("pImport").onclick = () => openSaveBox(false);
document.getElementById("saveCopy").onclick = () =>
  copyText(document.getElementById("saveCode").value, "Код скопирован 📋 Сохрани его в заметки");
document.getElementById("saveApply").onclick = applySaveCode;
document.getElementById("saveClose").onclick = () => document.getElementById("saveBox").classList.remove("show");

// ===== Админка =====
// Друг сообщает тебе свой ID, ты выдаёшь или забираешь пузыри через админку.
document.getElementById("myId").textContent = "🆔 Твой ID: " + playerId;

// Выдачи лежат в Firestore, коллекция grants: {pid: ID игрока, amount: сколько (минус — забрать), t: время}.
// Телефон игрока следит за своими выдачами, начисляет их и удаляет из базы.
function listenGrants() {
  // includeMetadataChanges — чтобы узнать, когда сервер подтвердил запись
  db.collection("grants").where("pid", "==", playerId).onSnapshot({ includeMetadataChanges: true }, snap => {
    if (snap.metadata.hasPendingWrites) return;   // запись ещё не подтверждена сервером — ждём
    const done = loadData("gazyava_grants_done", []);   // id уже начисленных выдач (защита от двойного начисления)
    for (const doc of snap.docs) {
      if (!done.includes(doc.id)) {
        done.push(doc.id);
        applyGrant(doc.data().amount);
      }
      doc.ref.delete().catch(() => {});
    }
    saveData("gazyava_grants_done", done.slice(-50));   // помним только последние 50
  }, () => {});
}

function applyGrant(amount) {
  game.bubbles = Math.max(0, game.bubbles + amount);   // забрать больше, чем есть, нельзя — останется 0
  saveData("gazyava_clicker", game);
  updateClicker();
  toast(amount >= 0 ? `🎁 Админ выдал тебе +${fmt(amount)} 🫧` : `👮 Админ забрал у тебя ${fmt(-amount)} 🫧`);
}

// Секретный вход: 5 нажатий на заголовок кликера за 2 секунды
let titleTaps = [];
document.getElementById("clickerTitle").onclick = () => {
  const now = Date.now();
  titleTaps = titleTaps.filter(t => now - t < 2000);
  titleTaps.push(now);
  if (titleTaps.length >= 5) {
    titleTaps = [];
    document.getElementById("aPass").value = loadData("gazyava_admin_pass", "");
    document.getElementById("adminPanel").classList.add("show");
  }
};

// Как проверяется пароль: вместе с выдачей пишем документ proofs/<пароль>.
// Правила Firestore разрешают такую запись, только если пароль верный (он есть только в правилах, не в коде).
// Обе записи идут одним пакетом (batch): если пароль неверный, не сохранится ничего.
async function adminSend(sign) {
  const pid = document.getElementById("aId").value.trim().toUpperCase();
  const amount = Math.round(Number(document.getElementById("aAmount").value));
  const pass = document.getElementById("aPass").value.trim();
  if (!db) { toast("Админка работает только с Firebase"); return; }
  if (pid.length !== 6) { toast("ID игрока — 6 символов"); return; }
  if (!(amount > 0)) { toast("Введи количество больше нуля"); return; }
  if (!pass || pass.includes("/")) { toast("Введи пароль админа"); return; }

  const now = firebase.firestore.FieldValue.serverTimestamp();   // время ставит сервер, подделать нельзя
  const batch = db.batch();
  batch.set(db.collection("proofs").doc(pass), { t: now });
  batch.set(db.collection("grants").doc(), { pid: pid, amount: sign * amount, t: now });
  toast("Отправляю...");
  try {
    await batch.commit();
    saveData("gazyava_admin_pass", pass);   // запоминаем пароль на этом телефоне
    toast(sign > 0 ? `✅ Выдано ${fmt(amount)} 🫧 игроку ${pid}` : `✅ Забрано ${fmt(amount)} 🫧 у игрока ${pid}`);
  } catch (e) {
    toast("❌ Неверный пароль (или нет интернета)");
  }
}

document.getElementById("aGive").onclick = () => adminSend(1);
document.getElementById("aTake").onclick = () => adminSend(-1);
document.getElementById("aMe").onclick = () => { document.getElementById("aId").value = playerId; };
document.getElementById("aClose").onclick = () => document.getElementById("adminPanel").classList.remove("show");
