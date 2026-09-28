// ===== main.js — запуск игры (подключается последним, когда всё уже объявлено) =====

renderDaily();
renderCatalog();
renderUpgrades();
renderClickerBottle();
renderAchievements();
renderCases();
renderInventory();
updateClicker();
initPoints();

// первый вход — сначала регистрация, иначе сразу рисуем профиль
if (profile) renderProfile();
else openRegister();
