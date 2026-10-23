/* ---------- ui.js: 画面描画・演出・各種画面(パック開封/デッキ編成/図鑑) ---------- */
// ---------- ホロ演出(端末の傾き検知) ----------
let holoEnabled = false, holoGotEvent = false;
function onDeviceOrientation(e) {
  if (e.beta === null && e.gamma === null) return; // センサー非対応端末が送る「データ無し」イベントは無視
  holoGotEvent = true;
  const x = Math.max(-45, Math.min(45, e.gamma || 0));      // 左右の傾き
  const y = Math.max(-45, Math.min(45, (e.beta || 0) - 45)); // 前後の傾き(45度=手に持って見る角度を基準に)
  document.documentElement.style.setProperty("--holoX", x.toFixed(1));
  document.documentElement.style.setProperty("--holoY", y.toFixed(1));
  const intensity = Math.min(1, (Math.abs(x) + Math.abs(y)) / 50);
  document.documentElement.style.setProperty("--holoIntensity", intensity.toFixed(2));
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
    // Android等: 2秒待ってもセンサー値が来なければ通知(iframe埋め込みやHTTP接続だと遮断される)
    holoGotEvent = false;
    setTimeout(() => { if (holoEnabled && !holoGotEvent) { log("傾きセンサーの値が取得できません。カードを指でなぞると光が動きます"); btn.textContent = "HOLO(指でなぞる)"; } }, 2000);
  } else {
    log("この端末・ブラウザは傾き検知に対応していません");
  }
}

// ---------- BGM ----------
// audio/ フォルダに各mp3を配置して使う(index.html・src/ と同じ階層)。
// ファイルが無い/読み込めない環境(プレビューなど)では静かに失敗し、ゲーム進行には影響しない。
const BGM_TRACKS = {
  home: "audio/VECTOR_CORE_HOME.mp3",
  digitalHorizon: "audio/DIGITAL_HORIZON.mp3",
  archive: "audio/ARCHIVE.mp3",
  awakening: "audio/AWAKENING.mp3",
  secret: "audio/UNKNOWN.mp3",
  vectorBattle: "audio/VECTOR_BATTLE.mp3",
  nullBreak: "audio/NULL_BREAK.mp3",
  novaOverdrive: "audio/NOVA_OVERDRIVE.mp3",
  echoMemory: "audio/ECHO_MEMORY.mp3",
  worldError: "audio/WORLD_ERROR.mp3",
  opening: "audio/TRANSCENDENT_SPEED.mp3",
};
BGM_TRACKS.ending = BGM_TRACKS.opening; // オープニングとエンドロールで同じ曲「超越した轟速」を使う
const BGM_VOLUME = 0.45;
let bgmAudio = null, currentBgmKey = null, bgmMuted = false, bgmFadeTimer = null;
function initBgmSetting() {
  bgmMuted = localStorage.getItem("vc_bgm_muted") === "1";
  updateBgmBtn();
}
function updateBgmBtn() {
  const btn = document.getElementById("bgmBtn");
  if (!btn) return;
  btn.textContent = bgmMuted ? "🔇" : "🔊";
  btn.classList.toggle("muted", bgmMuted);
}
function toggleBgmMute() {
  bgmMuted = !bgmMuted;
  localStorage.setItem("vc_bgm_muted", bgmMuted ? "1" : "0");
  updateBgmBtn();
  if (bgmAudio) bgmAudio.volume = bgmMuted ? 0 : BGM_VOLUME;
}
function fadeAudio(audio, from, to, ms, onDone) {
  const steps = 20, stepMs = ms / steps;
  let i = 0;
  const id = setInterval(() => {
    i++;
    audio.volume = from + (to - from) * (i / steps);
    if (i >= steps) { clearInterval(id); audio.volume = to; if (onDone) onDone(); }
  }, stepMs);
}
function playBgm(key) {
  if (!BGM_TRACKS[key] || currentBgmKey === key) return;
  const src = BGM_TRACKS[key];
  const prev = bgmAudio;
  const next = new Audio(src);
  next.loop = true;
  next.volume = 0;
  next.play().catch(() => {}); // プレビュー環境などファイルが無い場合は静かに失敗
  fadeAudio(next, 0, bgmMuted ? 0 : BGM_VOLUME, 500);
  if (prev) fadeAudio(prev, prev.volume, 0, 400, () => prev.pause());
  bgmAudio = next;
  currentBgmKey = key;
}
// BREAK MODE: CHAIN BREAK時に別トラックを重ねて数秒だけ鳴らす(メインは一時的に音量を下げる)
let breakLayerAudio = null;
function playBreakLayer() {
  if (bgmMuted || !bgmAudio || breakLayerAudio) return;
  const key = currentBgmKey === "novaOverdrive" ? "nullBreak" : "novaOverdrive";
  const layer = new Audio(BGM_TRACKS[key]); layer.loop = true; layer.volume = 0;
  layer.play().catch(() => {});
  breakLayerAudio = layer;
  const main = bgmAudio;
  fadeAudio(layer, 0, BGM_VOLUME * 0.7, 250);
  fadeAudio(main, main.volume, BGM_VOLUME * 0.45, 250);
  document.getElementById("app").classList.add("breakMode");
  setTimeout(() => {
    fadeAudio(layer, layer.volume, 0, 700, () => { layer.pause(); if (breakLayerAudio === layer) breakLayerAudio = null; });
    if (bgmAudio === main) fadeAudio(main, main.volume, bgmMuted ? 0 : BGM_VOLUME, 700);
    document.getElementById("app").classList.remove("breakMode");
  }, 7000);
}
// VC-060登場: 一度音を完全に消し、数秒の静寂の後に最終パートを流す
function bgmSilenceThenFinal() {
  if (breakLayerAudio) { breakLayerAudio.pause(); breakLayerAudio = null; }
  if (bgmAudio) { const a = bgmAudio; fadeAudio(a, a.volume, 0, 300, () => a.pause()); }
  bgmAudio = null; currentBgmKey = null;
  setTimeout(() => { if (G && !G.gameOver) playBgm("secret"); }, 6000);
}
function stopBgm() {
  if (!bgmAudio) return;
  const a = bgmAudio;
  fadeAudio(a, a.volume, 0, 400, () => a.pause());
  bgmAudio = null; currentBgmKey = null;
}

