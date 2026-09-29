// ===== radar.js — вкладка «Локатор»: карта, радар, магазины, точки Газява Family =====

// ===== Настройки =====
const SEARCH_RADIUS = 1500;   // в каком радиусе ищем магазины, метров
const REFRESH_DISTANCE = 300; // если отошли дальше — ищем магазины заново, метров
const SWEEP_TIME = 4000;      // один оборот луча радара, мс
const GREEN = "57,255,20";    // цвет радара (r,g,b)
const GOLD = "255,212,0";     // цвет для «Магнита»
const CYAN = "0,229,255";     // точка Family, газява есть
const RED = "255,77,77";      // точка Family, газявы нет
const VISIT_BONUS = 500;      // сколько пузырей в кликер за посещение точки
const VISIT_DISTANCE = 100;   // отметить «Был тут» можно не дальше, метров

let map, canvas, ctx;
let me = null;           // где сейчас телефон: {lat, lon, heading}
let lastLoadPos = null;  // где последний раз искали магазины
let shops = [];          // найденные магазины: {name, lat, lon, dist, star, hit}
let loading = false;
let prevAngle = 0;       // угол луча на прошлом кадре

// карта: два вида — обычный (улицы хорошо видно) и зелёный «радарный»
let radarStyle = false;
let trail, accuracyCircle;   // след пройденного пути и круг точности GPS


document.getElementById("startBtn").onclick = start;
document.getElementById("mapBtn").onclick = toggleMapStyle;
document.getElementById("soundBtn").onclick = toggleSound;
document.getElementById("addBtn").onclick = () => openPointForm(null);

function start() {
  ensureAudio();
  document.getElementById("start").style.display = "none";

  // Карта: двигать пальцем нельзя (центр всегда — мы), приближать можно
  map = L.map("map", {
    zoomControl: false, dragging: false,
    touchZoom: "center", scrollWheelZoom: "center", doubleClickZoom: "center",
  }).setView([53.195, 50.1], 16);   // пока нет координат — центр Самары
  // карта OpenStreetMap — бесплатно и без ключа (радарный вид делается CSS-фильтром)
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "© OpenStreetMap", maxZoom: 19,
  }).addTo(map);

  // след пути и круг точности
  trail = L.polyline([], { color: "#39ff14", weight: 4, opacity: 0.8 }).addTo(map);
  accuracyCircle = L.circle([0, 0], { radius: 0, color: "#39ff14", weight: 1, fillOpacity: 0.08 }).addTo(map);

  canvas = document.getElementById("radar");
  ctx = canvas.getContext("2d");
  resize();
  window.addEventListener("resize", resize);

  if (!navigator.geolocation) {
    setStatus("Телефон не умеет определять местоположение 😢");
  } else {
    setStatus("Ищу спутники...");
    // watchPosition вызывает onPosition каждый раз, когда телефон сдвинулся
    navigator.geolocation.watchPosition(onPosition, onGeoError,
      { enableHighAccuracy: true, maximumAge: 5000 });
  }
  requestAnimationFrame(draw);
}

// ===== Геопозиция =====

function onPosition(pos) {
  const c = pos.coords;
  const old = me;
  me = { lat: c.latitude, lon: c.longitude, heading: old ? old.heading : null };
  // направление движения телефон сообщает, только когда мы идём
  if (c.heading !== null && !isNaN(c.heading) && c.speed > 0.5) me.heading = c.heading;

  map.setView([me.lat, me.lon], map.getZoom(), { animate: false });

  // добавляем точку в след, если сдвинулись хотя бы на 3 метра
  if (!old || distance(old, me) > 3) trail.addLatLng([me.lat, me.lon]);
  accuracyCircle.setLatLng([me.lat, me.lon]).setRadius(c.accuracy);
  document.getElementById("gps").textContent =
    `📍 ${me.lat.toFixed(5)}, ${me.lon.toFixed(5)}  точность ±${Math.round(c.accuracy)} м`;

  for (const s of shops) s.dist = distance(me, s);
  for (const p of points) p.dist = distance(me, p);
  updateList();
  updateStats();
  // первый раз или ушли далеко — ищем магазины заново
  if (!lastLoadPos || distance(me, lastLoadPos) > REFRESH_DISTANCE) loadShops();
}

