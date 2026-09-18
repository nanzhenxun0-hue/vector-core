/* ---------- ui.js: 画面描画・演出・各種画面(パック開封/デッキ編成/図鑑) ---------- */
// ---------- ホロ演出(端末の傾き検知) ----------
let holoEnabled = false;
function onDeviceOrientation(e) {
  const x = Math.max(-45, Math.min(45, e.gamma || 0));      // 左右の傾き
  const y = Math.max(-45, Math.min(45, (e.beta || 0) - 45)); // 前後の傾き(45度=手に持って見る角度を基準に)
  document.documentElement.style.setProperty("--holoX", x.toFixed(1));
  document.documentElement.style.setProperty("--holoY", y.toFixed(1));
}
function enableHoloEffect() {
  const btn = document.getElementById("holoBtn");
  if (holoEnabled) { holoEnabled = false; window.removeEventListener("deviceorientation", onDeviceOrientation); btn.classList.remove("active"); btn.textContent = "✨HOLO"; return; }
  const DOE = window.DeviceOrientationEvent;
  if (DOE && typeof DOE.requestPermission === "function") {
    DOE.requestPermission().then(state => {
      if (state === "granted") { window.addEventListener("deviceorientation", onDeviceOrientation); holoEnabled = true; btn.classList.add("active"); btn.textContent = "HOLO ON"; }
      else log("モーションの許可が得られなかったため、ホロ演出を有効化できません");
    }).catch(() => log("モーション許可のリクエストに失敗しました"));
  } else if (DOE) {
    window.addEventListener("deviceorientation", onDeviceOrientation);
    holoEnabled = true; btn.classList.add("active"); btn.textContent = "HOLO ON";
  } else {
    log("この端末・ブラウザは傾き検知に対応していません");
  }
}

// ---------- 演出 ----------
function flashBanner(text, cls) {
  const b = document.getElementById("banner");
  b.textContent = text; b.className = ""; void b.offsetWidth;
  b.classList.add(cls, "show");
  setTimeout(() => { b.classList.remove("show"); b.classList.add("hidden"); }, 900);
}
function flashStat(elId) {
  const el = document.getElementById(elId); if (!el) return;
  el.classList.add("flash"); setTimeout(() => el.classList.remove("flash"), 400);
}