// ---------- 演出 ----------
function flashBanner(text, cls) {
  const b = document.getElementById("banner");
  b.textContent = text; b.className = ""; void b.offsetWidth;
  b.classList.add(cls, "show");
  setTimeout(() => { b.classList.remove("show"); b.classList.add("hidden"); }, 900);
}
function flashStat(elId, dir) {
  const el = document.getElementById(elId); if (!el) return;
  el.classList.remove("flash", "flashDown", "flashUp");
  void el.offsetWidth;
  el.classList.add(dir === "down" ? "flashDown" : dir === "up" ? "flashUp" : "flash");
  el.classList.add("shakeStat");
  setTimeout(() => el.classList.remove("flash", "flashDown", "flashUp", "shakeStat"), 450);
}
function screenFlash(cls) {
  const el = document.getElementById("screenFlashOverlay");
  el.className = ""; void el.offsetWidth;
  el.classList.add("show", cls);
  setTimeout(() => el.classList.remove("show", cls), 380);
}

// ---------- UI描画 ----------
function render() {
  { const eb = document.getElementById("emoteBtn"); if (eb) eb.classList.toggle("hidden", !(G && G.online)); }
  { const sb = document.getElementById("sixthCoreBtn"); const show = !!(G.storyMods && G.storyMods.sixthCoreAvailable && sixthCoreUnlocked()); sb.classList.toggle("hidden", !show); sb.disabled = !!G.sixthUsed || G.active !== "self"; }
  document.getElementById("turnInfo").textContent = `TURN ${G.turn} - ${G.active === "self" ? "YOUR TURN" : (G.online ? "OPPONENT TURN" : "AI TURN")}`;
  setStatText("oppCore", G.opp.core, "oppCoreStat"); setStatText("oppShield", G.opp.coreShield, "oppShieldStat");
  document.getElementById("oppEnergy").textContent = `${G.opp.energy}/${G.opp.energyMax}`;
  setStatText("oppChain", G.opp.chain, "oppChainStat");
  setStatText("selfCore", G.self.core, "selfCoreStat"); setStatText("selfShield", G.self.coreShield, "selfShieldStat");
  document.getElementById("selfEnergy").textContent = `${G.self.energy}/${G.self.energyMax}`;
  setStatText("selfChain", G.self.chain, "selfChainStat");
  document.getElementById("oppDeckCount").textContent = G.opp.deck.length;
  document.getElementById("oppHandCount").textContent = G.opp.hand.length;
  document.getElementById("oppGraveCount").textContent = G.opp.graveyard.length;
  document.getElementById("selfDeckCount").textContent = G.self.deck.length;
  document.getElementById("selfGraveCount").textContent = G.self.graveyard.length;
  renderField("oppField", "opp"); renderField("selfField", "self");
  renderProtocols("oppProtocols", "opp"); renderProtocols("selfProtocols", "self");
  renderHand();
  document.getElementById("endTurnBtn").disabled = G.active !== "self" || G.gameOver || (G.tutorial && !tutorialActionAllowed("endTurn"));
  const hintEl = document.getElementById("tutorialHint");
  if (G.tutorial) { hintEl.textContent = "📘 " + (tutorialStep().hint || "説明を読み進めよう"); hintEl.classList.remove("hidden"); hintEl.classList.remove("guideHint"); }
  else if (G.gameOver) { hintEl.classList.add("hidden"); }
  else { hintEl.textContent = "👉 " + computeActionGuide(); hintEl.classList.remove("hidden"); hintEl.classList.add("guideHint"); }
}
// ---------- 対戦中のアクションガイド(次に何をすればいいかの目安) ----------
function computeActionGuide() {
  if (G.active !== "self") return "相手のターン。少し待とう。";
  const me = G.self, foe = G.opp;
  const playableActor = me.hand.find(id => { const c = getCard(id); return c.type === "ACTOR" && (id === "VC-056" ? true : c.cost) <= me.energy; });
  const playableAction = me.hand.find(id => { const c = getCard(id); return c.type === "ACTION" && c.cost <= me.energy && !me.noMoreActionsThisTurn; });
  const playableProtocol = me.hand.find(id => { const c = getCard(id); return c.type === "PROTOCOL" && c.cost <= me.energy && me.protocols.length < RULES.PROTOCOL_MAX; });
  const readyToStrike = me.field.some(a => canActorAct(a) && foe.field.length === 0);
  const readyToAttack = me.field.some(a => canActorAct(a) && foe.field.length > 0);
  if (readyToStrike) return "相手フィールドは空だ。ACTORの「CORE STRIKE」で直接攻撃できる!";
  if (readyToAttack) return "行動できるACTORがいる。「攻撃」で相手ACTORを狙おう。";
  if (playableActor) return `${cardName(playableActor)}を「召喚」できる(ENERGYが足りている)。`;
  if (playableAction) return `${cardName(playableAction)}を「使用」できる。`;
  if (playableProtocol) return `${cardName(playableProtocol)}を「配置」できる。`;
  return "これ以上できることはない。「END TURN」でターンを終えよう。";
}
const prevStatValues = {};

