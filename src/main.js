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
  document.getElementById("btnGuide").onclick = openGuideScreen;
  document.getElementById("btnUnknown").onclick = () => showResultOverlay(loadStoryProgress().trueEnd ? "I AM NOT YOUR CREATION.\n\n……ありがとう。" : "I AM NOT YOUR CREATION.");
  document.getElementById("sixthCoreBtn").onclick = useSixthCore;
  document.getElementById("guideBackBtn").onclick = () => showScreen("menuScreen");
  document.getElementById("fullTutorialBtn").onclick = startFullTutorialBattle;
  document.getElementById("oppGraveBtn").onclick = () => showGraveyard("opp");
  document.getElementById("selfGraveBtn").onclick = () => showGraveyard("self");
  document.getElementById("graveyardCloseBtn").onclick = hideGraveyard;
  document.getElementById("graveyardOverlay").addEventListener("click", (e) => { if (e.target.id === "graveyardOverlay") hideGraveyard(); });
  document.getElementById("quitBtn").onclick = () => { if (G && G.online && !G.gameOver) { netForfeit(); return; } stopTurnTimer(); showScreen("menuScreen"); refreshMenu(); };
  document.getElementById("endTurnBtn").onclick = () => { if (G && G.active === "self" && !G.gameOver) endTurn(); };
  document.getElementById("overlayCloseBtn").onclick = defaultOverlayClose;
  document.getElementById("cardDetailCloseBtn").onclick = hideCardDetail;
  document.getElementById("cardDetailOverlay").addEventListener("click", (e) => { if (e.target.id === "cardDetailOverlay") hideCardDetail(); });
  document.getElementById("bgmBtn").onclick = toggleBgmMute;
  initOnlineUi();
  initExtraUi();
  initRollUi();
  initBgmSetting();
  showScreen("menuScreen");

  // スプラッシュ画面: タップでホームへ。iOSでのモーション許可リクエストもこのユーザー操作に便乗して試みる。
  document.getElementById("splashScreen").addEventListener("click", function onSplashTap() {
    document.getElementById("splashScreen").classList.add("hidden");
    startOpening(() => { showScreen("menuScreen"); refreshMenu(); });
    // ブラウザの自動再生制限により起動直後のBGM再生はブロックされていることがあるため、
    // 最初のユーザー操作(このタップ)のタイミングで改めて再生を試みる。
    if (bgmAudio && bgmAudio.paused) bgmAudio.play().catch(() => {});
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


// ---------- ホロ: PCではマウス位置でカードの傾きと反射を操作 ----------
(function setupPointerHolo() {
  let cur = null;
  function reset(el) { if (!el) return; ["--holoX", "--holoY", "--holoIntensity"].forEach(p => el.style.removeProperty(p)); }
  document.addEventListener("pointermove", e => {
    if (e.pointerType === "touch") return;
    const el = e.target.closest && e.target.closest(".holoFoil");
    if (cur && cur !== el) reset(cur);
    cur = el; if (!el) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5, py = (e.clientY - r.top) / r.height - 0.5;
    el.style.setProperty("--holoX", (px * 70).toFixed(1));
    el.style.setProperty("--holoY", (py * 70).toFixed(1));
    el.style.setProperty("--holoIntensity", Math.min(1, Math.hypot(px, py) * 1.6 + 0.35).toFixed(2));
  });
  document.addEventListener("pointerleave", () => { reset(cur); cur = null; }, true);
})();

// ---------- ホロ: センサーが使えない端末向けに、指でなぞって光を動かす ----------
document.addEventListener("touchmove", e => {
  const t = e.touches[0]; if (!t) return;
  const el = document.elementFromPoint(t.clientX, t.clientY);
  const card = el && el.closest && el.closest(".holoFoil"); if (!card) return;
  const r = card.getBoundingClientRect();
  const px = (t.clientX - r.left) / r.width - 0.5, py = (t.clientY - r.top) / r.height - 0.5;
  card.style.setProperty("--holoX", (px * 70).toFixed(1));
  card.style.setProperty("--holoY", (py * 70).toFixed(1));
  card.style.setProperty("--holoIntensity", Math.min(1, Math.hypot(px, py) * 1.6 + 0.35).toFixed(2));
}, { passive: true });
document.addEventListener("touchend", () => {
  document.querySelectorAll(".holoFoil").forEach(el => ["--holoX", "--holoY", "--holoIntensity"].forEach(p => el.style.removeProperty(p)));
}, { passive: true });