// ---------- UI描画 ----------
function render() {
  document.getElementById("turnInfo").textContent = `TURN ${G.turn} - ${G.active === "self" ? "YOUR TURN" : "AI TURN"}`;
  setStatText("oppCore", G.opp.core, "oppCoreStat"); setStatText("oppShield", G.opp.coreShield, "oppShieldStat");
  document.getElementById("oppEnergy").textContent = `${G.opp.energy}/${G.opp.energyMax}`;
  setStatText("oppChain", G.opp.chain, "oppChainStat");
  setStatText("selfCore", G.self.core, "selfCoreStat"); setStatText("selfShield", G.self.coreShield, "selfShieldStat");
  document.getElementById("selfEnergy").textContent = `${G.self.energy}/${G.self.energyMax}`;
  setStatText("selfChain", G.self.chain, "selfChainStat");
  renderField("oppField", "opp"); renderField("selfField", "self");
  renderProtocols("oppProtocols", "opp"); renderProtocols("selfProtocols", "self");
  renderHand();
  document.getElementById("endTurnBtn").disabled = G.active !== "self" || G.gameOver || (G.tutorial && !tutorialActionAllowed("endTurn"));
  const hintEl = document.getElementById("tutorialHint");
  if (G.tutorial) { hintEl.textContent = "📘 " + tutorialStep().hint; hintEl.classList.remove("hidden"); }
  else hintEl.classList.add("hidden");
}
const prevStatValues = {};
function setStatText(spanId, value, statElId) {
  const span = document.getElementById(spanId);
  if (prevStatValues[spanId] !== undefined && prevStatValues[spanId] !== value) flashStat(statElId);
  prevStatValues[spanId] = value; span.textContent = value;
}
const knownInstanceIds = { self: new Set(), opp: new Set() };
function renderField(elId, owner) {
  const el = document.getElementById(elId); el.innerHTML = "";
  const player = getPlayer(owner); const currentIds = new Set();
  for (const a of player.field) {
    currentIds.add(a.instanceId);
    const card = getCard(a.cardId);
    const div = document.createElement("div"); div.className = "actorCard";
    div.dataset.faction = card.faction;
    if (isHoloRarity(card.rarity)) div.classList.add(`rarity-glow-${card.rarity}`, "holoFoil");
    if (isFoilRarity(card.rarity)) div.classList.add("foilFrame", `foilFrame-${card.rarity}`);
    if (hasTreasure(a.cardId)) div.classList.add("treasureCard");
    if (!knownInstanceIds[owner].has(a.instanceId)) div.classList.add("enter");
    const done = a.hasActed || (a.summonedThisTurn && !a.quickAllowed);
    if (done) div.classList.add("tappedOrDone");
    div.innerHTML = `<div class="cardArt" data-ctype="${card.type}"><span class="artGlyph">${factionGlyph(card.faction)}</span></div><div class="facGlyph">${factionGlyph(card.faction)}</div><div class="name">${card.name}</div><div class="stats"><b>${effAtk(a, owner)}</b><i>${effDef(a, owner)}</i><u>${effSpd(a)}</u></div>`;
    if (owner === "self" && G.active === "self" && !done && !G.gameOver) {
      const row = document.createElement("div"); row.className = "actorBtnRow";
      if (G.opp.field.length > 0) { const btn = document.createElement("button"); btn.textContent = "攻撃"; btn.disabled = G.tutorial && !tutorialActionAllowed("attack"); btn.onclick = () => { if (btn.disabled) return; div.classList.add("attackAnim"); setTimeout(() => openAttackPicker(a.instanceId), 150); }; row.appendChild(btn); }
      const csBtn = document.createElement("button"); csBtn.textContent = "CORE STRIKE";
      csBtn.disabled = (G.opp.field.length > 0 && !a.unlockCoreStrike) || (G.tutorial && !tutorialActionAllowed("coreStrike"));
      csBtn.onclick = () => { div.classList.add("attackAnim"); setTimeout(() => { coreStrike("self", a.instanceId); render(); }, 150); };
      row.appendChild(csBtn); div.appendChild(row);
    }
    el.appendChild(div);
  }
  knownInstanceIds[owner] = currentIds;
}
function renderProtocols(elId, owner) {
  const el = document.getElementById(elId); el.innerHTML = "";
  for (const p of getPlayer(owner).protocols) { const chip = document.createElement("div"); chip.className = "protoChip"; chip.textContent = cardName(p.cardId); el.appendChild(chip); }
}
function openAttackPicker(attackerInstanceId) {
  const targets = G.opp.field;
  showChoiceOverlay("攻撃対象を選んでください", targets.map(t => ({ label: `${cardName(t.cardId)} (ATK${effAtk(t, "opp")} / DEF${effDef(t, "opp")})`, onClick: () => { attack("self", attackerInstanceId, t.instanceId); render(); } })));
}
function renderHand() {
  const el = document.getElementById("handArea"); el.innerHTML = "";
  const me = G.self;
  for (const cardId of me.hand) {
    const card = getCard(cardId);
    const cost = cardId === "VC-056" ? me.undefinedX : card.cost;
    const div = document.createElement("div");
    let playable = me.energy >= cost && G.active === "self" && !G.gameOver;
    if (card.type === "ACTION" && me.noMoreActionsThisTurn) playable = false;
    if (card.type === "CORE" && !canUseCore("self", cardId)) playable = false;
    if (G.tutorial) playable = playable && tutorialActionAllowed(card.type === "ACTOR" ? "summon" : "action", cardId);
    div.className = "handCard " + (playable ? "canPlay" : "cannotPlay") + (isHoloRarity(card.rarity) ? " holoFoil" : "") + (isFoilRarity(card.rarity) ? " foilFrame foilFrame-" + card.rarity : "") + (hasTreasure(cardId) ? " treasureCard" : "");
    div.dataset.faction = card.faction;
    const statLine = card.type === "ACTOR" ? ` / ${cardId === "VC-056" ? "X" : card.atk}-${cardId === "VC-056" ? "X" : card.def}-${cardId === "VC-056" ? "X" : card.spd}` : "";
    div.innerHTML = `<div class="cardArt" data-ctype="${card.type}"><span class="artGlyph">${factionGlyph(card.faction)}</span></div><div class="facGlyph">${factionGlyph(card.faction)}</div><div class="cname">${card.name}</div><div class="cmeta">${card.rarity} / ${card.type} / C${cost}${statLine}</div>`;
    const btn = document.createElement("button");
    btn.textContent = card.type === "ACTOR" ? "召喚" : card.type === "PROTOCOL" ? "配置" : "使用";
    btn.disabled = !playable;
    btn.onclick = () => { if (card.type === "ACTOR") summonActor("self", cardId); else if (card.type === "PROTOCOL") placeProtocol("self", cardId); else if (card.type === "CORE") useCore("self", cardId); else useAction("self", cardId); render(); };
    div.appendChild(btn); el.appendChild(div);
  }
}