// ---------- 手続き生成カードアート(カードIDごとに固有・陣営ごとにモチーフが違う) ----------
const ARTCOL = { VECTOR: ["#35e0ff", "#1b4dff"], NULL: ["#b46bff", "#3a1670"], NOVA: ["#ff9a3a", "#ff2b4d"], ECHO: ["#6bffb8", "#0f6b64"], NONE: ["#ff2bd6", "#ffe14a"] };
const _artCache = {};
function cardArtHtml(card) {
  if (_artCache[card.id]) return _artCache[card.id];
  let h = 0; for (const ch of card.id + card.name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const rnd = () => { h = (h * 1664525 + 1013904223) >>> 0; return h / 4294967296; };
  const [c1, c2] = ARTCOL[card.faction] || ARTCOL.NONE;
  const gid = "g" + card.id.replace(/\W/g, "");
  let s = `<svg class="artSvg" viewBox="0 0 100 60" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><defs><linearGradient id="${gid}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c2}" stop-opacity=".9"/><stop offset="1" stop-color="#05070f"/></linearGradient><radialGradient id="${gid}r"><stop offset="0" stop-color="${c1}" stop-opacity=".95"/><stop offset="1" stop-color="${c1}" stop-opacity="0"/></radialGradient></defs><rect width="100" height="60" fill="url(#${gid})"/>`;
  const cx = 30 + rnd() * 40, cy = 20 + rnd() * 20;
  s += `<circle cx="${cx}" cy="${cy}" r="${18 + rnd() * 10}" fill="url(#${gid}r)"/>`;
  const f = card.faction;
  if (f === "VECTOR") { for (let i = 0; i < 9; i++) { const y = rnd() * 60, x = rnd() * 60, l = 20 + rnd() * 50; s += `<path d="M${x} ${y} l${l} ${-l * 0.35}" stroke="${c1}" stroke-width="${0.6 + rnd() * 1.4}" opacity="${0.35 + rnd() * 0.5}" fill="none"/>`; } s += `<path d="M${cx - 10} ${cy + 10} L${cx + 14} ${cy} L${cx - 10} ${cy - 10} L${cx - 4} ${cy} Z" fill="#fff" opacity=".85"/>`; }
  else if (f === "NULL") { for (let i = 1; i <= 4; i++) s += `<circle cx="${cx}" cy="${cy}" r="${i * 5 + rnd() * 3}" stroke="${c1}" stroke-width=".8" fill="none" opacity="${0.8 - i * 0.15}" stroke-dasharray="${2 + rnd() * 4} ${2 + rnd() * 3}"/>`; s += `<circle cx="${cx}" cy="${cy}" r="4" fill="#000"/><path d="M${cx - 12} ${cy - 12} L${cx + 12} ${cy + 12} M${cx + 12} ${cy - 12} L${cx - 12} ${cy + 12}" stroke="#fff" stroke-width=".6" opacity=".6"/>`; }
  else if (f === "NOVA") { const n = 8 + Math.floor(rnd() * 6); for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2 + rnd() * 0.3, r1 = 5, r2 = 18 + rnd() * 16; s += `<path d="M${cx + Math.cos(a) * r1} ${cy + Math.sin(a) * r1} L${cx + Math.cos(a) * r2} ${cy + Math.sin(a) * r2}" stroke="${i % 2 ? "#fff" : c1}" stroke-width="${1 + rnd() * 1.5}" opacity=".85"/>`; } s += `<circle cx="${cx}" cy="${cy}" r="5" fill="#fff"/>`; }
  else if (f === "ECHO") { for (let i = 1; i <= 5; i++) s += `<ellipse cx="${cx}" cy="${cy}" rx="${i * 6}" ry="${i * 3.2}" stroke="${c1}" stroke-width=".7" fill="none" opacity="${0.9 - i * 0.14}"/>`; for (let i = 0; i < 6; i++) s += `<circle cx="${rnd() * 100}" cy="${rnd() * 60}" r="${0.6 + rnd()}" fill="#fff" opacity=".7"/>`; }
  else { for (let i = 0; i < 10; i++) s += `<rect x="${rnd() * 90}" y="${rnd() * 55}" width="${4 + rnd() * 24}" height="${1 + rnd() * 3}" fill="${i % 2 ? c1 : c2}" opacity=".8"/>`; }
  const t = card.type;
  if (t === "PROTOCOL") s += `<rect x="3" y="3" width="94" height="54" fill="none" stroke="${c1}" stroke-width=".8" opacity=".6"/>`;
  if (t === "CORE") s += `<circle cx="50" cy="30" r="24" fill="none" stroke="#fff" stroke-width=".6" opacity=".5"/>`;
  if (t === "ACTION") s += `<path d="M0 60 L100 0" stroke="#fff" stroke-width=".5" opacity=".35"/>`;
  s += `<rect width="100" height="60" fill="url(#${gid})" opacity="0"/></svg><span class="artGlyph">${factionGlyph(card.faction)}</span>`;
  return (_artCache[card.id] = s);
}

