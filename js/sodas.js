// ===== sodas.js — вкладка «Ассортимент»: 20 газяв, бутылки, газява дня =====

// liquid — цвет напитка, label — этикетка, cap — крышка, fizz — газированность 1..5

const SODAS = [
  { name: "Байкал", taste: "травы, эвкалипт, лакрица", desc: "Советская легенда. Пахнет лесом и детством.", liquid: "#3b1f0e", label: "#1f5fbf", cap: "#c0392b", fizz: 4 },
  { name: "Тархун", taste: "эстрагон", desc: "Зелёный, как радар. Идеальная маскировка.", liquid: "#2ecc40", label: "#0b6623", cap: "#e0e0e0", fizz: 4 },
  { name: "Буратино", taste: "лимон и карамель", desc: "Золотой ключик от хорошего настроения.", liquid: "#e8a317", label: "#d35400", cap: "#c0392b", fizz: 3 },
  { name: "Дюшес", taste: "груша", desc: "Грушевый вкус, который помнят все бабушки.", liquid: "#f4d03f", label: "#27ae60", cap: "#f1c40f", fizz: 3 },
  { name: "Крем-сода", taste: "ваниль и сливки", desc: "Как мороженое, только с пузырьками.", liquid: "#f9e79f", label: "#e91e63", cap: "#ffffff", fizz: 3 },
  { name: "Лимонад", taste: "лимон и сахар", desc: "Классика из стеклянной бутылки.", liquid: "#fdf2c0", label: "#f1c40f", cap: "#27ae60", fizz: 3 },
  { name: "Добрый Кола", taste: "кола", desc: "Главная кола на наших полках.", liquid: "#2a120a", label: "#d32f2f", cap: "#d32f2f", fizz: 4 },
  { name: "Добрый Апельсин", taste: "апельсин", desc: "Оранжевое настроение по акции.", liquid: "#ff8c00", label: "#1565c0", cap: "#ff8c00", fizz: 4 },
  { name: "Добрый Лимон-лайм", taste: "лимон и лайм", desc: "Прозрачный и освежающий.", liquid: "#e8f8e0", label: "#43a047", cap: "#43a047", fizz: 4 },
  { name: "Coca-Cola", taste: "кола", desc: "Та самая. Импорт — ищи внимательно.", liquid: "#2a120a", label: "#e10600", cap: "#e10600", fizz: 5 },
  { name: "Pepsi", taste: "кола", desc: "Вечный соперник из синей банды.", liquid: "#2a120a", label: "#004b93", cap: "#004b93", fizz: 4 },
  { name: "Fanta", taste: "апельсин", desc: "Ярче, чем закат над Волгой.", liquid: "#ff7f00", label: "#1e40af", cap: "#1e40af", fizz: 4 },
  { name: "Sprite", taste: "лимон и лайм", desc: "Не дай себе засохнуть!", liquid: "#e6f7ea", label: "#00843d", cap: "#00843d", fizz: 5 },
  { name: "Mountain Dew", taste: "цитрус", desc: "Неоновый заряд бодрости.", liquid: "#b5e61d", label: "#0b3d0b", cap: "#0b3d0b", fizz: 5 },
  { name: "Schweppes Tonic", taste: "горький хинин", desc: "Для тех, кто любит погорчее.", liquid: "#f0f8ff", label: "#f4c430", cap: "#f4c430", fizz: 5 },
  { name: "Laimon Fresh", taste: "лимон, лайм, мята", desc: "Лимон и мята — свежесть в квадрате.", liquid: "#d4f5a8", label: "#1b5e20", cap: "#ffeb3b", fizz: 4 },
  { name: "Боржоми", taste: "солёная минералка", desc: "Пей, пока не поздно.", liquid: "#dff3ff", label: "#1a237e", cap: "#1a237e", fizz: 4 },
  { name: "Ессентуки №17", taste: "очень солёная", desc: "Только для настоящих ценителей.", liquid: "#dff3ff", label: "#0d47a1", cap: "#90caf9", fizz: 3 },
  { name: "Нарзан", taste: "минеральная", desc: "Кавказская вода с характером.", liquid: "#e3f2fd", label: "#2e7d32", cap: "#2e7d32", fizz: 4 },
  { name: "Святой Источник", taste: "просто вода с газом", desc: "Чистая газява без лишнего.", liquid: "#eaf6ff", label: "#29b6f6", cap: "#0288d1", fizz: 3 },
];