// ---------- オーバーレイ ----------
function showChoiceOverlay(text, choices) {
  document.getElementById("overlayText").textContent = text;
  const box = document.getElementById("overlayChoices"); box.innerHTML = "";
  choices.forEach(c => { const b = document.createElement("button"); b.textContent = c.label; b.onclick = () => { hideOverlay(); c.onClick(); }; box.appendChild(b); });
  document.getElementById("overlay").classList.remove("hidden");
}
function showResultOverlay(text) {
  document.getElementById("overlayText").textContent = text;
  document.getElementById("overlayChoices").innerHTML = "";
  document.getElementById("overlay").classList.remove("hidden");
}
function hideOverlay() { document.getElementById("overlay").classList.add("hidden"); }

// ---------- ダイアログ(ストーリー会話) ----------
function showDialogue(lines, onDone) {
  if (!lines || lines.length === 0) { onDone && onDone(); return; }
  let i = 0;
  const box = document.getElementById("dialogueOverlay");
  const speakerEl = document.getElementById("dialogueSpeaker");
  const textEl = document.getElementById("dialogueText");
  const nextBtn = document.getElementById("dialogueNextBtn");
  box.classList.remove("hidden");
  function showLine() {
    speakerEl.textContent = lines[i].s;
    textEl.textContent = lines[i].t;
    nextBtn.textContent = i === lines.length - 1 ? "閉じる" : "次へ ▶";
  }
  nextBtn.onclick = () => {
    i++;
    if (i >= lines.length) { box.classList.add("hidden"); onDone && onDone(); return; }
    showLine();
  };
  showLine();
}

// ---------- 画面遷移 ----------
function showScreen(id) { ["menuScreen", "storyScreen", "gachaScreen", "deckScreen", "collectionScreen", "gameScreen"].forEach(s => document.getElementById(s).classList.toggle("hidden", s !== id)); }
function refreshMenu() {
  const deck = loadCustomDeck();
  document.getElementById("deckStatus").textContent = deck ? "カスタムデッキ(30枚)で対戦します" : "初期デッキ(N24種ベース・30枚)で対戦します";
  document.getElementById("homeCurrencyValue").textContent = loadCurrency();
  const clearedCount = loadStoryProgress().cleared.length;
  document.getElementById("homeStoryProgress").textContent = `${clearedCount}/${STORY_STAGES.length}`;
}