// ダメージ/回復の浮遊数字
function spawnFloatNum(statElId, diff) {
  const el = statElId && document.getElementById(statElId); if (!el || !diff) return;
  const f = document.createElement("span");
  f.className = "floatNum " + (diff < 0 ? "neg" : "pos");
  f.textContent = (diff > 0 ? "+" : "") + diff;
  el.appendChild(f); setTimeout(() => f.remove(), 1100);
}
function setStatText(spanId, value, statElId) {
  const span = document.getElementById(spanId);
  const prev = prevStatValues[spanId];
  if (prev !== undefined && prev !== value) {
    const dir = (typeof prev === "number" && typeof value === "number") ? (value < prev ? "down" : "up") : null;
    flashStat(statElId, dir);
    if (typeof prev === "number" && typeof value === "number" && /Core|Shield/.test(statElId || "")) spawnFloatNum(statElId, value - prev);
    if (statElId && statElId.includes("Core") && dir === "down") screenFlash("damageFlash");
  }
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
    div.dataset.instance = a.instanceId;
    if (isHoloRarity(card.rarity)) div.classList.add(`rarity-glow-${card.rarity}`, "holoFoil");
    if (isFoilRarity(card.rarity)) div.classList.add("foilFrame", `foilFrame-${card.rarity}`);
    if (hasTreasure(a.cardId)) div.classList.add("treasureCard");
    if (!knownInstanceIds[owner].has(a.instanceId)) div.classList.add("enter");
    const done = a.hasActed || (a.summonedThisTurn && !a.quickAllowed);
    if (done) div.classList.add("tappedOrDone");
    div.innerHTML = `<div class="cardArt" data-ctype="${card.type}">${cardArtHtml(card)}</div><div class="facGlyph">${factionGlyph(card.faction)}</div><div class="name">${card.name}</div><div class="stats">${(owner === "opp" && G.storyMods && G.storyMods.hideOppStats) ? `<b>?</b><i>?</i><u>?</u>` : `<b>${effAtk(a, owner)}</b><i>${effDef(a, owner)}</i><u>${effSpd(a)}</u>`}</div>`;
    if (owner === "self" && G.active === "self" && !done && !G.gameOver) {
      const row = document.createElement("div"); row.className = "actorBtnRow";
      if (G.opp.field.length > 0) { const btn = document.createElement("button"); btn.textContent = "攻撃"; btn.disabled = G.tutorial && !tutorialActionAllowed("attack"); btn.onclick = () => { if (btn.disabled) return; div.classList.add("attackAnim"); setTimeout(() => openAttackPicker(a.instanceId), 150); }; row.appendChild(btn); }
      const csBtn = document.createElement("button"); csBtn.textContent = "CORE STRIKE";
      csBtn.disabled = (G.opp.field.length > 0 && !a.unlockCoreStrike) || (G.tutorial && !tutorialActionAllowed("coreStrike"));
      csBtn.onclick = () => { div.classList.add("attackAnim"); setTimeout(() => { coreStrike("self", a.instanceId); render(); }, 150); };
      row.appendChild(csBtn); div.appendChild(row);
    }
    if (owner === "self" && G.active === "self" && !G.gameOver && a.cardId === "VC-018" && canActivateReplayUnit("self", a.instanceId)) {
      const row2 = document.createElement("div"); row2.className = "actorBtnRow";
      const rBtn = document.createElement("button"); rBtn.textContent = "REPLAY発動";
      rBtn.onclick = () => { activateReplayUnit("self", a.instanceId); render(); };
      row2.appendChild(rBtn); div.appendChild(row2);
    }
    attachCardDetailTap(div, a.cardId);
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
  showChoiceOverlay("攻撃対象を選んでください", targets.map(t => ({ label: (() => {
    const me = G.self.field.find(x => x.instanceId === attackerInstanceId);
    const hide = G.storyMods && G.storyMods.hideOppStats;
    if (!me || hide) return `${cardName(t.cardId)} (${hide ? "ATK? / DEF? / SPD?" : `ATK${effAtk(t, "opp")} / DEF${effDef(t, "opp")}`})`;
    const c = combatCalc(me, "self", t, "opp");
    const res = c.hits ? "→ 破壊できる" : c.counter ? "→ 防がれカウンターで自滅!" : "→ 防がれる";
    return `${cardName(t.cardId)} (ATK${effAtk(t, "opp")} / DEF${effDef(t, "opp")} / SPD${effSpd(t)}) ${res}${c.notes.filter(n => !/カウンター/.test(n)).length ? " [" + c.notes.filter(n => !/カウンター/.test(n)).join(",") + "]" : ""}`;
  })(), onClick: () => {
    const targetId = t.instanceId;
    const node = document.querySelector(`#oppField [data-instance="${targetId}"]`);
    attack("self", attackerInstanceId, targetId);
    const destroyed = !G.opp.field.some(a => a.instanceId === targetId);
    if (destroyed && node) { screenFlash("hitFlash"); node.classList.add("destroyAnim"); setTimeout(render, 300); }
    else render();
  } })));
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
    if (G.tutorial) {
      const allowType = card.type === "ACTOR" ? "summon" : card.type === "PROTOCOL" ? "protocol" : card.type === "CORE" ? "core" : "action";
      playable = playable && tutorialActionAllowed(allowType, cardId);
    }
    div.className = "handCard " + (playable ? "canPlay" : "cannotPlay") + (isHoloRarity(card.rarity) ? " holoFoil rarity-glow-" + card.rarity : "") + (isFoilRarity(card.rarity) ? " foilFrame foilFrame-" + card.rarity : "") + (hasTreasure(cardId) ? " treasureCard" : "");
    div.dataset.faction = card.faction;
    const statLine = card.type === "ACTOR" ? ` / ${cardId === "VC-056" ? "X" : card.atk}-${cardId === "VC-056" ? "X" : card.def}-${cardId === "VC-056" ? "X" : card.spd}` : "";
    div.innerHTML = `<div class="cardArt" data-ctype="${card.type}">${cardArtHtml(card)}</div><div class="costBadge">${cost}</div><div class="facGlyph">${factionGlyph(card.faction)}</div><div class="cname">${card.name}</div><div class="cmeta">${card.rarity} / ${card.type} / C${cost}${statLine}</div>`;
    const btn = document.createElement("button");
    btn.textContent = card.type === "ACTOR" ? "召喚" : card.type === "PROTOCOL" ? "配置" : "使用";
    btn.disabled = !playable;
    btn.onclick = () => { if (card.type === "ACTOR") summonActor("self", cardId); else if (card.type === "PROTOCOL") placeProtocol("self", cardId); else if (card.type === "CORE") useCore("self", cardId); else useAction("self", cardId); render(); };
    div.appendChild(btn);
    attachCardDetailTap(div, cardId);
    el.appendChild(div);
  }
}

