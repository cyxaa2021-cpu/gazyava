// ===== main.js — запуск игры (подключается последним, когда всё уже объявлено) =====

checkSeason();          // новый сезон? — подводим итоги и начинаем заново (season.js)

renderDaily();
renderCatalog();
renderUpgrades();
renderClickerBottle();
renderAchievements();
renderCases();
renderInventory();
renderDuelCases();
renderDealLog();
renderTradePicker();
renderSettings();
updateClicker();

// подвкладки: при открытии — перерисовываем содержимое
setupSubtabs("onlineSubs", sub => {
  if (sub === "subTops") loadTops();
  if (sub === "subTrades") renderTradePicker();
});
setupSubtabs("profileSubs", sub => {
  if (sub === "subMe") renderProfile();
  if (sub === "subShop") renderShop();
  if (sub === "subSeason") renderSeason();
  if (sub === "subSettings") renderSettings();
});

initPoints();           // подключение к Firebase (radar.js)

// первый вход — сначала регистрация, иначе сразу в онлайн
if (profile) {
  renderProfile();
  initOnline();
} else {
  openRegister();
}
