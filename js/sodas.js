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

let chosen = loadData("gazyava_chosen", 0);   // номер выбранной газявы
if (!(chosen >= 0 && chosen < SODAS.length)) chosen = 0;

// Рисует бутылку в цветах газявы (SVG — картинка из кода)
function bottleSVG(s, height) {
  return `<svg viewBox="0 0 60 120" width="${height / 2}" height="${height}">
    <rect x="23" y="1" width="14" height="8" rx="2" fill="${s.cap}"/>
    <path d="M25 9 h10 v12 q0 5 6 10 q9 8 9 20 v58 q0 8 -8 8 h-24 q-8 0 -8 -8 v-58 q0 -12 9 -20 q6 -5 6 -10 z"
          fill="${s.liquid}" stroke="rgba(255,255,255,0.5)" stroke-width="2"/>
    <rect x="10" y="60" width="40" height="30" fill="${s.label}"/>
    <path d="M16 38 q-3 20 -2 60" stroke="rgba(255,255,255,0.35)" stroke-width="3" fill="none"/>
    <circle cx="22" cy="46" r="2.5" fill="rgba(255,255,255,0.6)"/>
    <circle cx="38" cy="100" r="2" fill="rgba(255,255,255,0.6)"/>
    <circle cx="28" cy="106" r="3" fill="rgba(255,255,255,0.5)"/>
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
  return dayRandom(1, SODAS.length);
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
  SODAS.forEach((s, i) => {
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