// Обычных газяв 20 — только они есть в «Ассортименте» и в кликере.
// Дальше в тот же массив добавляем напитки, которые бывают только в кейсах
// (номера у старых газяв не меняются, поэтому старые сохранения не ломаются)
const BASE_COUNT = SODAS.length;

// Энергетики, которые продаются в Самаре. can: true — рисуем банку, а не бутылку
const ENERGY = [
  { name: "Adrenaline Rush", taste: "энергия", desc: "Классика заправок.", liquid: "#f5f5f5", label: "#111", cap: "#e53935", can: true },
  { name: "Burn", taste: "энергия", desc: "Горит, но не обжигает.", liquid: "#ff6d00", label: "#b71c1c", cap: "#ffab00", can: true },
  { name: "Flash Up", taste: "энергия", desc: "Вспышка по цене булки.", liquid: "#1e88e5", label: "#fdd835", cap: "#fdd835", can: true },
  { name: "Gorilla", taste: "энергия", desc: "Сила примата в банке.", liquid: "#212121", label: "#43a047", cap: "#43a047", can: true },
  { name: "Tornado", taste: "энергия", desc: "Сдувает сон за минуту.", liquid: "#6d4c41", label: "#ffb300", cap: "#ff7043", can: true },
  { name: "Drive Me", taste: "энергия", desc: "Для тех, кто за рулём сессии.", liquid: "#8e24aa", label: "#00e5ff", cap: "#00e5ff", can: true },
  { name: "Lit Energy", taste: "энергия", desc: "Модный, как кроссовки.", liquid: "#00c853", label: "#000", cap: "#76ff03", can: true },
  { name: "Volt", taste: "энергия", desc: "220 вольт в каждом глотке.", liquid: "#ffea00", label: "#263238", cap: "#ffea00", can: true },
  { name: "Monster", taste: "энергия", desc: "Когти на банке — не просто так.", liquid: "#1b1b1b", label: "#76ff03", cap: "#76ff03", can: true },
  { name: "Red Bull", taste: "энергия", desc: "Окрыляет. Редкий гость на полках.", liquid: "#1565c0", label: "#c0c0c0", cap: "#e53935", can: true },
];