function renderMulliganOverlay() {
  const wrap = document.getElementById("mulliganHand");
  wrap.innerHTML = "";
  G.self.hand.forEach((cardId, i) => {
    const card = getCard(cardId);
    const div = document.createElement("div");
    div.className = "mulliganCard" + (mulliganSelected.includes(i) ? " selected" : "") + (isHoloRarity(card.rarity) ? " holoFoil rarity-glow-" + card.rarity : "") + (isFoilRarity(card.rarity) ? " foilFrame foilFrame-" + card.rarity : "");
    div.dataset.faction = card.faction;
    div.innerHTML = `<div class="rarity ${card.rarity}">${card.rarity}</div><div class="pname">${card.name}</div><div class="pmeta">${card.type} / C${cardId === "VC-056" ? "X" : card.cost}</div>`;
    div.onclick = () => {
      const idx = mulliganSelected.indexOf(i);
      if (idx === -1) mulliganSelected.push(i); else mulliganSelected.splice(idx, 1);
      renderMulliganOverlay();
    };
    wrap.appendChild(div);
  });
  document.getElementById("mulliganSwapBtn").textContent = mulliganSelected.length ? `選んだ${mulliganSelected.length}枚を交換して始める` : "交換せず始める";
}

function openGuideScreen() {
  const list = document.getElementById("glossaryList");
  list.innerHTML = GLOSSARY.map(g => `<div class="glossaryItem"><div class="glossaryTerm">${g.term}</div><div class="glossaryText">${g.text}</div></div>`).join("");
  showScreen("guideScreen");
}