function onGeoError(err) {
  if (err.code === 1) setStatus("Нет доступа к геопозиции. Разреши его в настройках Safari");
  else setStatus("Не могу поймать сигнал, пробую ещё...");
}

// ===== Поиск магазинов через Nominatim (OpenStreetMap, бесплатно, без ключа) =====

async function loadShops() {
  if (loading) return;
  loading = true;
  lastLoadPos = { ...me };
  setStatus("Сканирую местность...");

  // квадрат вокруг нас: сколько градусов в SEARCH_RADIUS метрах
  const dLat = SEARCH_RADIUS / 111320;
  const dLon = SEARCH_RADIUS / (111320 * Math.cos(me.lat * Math.PI / 180));
  const viewbox = [me.lon - dLon, me.lat + dLat, me.lon + dLon, me.lat - dLat].join(",");
  const url = "https://nominatim.openstreetmap.org/search?format=jsonv2&limit=50&bounded=1"
            + "&accept-language=ru&q=supermarket&viewbox=" + viewbox;
  try {
    const resp = await fetch(url);
    const data = await resp.json();
    shops = data.map(el => {
      const name = el.name || "Магазинчик";
      return {
        name: name,
        lat: Number(el.lat),            // координаты приходят строками
        lon: Number(el.lon),
        star: /магнит/i.test(name),     // «Магнит» подсвечиваем золотым
        hit: 0,                         // когда луч последний раз прошёл над магазином
      };
    });
    for (const s of shops) s.dist = distance(me, s);
    // квадрат шире круга — отбрасываем то, что дальше радиуса
    shops = shops.filter(s => s.dist <= SEARCH_RADIUS);
    updateList();
    setStatus(shops.length
      ? `«${SODAS[chosen].name}» обнаружен(а): ${shops.length} точек в радиусе ${SEARCH_RADIUS / 1000} км`
      : "Газявы поблизости нет... 😱");
  } catch (e) {
    setStatus("Радар барахлит (нет связи). Повторю через 15 секунд");
    setTimeout(() => { lastLoadPos = null; }, 15000);
  }
  loading = false;
}

// ===== Список ближайших точек =====

// в списке — магазины и точки Family вперемешку, по расстоянию
function updateList() {
  const nearPoints = points.filter(p => p.dist <= SEARCH_RADIUS);
  const all = shops.concat(nearPoints);
  all.sort((a, b) => a.dist - b.dist);
  const list = document.getElementById("list");
  list.innerHTML = "";
  for (const s of all.slice(0, 12)) {
    const isVisited = !!visited[placeKey(s)];
    const row = document.createElement("div");
    row.className = "shop" + (s.star ? " star" : "") + (s.user ? " user" : "") + (isVisited ? " visited" : "");

    // название (textContent, а не innerHTML — названия пишут пользователи, так безопаснее)
    const info = document.createElement("div");
    info.className = "nm";
    const name = document.createElement("div");
    name.textContent = (s.user ? "📌 " : s.star ? "⭐ " : "🥤 ") + s.name;
    info.appendChild(name);
    if (s.user) {
      const sub = document.createElement("div");
      sub.className = "sub";
      sub.textContent = pointStatus(s) + (s.note ? " · " + s.note : "") + " · " + ago(s.updated);
      info.appendChild(sub);
    }
    // нажатие: точка Family — окно с подробностями, магазин — маршрут в Яндекс Картах
    info.onclick = () => s.user ? openPointForm(s) : openRoute(s);

    const dist = document.createElement("span");
    dist.textContent = formatDist(s.dist);

    const btn = document.createElement("button");
    btn.className = "mini";
    btn.textContent = isVisited ? "✅" : "Был тут";
    btn.onclick = () => visitPlace(s);

    row.append(info, dist, btn);
    list.appendChild(row);
  }
}

function openRoute(s) {
  window.open(`https://yandex.ru/maps/?rtext=~${s.lat},${s.lon}&rtt=pd`, "_blank");
}

// ===== Рисование радара (60 раз в секунду) =====