// Кейс Ильи Калашникова «Маленькие радости» (названия придумали ребята)
// shape — форма бутылки (см. SHAPES ниже), icon — значок на этикетке, stroke — цвет обводки
const LEGEND_GOLD = "#ffd700";   // обводка легендарных
const ILYA_SODAS = [
  { name: "Газировка «Автомат выдал сдачу»", desc: "Вкус металла и надежды.", liquid: "#b0bec5", label: "#607d8b", cap: "#cfd8dc", shape: "glass", icon: "💰" },
  { name: "Лимонад «Сосед сверлит по расписанию»", desc: "Слышно только с 9 до 18, выходные свято.", liquid: "#fff59d", label: "#8d6e63", cap: "#ffca28", shape: "stout", icon: "🔨" },
  { name: "Кола «Зарплата вовремя»", desc: "Привкус стабильности.", liquid: "#2a120a", label: "#2e7d32", cap: "#66bb6a", shape: "pet", icon: "💵" },
  { name: "Тархун «Очередь движется»", desc: "Освежает, как новость об отмене пары.", liquid: "#2ecc40", label: "#1b5e20", cap: "#e0e0e0", shape: "round", icon: "🚶" },
  { name: "Дюшес «Второй носок нашёлся»", desc: "Сладкий, как утро без поисков.", liquid: "#f4d03f", label: "#7e57c2", cap: "#f1c40f", shape: "stout", icon: "🧦" },
  { name: "Напиток «Маршрутка пришла пустая»", desc: "Едешь сидя, пьёшь лёжа.", liquid: "#ffcc80", label: "#f9a825", cap: "#212121", shape: "pet", icon: "🚐" },
  { name: "Газировка «Пельмень не развалился»", desc: "Сытно и с газом.", liquid: "#fff8e1", label: "#90a4ae", cap: "#ffffff", shape: "round", icon: "🥟" },
  { name: "Лимонад «Кот не скинул ёлку»", desc: "Хвойный, но без жертв.", liquid: "#a5d6a7", label: "#c62828", cap: "#2e7d32", shape: "glass", icon: "🐈" },
  { name: "Напиток «Начальник не пишет в субботу»", desc: "Вкус свободы.", liquid: "#81d4fa", label: "#0d47a1", cap: "#4fc3f7", shape: "pet", icon: "📵" },
  { name: "Газировка «Пробка не улетела в глаз»", desc: "Осторожно, но приятно.", liquid: "#e1f5fe", label: "#ff7043", cap: "#d84315", shape: "stout", icon: "👁️" },
  // 👑 Легендарные: «Все слышали, но никто не видел. А если видел — не докажет»
  { name: "Кола «Как в 90-х, но не отравился»", desc: "Тот самый вкус, но без последствий.", liquid: "#2a120a", label: LEGEND_GOLD, cap: LEGEND_GOLD, shape: "glass", icon: "📼", stroke: LEGEND_GOLD },
  { name: "Лимонад «Вкус детства без очереди»", desc: "Помнишь, но не докажешь.", liquid: "#fdf2c0", label: LEGEND_GOLD, cap: "#27ae60", shape: "round", icon: "🎈", stroke: LEGEND_GOLD },
  { name: "Тархун «Зелёный, но не отстирывается»", desc: "Пьёшь и не боишься за скатерть.", liquid: "#2ecc40", label: LEGEND_GOLD, cap: "#0b6623", shape: "glass", icon: "🧼", stroke: LEGEND_GOLD },
  { name: "Байкал «Пахнет ковром, но пьётся»", desc: "Легенда советского холодильника.", liquid: "#3b1f0e", label: LEGEND_GOLD, cap: "#c0392b", shape: "glass", icon: "🧶", stroke: LEGEND_GOLD },
  { name: "Дюшес «Слёзы ностальгии»", desc: "0% ностальгии, 100% сахара.", liquid: "#f4d03f", label: LEGEND_GOLD, cap: "#f1c40f", shape: "round", icon: "😢", stroke: LEGEND_GOLD },
  { name: "Лимонад «Бабушкин погреб»", desc: "Прохладный, тёмный, с привкусом банок.", liquid: "#8d6e63", label: LEGEND_GOLD, cap: "#5d4037", shape: "jar", icon: "👵", stroke: LEGEND_GOLD },
  { name: "Газировка «Советская стеклотара»", desc: "Сдаёшь бутылку — получаешь ностальгию.", liquid: "#e0f2f1", label: LEGEND_GOLD, cap: "#9e9e9e", shape: "glass", icon: "⭐", stroke: LEGEND_GOLD },
  { name: "Напиток «Пломбир в стакане»", desc: "Газированный пломбир? Да, мы тоже не поняли.", liquid: "#fffde7", label: LEGEND_GOLD, cap: "#fff3e0", shape: "cup", icon: "🍦", stroke: LEGEND_GOLD },
  { name: "Сироп «От кашля, но добровольно»", desc: "Вкус детства, когда болеешь и тебя любят.", liquid: "#b71c1c", label: LEGEND_GOLD, cap: "#ffffff", shape: "vial", icon: "🤒", stroke: LEGEND_GOLD },
  { name: "Шипучка «Язык онемел, но вкусно»", desc: "Пьёшь и говоришь с трудом, но продолжаешь.", liquid: "#e040fb", label: LEGEND_GOLD, cap: "#aa00ff", shape: "stout", icon: "👅", stroke: LEGEND_GOLD },
  // ✦ Мифическое — самое редкое
  { name: "Газировка «Тёща приехала и уехала»", desc: "Ультра-редкость. Облегчение с пузырьками.", liquid: "#00e5ff", label: "#000", cap: "#00e5ff", shape: "crystal", icon: "👋", stroke: "#00e5ff" },
];