// ---------- 墓地ビューア(公開領域) ----------
function showGraveyard(owner) {
  const player = getPlayer(owner);
  document.getElementById("graveyardTitle").textContent = (owner === "self" ? "あなたの墓地" : "相手の墓地") + `(${player.graveyard.length}枚)`;
  const grid = document.getElementById("graveyardGrid");
  grid.innerHTML = "";
  if (player.graveyard.length === 0) {
    grid.innerHTML = `<div class="graveyardEmpty">墓地は空です</div>`;
  } else {
    // 新しく墓地に送られたものを先頭に表示
    [...player.graveyard].reverse().forEach(cardId => {
      const card = getCard(cardId);
      const div = document.createElement("div");
      div.className = "poolCard" + (isHoloRarity(card.rarity) ? " holoFoil rarity-glow-" + card.rarity : "") + (isFoilRarity(card.rarity) ? " foilFrame foilFrame-" + card.rarity : "");
      div.dataset.faction = card.faction;
      div.innerHTML = `<div class="cardArt" data-ctype="${card.type}">${cardArtHtml(card)}</div><div class="facGlyph">${factionGlyph(card.faction)}</div><div class="rarity ${card.rarity}">${card.rarity}</div><div class="pname">${card.name}</div><div class="pmeta">${card.type}</div>`;
      attachCardDetailTap(div, cardId);
      grid.appendChild(div);
    });
  }
  document.getElementById("graveyardOverlay").classList.remove("hidden");
}
function hideGraveyard() { document.getElementById("graveyardOverlay").classList.add("hidden"); }