// ---------- パック開封 ----------
function openGachaScreen() {
  document.getElementById("gachaResult").innerHTML = "";
  refreshGachaCurrency();
  showScreen("gachaScreen");
}
function refreshGachaCurrency() {
  document.getElementById("gachaCurrency").textContent = `${loadCurrency()} PT`;
  document.getElementById("gachaPullBtn").disabled = loadCurrency() < PACK_COST;
}
function doGachaPull() {
  if (!spendCurrency(PACK_COST)) { log("PTが足りません"); return; }
  const results = pullPack();
  refreshGachaCurrency();
  const box = document.getElementById("gachaResult");
  box.innerHTML = "";
  // 低レアから順に、じわじわ見せる(演出のため表示に少し間隔を空ける)
  const sorted = [...results].sort((a, b) => Object.keys(RARITY_RATES).indexOf(getCard(a.id).rarity) - Object.keys(RARITY_RATES).indexOf(getCard(b.id).rarity));
  sorted.forEach((r, i) => {
    const card = getCard(r.id);
    const div = document.createElement("div");
    div.className = "gachaCard" + (isHoloRarity(card.rarity) ? " holoFoil" : "") + (isFoilRarity(card.rarity) ? " foilFrame foilFrame-" + card.rarity : "") + (r.isTreasure ? " treasureCard" : "");
    div.dataset.faction = card.faction;
    div.style.animationDelay = `${i * 0.25}s`;
    div.innerHTML = `<div class="cardArt" data-ctype="${card.type}"><span class="artGlyph">${factionGlyph(card.faction)}</span></div>${r.isTreasure ? '<div class="treasureBadge">㊙</div>' : ""}<div class="facGlyph">${factionGlyph(card.faction)}</div><div class="rarity ${card.rarity}">${card.rarity}</div><div class="grname">${card.name}</div><div class="pmeta">${card.type}</div>`;
    box.appendChild(div);
    if (r.isTreasure) {
      setTimeout(() => flashBanner("㊙ SECRET TREASURE!!", "treasure"), i * 250 + 300);
    } else if (["UR", "XR", "SEC"].includes(card.rarity)) {
      setTimeout(() => flashBanner(`${card.rarity} GET!`, "awaken"), i * 250 + 300);
    }
  });
  log(`パックを開封: ${results.map(r => cardName(r.id) + (r.isTreasure ? "(㊙)" : "")).join(" / ")}`);
}
let workingDeckCounts = {};
function openDeckScreen() {
  const saved = loadCustomDeck() || defaultDeckList();
  workingDeckCounts = {};
  for (const id of saved) workingDeckCounts[id] = (workingDeckCounts[id] || 0) + 1;
  renderDeckScreen(); showScreen("deckScreen");
}
function totalDeckCount() { return Object.values(workingDeckCounts).reduce((a, b) => a + b, 0); }
function renderDeckScreen() {
  document.getElementById("deckCount").textContent = totalDeckCount();
  const grid = document.getElementById("deckPool"); grid.innerHTML = "";
  for (const card of deckablePool()) {
    const count = workingDeckCounts[card.id] || 0;
    const owned = ownedCount(card.id);
    const div = document.createElement("div"); div.className = "poolCard" + (isHoloRarity(card.rarity) ? " holoFoil" : "") + (isFoilRarity(card.rarity) ? " foilFrame foilFrame-" + card.rarity : "") + (hasTreasure(card.id) ? " treasureCard" : "");
    div.dataset.faction = card.faction;
    div.innerHTML = `<div class="cardArt" data-ctype="${card.type}"><span class="artGlyph">${factionGlyph(card.faction)}</span></div><div class="facGlyph">${factionGlyph(card.faction)}</div><div class="rarity ${card.rarity}">${card.rarity}</div><div class="pname">${card.name}</div><div class="pmeta">${card.type} / C${card.id === "VC-056" ? "X" : card.cost}</div><div class="ownedCount">所持: ${owned}</div>
      <div class="stepper"><button data-a="-1">-</button><span>${count}</span><button data-a="1">+</button></div>`;
    div.querySelector('button[data-a="-1"]').onclick = () => { if (count > 0) { workingDeckCounts[card.id] = count - 1; renderDeckScreen(); } };
    div.querySelector('button[data-a="1"]').onclick = () => { if (count < RULES.MAX_COPIES && count < owned && totalDeckCount() < RULES.DECK_SIZE) { workingDeckCounts[card.id] = count + 1; renderDeckScreen(); } };
    grid.appendChild(div);
  }
}

// ---------- カード図鑑 ----------
function openCollectionScreen() {
  const grid = document.getElementById("collectionGrid"); grid.innerHTML = "";
  for (const card of CARD_POOL) {
    const owned = ownedCount(card.id);
    const treasureOwned = owned > 0 && hasTreasure(card.id);
    const div = document.createElement("div"); div.className = "poolCard" + (owned === 0 ? " locked" : "") + (owned > 0 && isHoloRarity(card.rarity) ? " holoFoil" : "") + (owned > 0 && isFoilRarity(card.rarity) ? " foilFrame foilFrame-" + card.rarity : "") + (treasureOwned ? " treasureCard" : "");
    if (owned > 0) div.dataset.faction = card.faction;
    div.innerHTML = `${owned > 0 ? `<div class="cardArt" data-ctype="${card.type}"><span class="artGlyph">${factionGlyph(card.faction)}</span></div><div class="facGlyph">${factionGlyph(card.faction)}</div>` : ""}${treasureOwned ? '<div class="treasureBadge">㊙</div>' : ""}<div class="rarity ${card.rarity}">${card.rarity}</div><div class="pname">${owned > 0 ? card.name : "???"}</div><div class="pmeta">${owned > 0 ? `${card.type} / C${card.id === "VC-056" ? "X" : card.cost}` : "未所持"}</div>${owned > 0 ? `<div class="ownedCount">所持: ${owned}${treasureOwned ? " (㊙あり)" : ""}</div>` : ""}`;
    grid.appendChild(div);
  }
  showScreen("collectionScreen");
}