// Кейс Юры Щёголева «Заряд от Юры»
const YURA_SODAS = [
  { name: "Lipton зелёный", desc: "Зелёный чай для зелёного радара.", liquid: "#c5e1a5", label: "#fdd835", cap: "#fdd835", shape: "pet", icon: "🍃" },
];

// добавляем всё в общий список и запоминаем, с какого номера начинается каждая группа
const ENERGY_START = SODAS.length;  SODAS.push(...ENERGY);
const ILYA_START = SODAS.length;    SODAS.push(...ILYA_SODAS);
const YURA_START = SODAS.length;    SODAS.push(...YURA_SODAS);
// у напитков из кейсов нет вкуса и газированности — ставим по умолчанию
for (const s of SODAS) { s.taste = s.taste || "секретный"; s.fizz = s.fizz || 4; }

let chosen = loadData("gazyava_chosen", 0);   // номер выбранной газявы
if (!(chosen >= 0 && chosen < BASE_COUNT)) chosen = 0;

// Формы бутылок (картинка 60×120). У каждой формы:
//  cap — крышка (кусок SVG, {c} заменяется цветом крышки), body — контур бутылки,
//  label — этикетка [x, y, ширина, высота], extra — дополнительные линии (рёбра, грани)
const SHAPES = {
  // обычная бутылка — как у 20 газяв из «Ассортимента»
  bottle: { cap: '<rect x="23" y="1" width="14" height="8" rx="2" fill="{c}"/>',
    body: "M25 9 h10 v12 q0 5 6 10 q9 8 9 20 v58 q0 8 -8 8 h-24 q-8 0 -8 -8 v-58 q0 -12 9 -20 q6 -5 6 -10 z",
    label: [10, 60, 40, 30] },
  // советская стеклотара: длинное узкое горлышко
  glass: { cap: '<rect x="25" y="2" width="10" height="7" rx="1" fill="{c}"/>',
    body: "M26 9 h8 v26 q0 6 8 12 q6 5 6 14 v47 q0 7 -7 7 h-22 q-7 0 -7 -7 v-47 q0 -9 6 -14 q8 -6 8 -12 z",
    label: [13, 68, 34, 26], shine: "M17 64 q-1 20 0 42", dot: [24, 54] },
  // пузатая короткая бутылка
  stout: { cap: '<rect x="20" y="22" width="20" height="8" rx="2" fill="{c}"/>',
    body: "M22 30 h16 v6 q14 6 14 20 v52 q0 8 -8 8 h-28 q-8 0 -8 -8 v-52 q0 -14 14 -20 z",
    label: [8, 66, 44, 30], shine: "M12 58 q-1 20 0 44", dot: [20, 50] },
  // круглая колба
  round: { cap: '<rect x="25" y="2" width="10" height="7" rx="1" fill="{c}"/>',
    body: "M26 9 h8 v30 q0 4 6 8 a26 26 0 1 1 -20 0 q6 -4 6 -8 z",
    label: [9, 62, 42, 22], shine: "M10 72 q1 10 6 18", dot: [18, 56], bub: [[38, 88], [28, 92]] },
  // пластиковая бутылка с рёбрами
  pet: { cap: '<rect x="22" y="0" width="16" height="10" rx="2" fill="{c}"/>',
    body: "M25 10 h10 v10 q0 5 6 10 q9 8 9 20 v58 q0 8 -8 8 h-24 q-8 0 -8 -8 v-58 q0 -12 9 -20 q6 -5 6 -10 z",
    label: [10, 60, 40, 30],
    extra: '<path d="M11 52 h38 M11 98 h38 M11 106 h38" stroke="rgba(255,255,255,0.35)" stroke-width="2"/>' },
  // трёхлитровая банка с крышкой
  jar: { cap: '<rect x="10" y="12" width="40" height="11" rx="3" fill="{c}"/>',
    body: "M12 23 h36 q6 4 6 12 v73 q0 8 -8 8 h-32 q-8 0 -8 -8 v-73 q0 -8 6 -12 z",
    label: [10, 58, 40, 32], shine: "M15 30 q-1 30 0 70", dot: [22, 40] },
  // аптечный пузырёк с мерным колпачком
  vial: { cap: '<rect x="18" y="2" width="24" height="16" rx="2" fill="{c}"/><path d="M22 7 h6 M22 11 h6" stroke="#999" stroke-width="1.5"/>',
    body: "M24 18 h12 v8 q10 4 10 14 v66 q0 6 -6 6 h-20 q-6 0 -6 -6 v-66 q0 -10 10 -14 z",
    label: [15, 58, 30, 34], shine: "M18 44 q-1 20 0 52", dot: [22, 40] },
  // стакан с шариком пломбира сверху
  cup: { cap: '<circle cx="30" cy="36" r="17" fill="{c}"/><circle cx="23" cy="30" r="4" fill="rgba(255,255,255,0.7)"/>',
    body: "M10 44 h40 l-5 68 q-1 6 -7 6 h-16 q-6 0 -7 -6 z",
    label: [14, 70, 32, 24], shine: "M15 50 q2 30 6 58", dot: [24, 56] },
  // «кристалл» с гранями — для мифической
  crystal: { cap: '<rect x="24" y="2" width="12" height="8" rx="1" fill="{c}"/>',
    body: "M26 10 h8 v14 l18 24 l-8 66 h-28 l-8 -66 l18 -24 z",
    label: [15, 62, 30, 26], shine: "M14 52 l6 50", dot: [24, 40],
    extra: '<path d="M12 48 h36 M30 24 v90 M20 114 l10 -66 l10 66" stroke="rgba(255,255,255,0.45)" stroke-width="1.5" fill="none"/>' },
};