// ---------- カード詳細 ----------
// カードの「余白」タップで詳細を開く。ボタン(召喚/攻撃/CORE STRIKE/デッキの+-など)上のタップでは開かないよう、
// 各カード要素のクリックハンドラ側で e.target.closest("button") を見て除外している。
function attachCardDetailTap(el, cardId) {
  el.addEventListener("click", (e) => {
    if (e.target.closest("button")) return;
    showCardDetail(cardId);
  });
}
function showCardDetail(cardId) {
  const card = getCard(cardId);
  if (!card) return;
  const isX = cardId === "VC-056";
  const box = document.getElementById("cardDetailBox");
  box.dataset.faction = card.faction;
  box.className = "" + (isHoloRarity(card.rarity) ? " holoFoil rarity-glow-" + card.rarity : "") + (isFoilRarity(card.rarity) ? " foilFrame foilFrame-" + card.rarity : "");
  document.getElementById("cardDetailGlyph").textContent = factionGlyph(card.faction);
  const rarityEl = document.getElementById("cardDetailRarity");
  rarityEl.textContent = card.rarity; rarityEl.className = "rarity " + card.rarity;
  document.getElementById("cardDetailMeta").textContent = `${card.type} / ${card.faction} / コスト${isX ? "X" : card.cost}`;
  document.getElementById("cardDetailName").textContent = card.name;
  const statsEl = document.getElementById("cardDetailStats");
  if (card.type === "ACTOR") {
    statsEl.classList.remove("hidden");
    statsEl.innerHTML = `<span>ATK <b>${isX ? "X" : card.atk}</b></span><span>DEF <i>${isX ? "X" : card.def}</i></span><span>SPD <u>${isX || card.spd === Infinity ? "X" : card.spd}</u></span>`;
  } else {
    statsEl.innerHTML = ""; statsEl.classList.add("hidden");
  }
  document.getElementById("cardDetailText").textContent = card.text || "効果テキストなし。";
  document.getElementById("cardDetailOverlay").classList.remove("hidden");
}
function hideCardDetail() { document.getElementById("cardDetailOverlay").classList.add("hidden"); }

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
const SCREEN_BGM = { menuScreen: "home", gachaScreen: "home", guideScreen: "home", deckScreen: "digitalHorizon", collectionScreen: "archive", storyScreen: "awakening" };
function showScreen(id) {
  { const ti = document.getElementById("turnInfo"); if (ti) ti.style.visibility = id === "gameScreen" ? "visible" : "hidden"; }
  ["menuScreen", "storyScreen", "gachaScreen", "deckScreen", "collectionScreen", "guideScreen", "onlineScreen", "missionScreen", "gameScreen"].forEach(s => document.getElementById(s).classList.toggle("hidden", s !== id));
  if (SCREEN_BGM[id]) { let k = SCREEN_BGM[id]; if (k === "home") { try { if (loadStoryProgress().endingSeen) k = "secret"; } catch (e) {} } playBgm(k); } // gameScreenは戦闘開始処理側でステージに応じたBGMを個別に指定する
}
function refreshMenu() {
  const deck = loadCustomDeck();
  document.getElementById("deckStatus").textContent = deck ? "カスタムデッキ(30枚)で対戦します" : "初期デッキ(N24種ベース・30枚)で対戦します";
  document.getElementById("homeCurrencyValue").textContent = loadCurrency();
  const clearedCount = loadStoryProgress().cleared.length;
  const prog = loadStoryProgress();
  const visible = STORY_STAGES.filter(s => !s.hidden || prog.trueEnd);
  document.getElementById("homeStoryProgress").textContent = `${prog.cleared.filter(id => visible.some(s => s.id === id)).length}/${visible.length}`;
  if (typeof refreshMissionBadge === "function") refreshMissionBadge();
  document.getElementById("btnUnknown").classList.toggle("hidden", !prog.endingSeen);
  { const rb = document.getElementById("replayRollBtn"); if (rb) rb.classList.toggle("hidden", !prog.endingSeen); }
  document.getElementById("signalStatus").textContent = `UNKNOWN SIGNAL ${countSignals(prog)}/6 ・ CORE MEMORY ${countMemories(prog)}/4${prog.trueEnd ? " ・ TRUE END ✔" : ""}`;
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
    div.className = "gachaCard" + (isHoloRarity(card.rarity) ? " holoFoil rarity-glow-" + card.rarity : "") + (isFoilRarity(card.rarity) ? " foilFrame foilFrame-" + card.rarity : "") + (r.isTreasure ? " treasureCard" : "");
    div.dataset.faction = card.faction;
    div.style.animationDelay = `${i * 0.25}s`;
    div.innerHTML = `<div class="cardArt" data-ctype="${card.type}">${cardArtHtml(card)}</div>${r.isTreasure ? '<div class="treasureBadge">㊙</div>' : ""}<div class="facGlyph">${factionGlyph(card.faction)}</div><div class="rarity ${card.rarity}">${card.rarity}</div><div class="grname">${card.name}</div><div class="pmeta">${card.type}</div>`;
    attachCardDetailTap(div, r.id);
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
    const div = document.createElement("div"); div.className = "poolCard" + (isHoloRarity(card.rarity) ? " holoFoil rarity-glow-" + card.rarity : "") + (isFoilRarity(card.rarity) ? " foilFrame foilFrame-" + card.rarity : "") + (hasTreasure(card.id) ? " treasureCard" : "");
    div.dataset.faction = card.faction;
    div.innerHTML = `<div class="cardArt" data-ctype="${card.type}">${cardArtHtml(card)}</div><div class="facGlyph">${factionGlyph(card.faction)}</div><div class="rarity ${card.rarity}">${card.rarity}</div><div class="pname">${card.name}</div><div class="pmeta">${card.type} / C${card.id === "VC-056" ? "X" : card.cost}</div><div class="ownedCount">所持: ${owned}</div>
      <div class="stepper"><button data-a="-1">-</button><span>${count}</span><button data-a="1">+</button></div>`;
    div.querySelector('button[data-a="-1"]').onclick = () => { if (count > 0) { workingDeckCounts[card.id] = count - 1; renderDeckScreen(); } };
    div.querySelector('button[data-a="1"]').onclick = () => { if (count < RULES.MAX_COPIES && count < owned && totalDeckCount() < RULES.DECK_SIZE) { workingDeckCounts[card.id] = count + 1; renderDeckScreen(); } };
    attachCardDetailTap(div, card.id);
    grid.appendChild(div);
  }
}

