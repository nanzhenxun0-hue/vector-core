/* ---------- story.js: ストーリーモード進行(マップ/戦闘開始/クリア処理) ---------- */
// ---------- ストーリーマップ ----------
function openStoryScreen() { renderStoryList(); showScreen("storyScreen"); }
function isStageCleared(id) { return loadStoryProgress().cleared.includes(id); }
function isStageUnlocked(index) {
  if (index === 0) return true;
  const prev = STORY_STAGES[index - 1];
  return isStageCleared(prev.id);
}
function renderStoryList() {
  const list = document.getElementById("storyList"); list.innerHTML = "";
  STORY_STAGES.forEach((st, i) => {
    const unlocked = isStageUnlocked(i);
    const cleared = isStageCleared(st.id);
    const div = document.createElement("div");
    div.className = "storyNode" + (cleared ? " cleared" : "") + (st.boss ? " boss" : "") + (!unlocked ? " locked" : "") + (!st.battle && st.implemented ? " narrative" : "");
    div.innerHTML = `<div class="idx">${st.id}</div><div class="info"><div class="stitle">${st.title}${st.boss ? "【BOSS】" : ""}</div><div class="schapter">${st.chapter}</div></div>`;
    const btn = document.createElement("button"); btn.className = "storyGo";
    btn.textContent = !st.implemented ? "近日実装" : cleared ? "再挑戦" : "進む";
    btn.disabled = !unlocked || !st.implemented;
    btn.onclick = () => startStoryStage(st.id);
    div.appendChild(btn);
    list.appendChild(div);
  });
}

function startStoryStage(stageId) {
  const stage = STORY_STAGES.find(s => s.id === stageId);
  if (!stage || !stage.implemented) return;
  showDialogue(stage.intro, () => {
    if (stage.hasRouteChoice) {
      showChoiceOverlay("どちらのルートに進む？", [
        { label: "ROUTE A(正面突破)", onClick: () => { const p = loadStoryProgress(); p.route = "A"; saveStoryProgress(p); finishNarrativeStage(stage); } },
        { label: "ROUTE B(データ回収)", onClick: () => { const p = loadStoryProgress(); p.route = "B"; const cm = p.coreMemory || {}; cm.VECTOR = true; p.coreMemory = cm; saveStoryProgress(p); finishNarrativeStage(stage); } },
      ]);
      return;
    }
    if (!stage.battle) { finishNarrativeStage(stage); return; }
    if (stage.tutorial) { startTutorialBattle(stage); return; }
    startStoryBattle(stage);
  });
}
function finishNarrativeStage(stage) {
  markStageCleared(stage.id);
  showScreen("storyScreen"); renderStoryList();
}
function markStageCleared(stageId) {
  const p = loadStoryProgress();
  if (!p.cleared.includes(stageId)) p.cleared.push(stageId);
  saveStoryProgress(p);
}

function startStoryBattle(stage) {
  const selfDeckList = loadCustomDeck() || defaultDeckList();
  const oppDeckList = defaultDeckList();
  knownInstanceIds.self = new Set(); knownInstanceIds.opp = new Set();
  G = { self: newPlayer("YOU", selfDeckList), opp: newPlayer("AI", oppDeckList), active: "self", turn: 1, firstPlayer: "self", gameOver: false, storyStage: stage, storyMods: stage.rules || null };
  G.active = G.firstPlayer;
  document.getElementById("logArea").innerHTML = "";
  draw(G.self, 5); draw(G.opp, 5);
  log(`STAGE ${stage.id}「${stage.title}」開始`);
  if (stage.rules && stage.rules.note) log(`特殊ルール: ${stage.rules.note}`);
  showScreen("gameScreen");
  startTurn();
}
function endStoryBattle(won, msg) {
  const stage = G.storyStage;
  if (won) {
    markStageCleared(stage.id);
    showResultOverlayThen(msg, () => showDialogue(stage.outro, () => { showScreen("storyScreen"); renderStoryList(); }));
  } else {
    showResultOverlayThen(msg, () => { showScreen("storyScreen"); renderStoryList(); });
  }
}
function showResultOverlayThen(text, after) {
  document.getElementById("overlayText").textContent = text;
  document.getElementById("overlayChoices").innerHTML = "";
  document.getElementById("overlay").classList.remove("hidden");
  document.getElementById("overlayCloseBtn").onclick = () => { hideOverlay(); document.getElementById("overlayCloseBtn").onclick = defaultOverlayClose; after(); };
}
function defaultOverlayClose() { hideOverlay(); if (G && G.gameOver) { showScreen("menuScreen"); refreshMenu(); } }