// Рисует бутылку в цветах газявы (SVG — картинка из кода)
function bottleSVG(s, height) {
  if (s.can) return canSVG(s, height);
  const sh = SHAPES[s.shape] || SHAPES.bottle;
  const [lx, ly, lw, lh] = sh.label;
  // обводка: белая полупрозрачная, у легендарных — золотая и толще
  const stroke = s.stroke || "rgba(255,255,255,0.5)";
  const strokeW = s.stroke ? 3 : 2;
  const bub = sh.bub || [[38, 100], [28, 106]];   // два пузырька внизу бутылки
  // значок на этикетке (есть только у напитков из именных кейсов)
  const icon = s.icon ? `<text x="${lx + lw / 2}" y="${ly + lh / 2}" font-size="${Math.min(lh - 4, 20)}"
    text-anchor="middle" dominant-baseline="central">${s.icon}</text>` : "";
  return `<svg viewBox="0 0 60 120" width="${height / 2}" height="${height}">
    ${sh.cap.replace(/\{c\}/g, s.cap)}
    <path d="${sh.body}" fill="${s.liquid}" stroke="${stroke}" stroke-width="${strokeW}"/>
    <rect x="${lx}" y="${ly}" width="${lw}" height="${lh}" fill="${s.label}"/>
    ${icon}
    ${sh.extra || ""}
    <path d="${sh.shine || "M16 38 q-3 20 -2 60"}" stroke="rgba(255,255,255,0.35)" stroke-width="3" fill="none"/>
    <circle cx="${(sh.dot || [22, 46])[0]}" cy="${(sh.dot || [22, 46])[1]}" r="2.5" fill="rgba(255,255,255,0.6)"/>
    <circle cx="${bub[0][0]}" cy="${bub[0][1]}" r="2" fill="rgba(255,255,255,0.6)"/>
    <circle cx="${bub[1][0]}" cy="${bub[1][1]}" r="3" fill="rgba(255,255,255,0.5)"/>
  </svg>`;
}