// ---------- カード図鑑 ----------
function openCollectionScreen() {
  const grid = document.getElementById("collectionGrid"); grid.innerHTML = "";
  for (const card of CARD_POOL) {
    const owned = ownedCount(card.id);
    const treasureOwned = owned > 0 && hasTreasure(card.id);
    const div = document.createElement("div"); div.className = "poolCard" + (owned === 0 ? " locked" : "") + (owned > 0 && isHoloRarity(card.rarity) ? " holoFoil rarity-glow-" + card.rarity : "") + (owned > 0 && isFoilRarity(card.rarity) ? " foilFrame foilFrame-" + card.rarity : "") + (treasureOwned ? " treasureCard" : "");
    if (owned > 0) div.dataset.faction = card.faction;
    div.innerHTML = `${owned > 0 ? `<div class="cardArt" data-ctype="${card.type}">${cardArtHtml(card)}</div><div class="facGlyph">${factionGlyph(card.faction)}</div>` : ""}${treasureOwned ? '<div class="treasureBadge">㊙</div>' : ""}<div class="rarity ${card.rarity}">${card.rarity}</div><div class="pname">${owned > 0 ? card.name : "???"}</div><div class="pmeta">${owned > 0 ? `${card.type} / C${card.id === "VC-056" ? "X" : card.cost}` : "未所持"}</div>${owned > 0 ? `<div class="ownedCount">所持: ${owned}${treasureOwned ? " (㊙あり)" : ""}</div>` : ""}`;
    if (owned > 0) attachCardDetailTap(div, card.id);
    grid.appendChild(div);
  }
  showScreen("collectionScreen");
}

