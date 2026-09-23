/* ---------- main.js: 初期化・イベント登録 ---------- */
// ---------- 初期化 ----------
function init() {
  refreshMenu();
  document.getElementById("holoBtn").onclick = enableHoloEffect;
  document.getElementById("btnStory").onclick = openStoryScreen;
  document.getElementById("btnGacha").onclick = openGachaScreen;
  document.getElementById("gachaBackBtn").onclick = () => showScreen("menuScreen");
  document.getElementById("gachaPullBtn").onclick = doGachaPull;
  document.getElementById("btnStartBattle").onclick = startBattle;
  document.getElementById("btnDeckBuild").onclick = openDeckScreen;
  document.getElementById("btnCollection").onclick = openCollectionScreen;
  document.getElementById("storyBackBtn").onclick = () => showScreen("menuScreen");
  document.getElementById("deckBackBtn").onclick = () => {
    if (totalDeckCount() === RULES.DECK_SIZE) { const list = []; for (const id in workingDeckCounts) for (let i = 0; i < workingDeckCounts[id]; i++) list.push(id); saveCustomDeck(list); }
    showScreen("menuScreen"); refreshMenu();
  };
  document.getElementById("deckResetBtn").onclick = () => { resetCustomDeck(); openDeckScreen(); };
  document.getElementById("collectionBackBtn").onclick = () => showScreen("menuScreen");
  document.getElementById("quitBtn").onclick = () => { stopTurnTimer(); showScreen("menuScreen"); refreshMenu(); };
  document.getElementById("endTurnBtn").onclick = () => { if (G && G.active === "self" && !G.gameOver) endTurn(); };
  document.getElementById("overlayCloseBtn").onclick = defaultOverlayClose;
  document.getElementById("cardDetailCloseBtn").onclick = hideCardDetail;
  document.getElementById("cardDetailOverlay").addEventListener("click", (e) => { if (e.target.id === "cardDetailOverlay") hideCardDetail(); });
  showScreen("menuScreen");

  // スプラッシュ画面: タップでホームへ。iOSでのモーション許可リクエストもこのユーザー操作に便乗して試みる。
  document.getElementById("splashScreen").addEventListener("click", function onSplashTap() {
    document.getElementById("splashScreen").classList.add("hidden");
    const DOE = window.DeviceOrientationEvent;
    if (DOE && typeof DOE.requestPermission !== "function") {
      // 許可ダイアログが不要な端末(Android等)ならここでホロを有効化しておく
      window.addEventListener("deviceorientation", onDeviceOrientation);
      holoEnabled = true;
      const btn = document.getElementById("holoBtn");
      if (btn) { btn.classList.add("active"); btn.textContent = "HOLO ON"; }
    }
  }, { once: true });
}
window.addEventListener("DOMContentLoaded", init);