// Банка энергетика: цилиндр с «ободками» сверху и снизу
function canSVG(s, height) {
  return `<svg viewBox="0 0 60 120" width="${height / 2}" height="${height}">
    <rect x="12" y="10" width="36" height="104" rx="6" fill="${s.liquid}" stroke="rgba(255,255,255,0.5)" stroke-width="2"/>
    <rect x="14" y="6" width="32" height="8" rx="3" fill="#bdbdbd"/>
    <rect x="12" y="44" width="36" height="40" fill="${s.label}"/>
    <path d="M18 50 l10 -6 l-4 12 l10 -4 l-12 18 l4 -14 l-10 4 z" fill="${s.cap}"/>
    <rect x="16" y="16" width="4" height="92" rx="2" fill="rgba(255,255,255,0.3)"/>
  </svg>`;
}

// ===== Газява дня =====
const FORECASTS = [
  "Сегодня пузырьки на твоей стороне",
  "Холодная газява найдёт тебя сама",
  "Опасайся тёплой газявы после обеда",
  "Кто первым открыл бутылку — тот и прав",
  "День для смелых вкусов",
  "Магнит сегодня особенно близко ⭐",
  "Встряхивать не рекомендуется. Но можно",
  "Звёзды советуют взять две бутылки",
];

function dayNumber() {
  const d = new Date();
  return d.getFullYear() * 400 + d.getMonth() * 32 + d.getDate();
}
// «случайное» число от 0 до n-1, но одно и то же весь день и у всех друзей
function dayRandom(salt, n) {
  const x = Math.sin(dayNumber() * 97 + salt) * 10000;
  return Math.floor((x - Math.floor(x)) * n);
}
function dailyIndex() {
  return dayRandom(1, BASE_COUNT);   // газява дня — только из обычных 20
}

function renderDaily() {
  const s = SODAS[dailyIndex()];
  document.getElementById("daily").innerHTML = bottleSVG(s, 70) + `
    <div class="txt">🔥 Газява дня: <b>${s.name}</b><br>
      🔮 ${FORECASTS[dayRandom(2, FORECASTS.length)]}<br>
      Выбери её — клики ×2 до полуночи!</div>`;
}

function renderCatalog() {
  document.getElementById("chosen").textContent = "Твоя газява: ⭐ " + SODAS[chosen].name;
  const box = document.getElementById("catalog");
  box.innerHTML = "";
  SODAS.slice(0, BASE_COUNT).forEach((s, i) => {   // напитки из кейсов в ассортименте не показываем
    const card = document.createElement("div");
    card.className = i === chosen ? "card selected" : "card";
    card.innerHTML = bottleSVG(s, 110) + `
      ${i === dailyIndex() ? '<div class="badge">🔥 Газява дня</div>' : ""}
      <div class="name">${s.name}</div>
      <div class="taste">${s.taste}</div>
      <div class="desc">${s.desc}</div>
      <div class="fizz">${"🫧".repeat(s.fizz)}</div>
      <button class="pick">${i === chosen ? "⭐ Выбрана" : "Выбрать"}</button>
      <button class="go">👆 Кликать</button>`;
    card.querySelector(".pick").onclick = () => chooseSoda(i);
    // «Кликать» — выбираем газяву и сразу переходим на вкладку кликера
    card.querySelector(".go").onclick = () => { chooseSoda(i); showTab("tab-clicker"); };
    box.appendChild(card);
  });
}

function chooseSoda(i) {
  chosen = i;
  saveData("gazyava_chosen", chosen);
  renderCatalog();
  renderClickerBottle();
  updateClicker();       // сила клика могла измениться (×2 за газяву дня)
}