function draw(time) {
  requestAnimationFrame(draw);
  const w = canvas.clientWidth, h = canvas.clientHeight;
  ctx.clearRect(0, 0, w, h);

  // центр радара — наша точка на карте (или центр экрана, пока координат нет)
  const c = me ? map.latLngToContainerPoint([me.lat, me.lon]) : { x: w / 2, y: h / 2 };
  const R = Math.min(w, h) / 2 * 0.9;                             // радиус радара в пикселях
  const angle = (time % SWEEP_TIME) / SWEEP_TIME * Math.PI * 2;   // куда смотрит луч

  // кольца и перекрестие
  ctx.strokeStyle = `rgba(${GREEN},0.35)`;
  ctx.lineWidth = 1;
  ctx.fillStyle = `rgba(${GREEN},0.7)`;
  ctx.font = "11px Courier New";
  const radiusMeters = map.distance(map.containerPointToLatLng([c.x, c.y]),
                                    map.containerPointToLatLng([c.x + R, c.y]));
  for (let i = 1; i <= 3; i++) {
    ctx.beginPath();
    ctx.arc(c.x, c.y, R * i / 3, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillText(formatDist(radiusMeters * i / 3), c.x + 4, c.y - R * i / 3 + 12);
  }
  ctx.beginPath();
  ctx.moveTo(c.x - R, c.y); ctx.lineTo(c.x + R, c.y);
  ctx.moveTo(c.x, c.y - R); ctx.lineTo(c.x, c.y + R);
  ctx.stroke();

  // «хвост» за лучом: несколько секторов, каждый прозрачнее предыдущего
  const TRAIL = 0.7, STEPS = 20;
  for (let i = 0; i < STEPS; i++) {
    ctx.fillStyle = `rgba(${GREEN},${0.25 * (1 - i / STEPS)})`;
    ctx.beginPath();
    ctx.moveTo(c.x, c.y);
    ctx.arc(c.x, c.y, R, angle - TRAIL * (i + 1) / STEPS, angle - TRAIL * i / STEPS);
    ctx.closePath();
    ctx.fill();
  }
  // сам луч
  ctx.strokeStyle = `rgba(${GREEN},1)`;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(c.x, c.y);
  ctx.lineTo(c.x + R * Math.cos(angle), c.y + R * Math.sin(angle));
  ctx.stroke();

  // новый оборот луча — снова можно сыграть «пинг» подлодки
  if (angle < prevAngle) pingedThisTurn = false;

  // магазины и точки Family: вспыхивают, когда луч проходит над ними, и потом гаснут
  let beep = false;
  for (const s of shops.concat(points)) {
    const p = map.latLngToContainerPoint([s.lat, s.lon]);
    const dx = p.x - c.x, dy = p.y - c.y;
    if (Math.hypot(dx, dy) > R) continue;           // за краем радара — не видно
    let a = Math.atan2(dy, dx);
    if (a < 0) a += Math.PI * 2;
    if (beamPassed(prevAngle, angle, a)) { s.hit = time; beep = true; }

    const age = (time - s.hit) / SWEEP_TIME;         // 0 — только что, 1 — оборот назад
    if (s.hit && age < 1) {
      const alpha = 1 - age;
      let color = s.star ? GOLD : GREEN;
      let label = s.name;
      if (s.user) {
        color = s.has ? CYAN : RED;
        label += s.has ? (s.cold ? " 🧊" : " 🌡️") : " ❌";
      }
      if (visited[placeKey(s)]) label += " ✅";
      ctx.fillStyle = `rgba(${color},${alpha})`;
      ctx.shadowColor = `rgb(${color})`;
      ctx.shadowBlur = 15 * alpha;
      ctx.beginPath();
      ctx.arc(p.x, p.y, s.star || s.user ? 8 : 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.font = "12px Courier New";
      ctx.fillText(label, p.x + 10, p.y + 4);
    }
  }
  if (beep) onGazyavaFound(time);
  prevAngle = angle;

  // мы — пульсирующая точка в центре
  if (me) {
    const pulse = 5 + 3 * Math.sin(time / 200);
    ctx.fillStyle = "#fff";
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(c.x, c.y, pulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // стрелка — куда идём (heading: 0 = север, по часовой)
    if (me.heading !== null) {
      const h = (me.heading - 90) * Math.PI / 180;   // переводим в угол холста (0 = восток)
      ctx.fillStyle = "#39ff14";
      ctx.beginPath();
      ctx.moveTo(c.x + 22 * Math.cos(h), c.y + 22 * Math.sin(h));        // кончик
      ctx.lineTo(c.x + 10 * Math.cos(h + 2.5), c.y + 10 * Math.sin(h + 2.5));
      ctx.lineTo(c.x + 10 * Math.cos(h - 2.5), c.y + 10 * Math.sin(h - 2.5));
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
  }
}

// прошёл ли луч над углом a между прошлым и текущим кадром
function beamPassed(prev, cur, a) {
  if (prev <= cur) return a > prev && a <= cur;
  return a > prev || a <= cur;   // луч перешёл через 0 (новый оборот)
}


// ===== Кнопки =====

function toggleMapStyle() {
  radarStyle = !radarStyle;
  // карта та же, меняется только CSS-класс с фильтром цвета
  document.getElementById("map").classList.toggle("radar-style", radarStyle);
}

function toggleSound() {
  soundOn = !soundOn;
  document.getElementById("soundBtn").textContent = soundOn ? "🔊" : "🔇";
}

// ===== Точки «Газява Family» (ларьки, киоски — добавляют сами пользователи) =====
// Конфиг проекта из консоли Firebase (инструкция в FIREBASE.txt).
// Если поставить null — точки будут храниться только на этом телефоне.
// apiKey не секретный: доступ к базе ограничивают правила Firestore
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyCU-WCNy0G3ReJrpfM9BVeAjc6NwaboyUo",
  authDomain: "gazyava-3df89.firebaseapp.com",
  projectId: "gazyava-3df89",
  storageBucket: "gazyava-3df89.firebasestorage.app",
  messagingSenderId: "147703321092",
  appId: "1:147703321092:web:7ab29b9c1eced85c491b51",
};

let db = null;        // облачная база Firestore (если подключена)
let points = [];      // точки: {id, name, lat, lon, has, cold, note, updated}
let editing = null;   // какую точку открыли в окне (null — новая)
let formHas = true;   // что выбрано в окне: газява есть?
let formCold = true;  // холодная?

function initPoints() {
  if (FIREBASE_CONFIG && window.firebase) {
    firebase.initializeApp(FIREBASE_CONFIG);
    db = firebase.firestore();
    // onSnapshot — база сама присылает изменения, как только кто-то добавил или поменял точку
    db.collection("points").limit(500).onSnapshot(snap => {
      points = snap.docs.map(doc => ({ ...doc.data(), id: doc.id }));
      onPointsChanged();
    }, () => toast("Не могу загрузить точки Газява Family 😢"));
    listenGrants();   // выдачи пузырей от админа
  } else {
    points = loadData("gazyava_points", []);
    onPointsChanged();
  }
}

// точки обновились — пересчитываем расстояния и перерисовываем список
function onPointsChanged() {
  for (const p of points) {
    p.user = true;        // отличаем точку Family от магазина из Nominatim
    p.hit = p.hit || 0;
    if (me) p.dist = distance(me, p);
  }
  updateList();
  updateStats();
}

// только данные точки (без служебных dist, hit) — это и сохраняем
function pointFields(p) {
  return { name: p.name, lat: p.lat, lon: p.lon, has: p.has, cold: p.cold, note: p.note, updated: p.updated };
}

function pointStatus(p) {
  if (!p.has) return "❌ газявы нет";
  return p.cold ? "✅ есть · 🧊 холодная" : "✅ есть · 🌡️ тёплая";
}

function openPointForm(p) {
  if (!p && !me) { toast("Сначала дождись геопозиции 📡"); return; }
  editing = p;
  document.getElementById("formTitle").textContent = p ? "📌 " + p.name : "📍 Новая точка";
  document.getElementById("formInfo").textContent = p
    ? `Обновлено ${ago(p.updated)}` + (p.dist !== undefined ? ` · ${formatDist(p.dist)} от тебя` : "")
    : "Точка встанет там, где ты сейчас стоишь";
  document.getElementById("fName").value = p ? p.name : "";
  document.getElementById("fNote").value = p ? (p.note || "") : "";
  formHas = p ? p.has : true;
  formCold = p ? p.cold : true;
  // «Маршрут» и «Удалить» нужны только для уже существующей точки
  document.getElementById("fRoute").style.display = p ? "" : "none";
  document.getElementById("fDelete").style.display = p ? "" : "none";
  updateFormButtons();
  document.getElementById("pointForm").classList.add("show");
}

function closePointForm() {
  document.getElementById("pointForm").classList.remove("show");
}

// подсвечиваем выбранные варианты; если газявы нет — «холодная/тёплая» прячем
function updateFormButtons() {
  document.getElementById("hasYes").classList.toggle("on", formHas);
  document.getElementById("hasNo").classList.toggle("on", !formHas);
  document.getElementById("coldBtn").classList.toggle("on", formCold);
  document.getElementById("warmBtn").classList.toggle("on", !formCold);
  document.getElementById("tempBox").style.display = formHas ? "" : "none";
}

function savePoint() {
  const name = document.getElementById("fName").value.trim().slice(0, 40);
  if (!name) { toast("Напиши название точки"); return; }
  const isNew = !editing;
  const data = {
    name: name,
    note: document.getElementById("fNote").value.trim().slice(0, 60),
    has: formHas,
    cold: formCold,
    updated: Date.now(),                 // когда последний раз проверяли
    lat: isNew ? me.lat : editing.lat,   // новая точка — там, где мы стоим
    lon: isNew ? me.lon : editing.lon,
  };

  if (db) {
    const req = isNew ? db.collection("points").add(data)
                      : db.collection("points").doc(editing.id).set(data);
    req.catch(() => toast("Не сохранилось, проверь интернет"));
  } else {
    if (isNew) points.push({ id: "p" + Date.now(), ...data });
    else Object.assign(editing, data);
    saveLocalPoints();
    onPointsChanged();
  }

  if (isNew) {
    game.pointsAdded++;
    saveData("gazyava_clicker", game);
    checkAchievements();
  }
  closePointForm();
  toast(isNew ? "Точка добавлена! Спасибо, картограф 🗺️" : "Точка обновлена 👍");
}

function deletePoint() {
  if (!confirm(`Удалить точку «${editing.name}»?`)) return;
  if (db) {
    db.collection("points").doc(editing.id).delete().catch(() => toast("Не удалилось, проверь интернет"));
  } else {
    points = points.filter(p => p !== editing);
    saveLocalPoints();
    onPointsChanged();
  }
  closePointForm();
}

function saveLocalPoints() {
  saveData("gazyava_points", points.map(p => ({ id: p.id, ...pointFields(p) })));
}

// кнопки окна точки
document.getElementById("hasYes").onclick = () => { formHas = true; updateFormButtons(); };
document.getElementById("hasNo").onclick = () => { formHas = false; updateFormButtons(); };
document.getElementById("coldBtn").onclick = () => { formCold = true; updateFormButtons(); };
document.getElementById("warmBtn").onclick = () => { formCold = false; updateFormButtons(); };
document.getElementById("fSave").onclick = savePoint;
document.getElementById("fCancel").onclick = closePointForm;
document.getElementById("fRoute").onclick = () => openRoute(editing);
document.getElementById("fDelete").onclick = deletePoint;

// ===== Посещённые места («Был тут») =====
// ключ места: у точки Family — её id, у магазина — координаты
let visited = loadData("gazyava_visited", {});

function placeKey(s) {
  return s.id || s.lat.toFixed(5) + "," + s.lon.toFixed(5);
}
function visitedCount() {
  return Object.keys(visited).length;
}

function visitPlace(s) {
  const key = placeKey(s);
  if (visited[key]) { toast("Ты тут уже был ✅"); return; }
  // защита от читов: отметиться можно, только если реально стоишь рядом
  if (!(s.dist <= VISIT_DISTANCE)) { toast(`Подойди ближе — нужно быть в ${VISIT_DISTANCE} м от точки`); return; }
  visited[key] = Date.now();
  saveData("gazyava_visited", visited);
  addBubbles(VISIT_BONUS);
  addStat("visits");   // для испытаний батл-пасса
  saveData("gazyava_clicker", game);
  updateClicker();
  toast(`✅ «${s.name}» посещён! +${VISIT_BONUS} 🫧 в кликер`);
  updateList();
  updateStats();
}

function updateStats() {
  const near = points.filter(p => p.dist <= SEARCH_RADIUS).length;
  document.getElementById("stats").textContent =
    `✅ Посещено: ${visitedCount()} · 📌 Точек Family рядом: ${near}`;
}
