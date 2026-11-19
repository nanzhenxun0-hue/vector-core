/* ---------- story.js: ストーリーモード進行(マップ/戦闘開始/クリア処理) ---------- */
// ---------- ストーリーマップ ----------
function openStoryScreen() { renderStoryList(); showScreen("storyScreen"); }
function isStageCleared(id) { return loadStoryProgress().cleared.includes(id); }
function isStageUnlocked(index) {
  if (index === 0) return true;
  if (STORY_STAGES[index].unlockAfter) return isStageCleared(STORY_STAGES[index].unlockAfter);
  const prev = STORY_STAGES[index - 1];
  return isStageCleared(prev.id);
}
function renderStoryList() {
  const list = document.getElementById("storyList"); list.innerHTML = "";
  const progNow = loadStoryProgress();
  const emb = document.getElementById("errorModeBtn");
  if (emb) { emb.classList.toggle("hidden", !progNow.trueEnd); emb.textContent = `ERROR MODE: ${progNow.errorMode ? "ON" : "OFF"}`; emb.classList.toggle("on", !!progNow.errorMode); }
  STORY_STAGES.forEach((st, i) => {
    if (st.hidden && !progNow.trueEnd) return;
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
  const progressAtStart = loadStoryProgress();
  let stageIntro = stage.intro;
  // S06で選んだ行動をS07の会話に反映し、選択が物語に残るようにする。
  if (stage.id === "S07" && progressAtStart.route === "A") {
    stageIntro = [
      { s: "NARRATION", t: "正面突破で中枢へ進んだ主人公たち。警戒システムはまだ完全には解除されていない。" },
      { s: "主人公", t: "データを奪うより、ここで確かめる。あの異常の正体を。" },
      { s: "VECTOR", t: "……お前らしい選択だ。だが、記録の一部はまだ閉じたままだ。" },
      { s: "SYSTEM", t: "CREATION DATA：PARTIAL ACCESS" },
    ];
  } else if (stage.id === "S07" && progressAtStart.route === "B") {
    stageIntro = [
      { s: "NARRATION", t: "回収したデータを解析しながら中枢へ進む。戦闘を避けたことで、失われた記録の一部が復元された。" },
      { s: "主人公", t: "この記録……俺たちが生まれる前のものなのか？" },
      { s: "VECTOR", t: "そうだ。お前が持ち帰ったデータが、ここへの道を開いた。" },
      { s: "SYSTEM", t: "CREATION DATA：ARCHIVE ACCESS GRANTED" },
    ];
  }
  showDialogue(stageIntro, () => {
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
  if (MEMORY_AWARDS[stageId]) { p.coreMemory = p.coreMemory || {}; p.coreMemory[MEMORY_AWARDS[stageId]] = true; }
  saveStoryProgress(p);
}

function startStoryBattle(stage) {
  const selfDeckList = loadCustomDeck() || defaultDeckList();
  const oppDeckList = defaultDeckList();
  knownInstanceIds.self = new Set(); knownInstanceIds.opp = new Set();
  const prog0 = loadStoryProgress();
  const errorMode = !!(prog0.trueEnd && prog0.errorMode);
  const mods = errorMode ? Object.assign({}, stage.rules || {}, { energyJitter: true, autoChainPerTurn: Math.max(1, (stage.rules && stage.rules.autoChainPerTurn) || 0), opponentNoShield: true, opponentStartCore: Math.max(7, (stage.rules && stage.rules.opponentStartCore) || 0) }) : (stage.rules || null);
  G = { self: newPlayer("YOU", selfDeckList), opp: newPlayer("AI", oppDeckList), active: "self", turn: 1, firstPlayer: "self", gameOver: false, storyStage: stage, storyMods: mods, errorMode };
  G.active = G.firstPlayer;
  if (mods && typeof mods.opponentStartCore === "number") { G.opp.core = mods.opponentStartCore; G.opp.coreMax = Math.max(G.opp.coreMax, mods.opponentStartCore); }
  document.getElementById("logArea").innerHTML = "";
  draw(G.self, 5); draw(G.opp, 5);
  // S06の選択が最初のボス戦S08の準備に影響する。
  if (stage.id === "S08" && prog0.route === "A") {
    G.self.coreShield = Math.min(RULES.CORE_SHIELD_MAX, G.self.coreShield + 1);
    log("ROUTE A特典：正面突破の勢いでCORE SHIELD+1");
  } else if (stage.id === "S08" && prog0.route === "B") {
    draw(G.self, 1);
    log("ROUTE B特典：回収したデータを解析し、追加ドロー+1");
  }
  log(`STAGE ${stage.id}「${stage.title}」開始`);
  if (errorMode) log("ERROR MODE: ENERGY/CHAIN暴走・敵CORE7・敵SHIELDなし");
  if (stage.rules && stage.rules.note) log(`特殊ルール: ${stage.rules.note}`);
  showScreen("gameScreen");
  playBgm(stage.bgm || "vectorBattle");
  beginMulliganPhase(startTurn);
}
function endStoryBattle(won, msg) {
  const stage = G.storyStage;
  if (won) {
    const firstClear = !isStageCleared(stage.id);
    markStageCleared(stage.id);
    if (stage.bonusCurrency && firstClear) addCurrency(stage.bonusCurrency);
    if (stage.grantCard && firstClear) { addToCollection(stage.grantCard, 1); msg += `\n隠しカード「${cardName(stage.grantCard)}」を獲得!`; }
    if (G.errorMode) {
      const pe = loadStoryProgress(); pe.errorCleared = pe.errorCleared || [];
      if (!pe.errorCleared.includes(stage.id)) { pe.errorCleared.push(stage.id); saveStoryProgress(pe); addCurrency(60); msg += "\nERROR MODE初クリア! +60PT"; if (typeof trackStat === "function") trackStat("errorClears"); }
    }
    // TRUE END判定: CORE MEMORY 4/4 + UNKNOWN SIGNAL 6/6 + S31和解 + S34でSIXTH CORE使用
    let trueEnd = false;
    if (stage.id === "S34") {
      const pp = loadStoryProgress();
      trueEnd = countMemories(pp) >= 4 && countSignals(pp) >= 6 && !!pp.peaceS31 && !!G.sixthUsed;
      if (trueEnd) { pp.trueEnd = true; saveStoryProgress(pp); }
    }
    const endLines = trueEnd ? stage.trueEnding : stage.ending;
    showResultOverlayThen(msg, () => showDialogue(stage.outro, () => {
      if (endLines) { showDialogue(endLines, () => { const p = loadStoryProgress(); p.endingSeen = true; saveStoryProgress(p); showEndRoll(trueEnd, () => { showScreen("storyScreen"); renderStoryList(); playBgm("secret"); }); }); }
      else { showScreen("storyScreen"); renderStoryList(); }
    }));
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
