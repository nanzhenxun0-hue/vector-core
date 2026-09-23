/* ---------- engine.js: ゲームエンジン本体(ルール・戦闘・AI・チュートリアル) ---------- */
// ---------- プレイヤー状態 ----------
function newPlayer(name, deckList) {
  return {
    name, core: RULES.CORE_INITIAL, coreMax: RULES.CORE_MAX, coreShield: 0,
    energy: 1, energyMax: 1, chain: 0, chainCapThisTurn: null,
    hand: [], deck: buildDeckFor(deckList), graveyard: [], exile: [],
    field: [], protocols: [],
    usedPhantomRevive: false, usedVectorCoreUltimate: false, awakening: false,
    noMoreActionsThisTurn: false, undefinedX: 1 + Math.floor(Math.random() * 10),
  };
}
function draw(player, n = 1) { for (let i = 0; i < n; i++) { const c = player.deck.shift(); if (c) player.hand.push(c); } }

// ---------- ゲーム状態 ----------
let G = null;

function log(msg) {
  const area = document.getElementById("logArea");
  const div = document.createElement("div"); div.textContent = msg;
  area.appendChild(div); area.scrollTop = area.scrollHeight;
}
function getPlayer(who) { return who === "self" ? G.self : G.opp; }
function other(who) { return who === "self" ? "opp" : "self"; }
function isHoloRarity(rarity) { return ["SR", "UR", "XR", "SEC"].includes(rarity); }
// ---------- 実効ステータス ----------
function effAtk(actor, owner) {
  let v = actor.atk + (actor.tempAtk || 0);
  const me = getPlayer(owner);
  if (actor.cardId === "VC-005" && me.chain >= 3) v += 20;
  if (actor.cardId === "VC-012" && me.coreShield > 0) v += 20;
  if (actor.cardId !== "VC-035" && getCard(actor.cardId).faction === "NOVA" && me.field.some(a => a.cardId === "VC-035")) v += 20;
  return v;
}
function effDef(actor, owner) {
  let v = actor.def + (actor.tempDef || 0);
  const me = getPlayer(owner);
  if (actor.cardId === "VC-007") v += 10 * (actor.watcherUses || 0);
  if (actor.cardId === "VC-019" && me.graveyard.length >= 5) v += 30;
  return v;
}
function effSpd(actor) { return (actor.spd ?? 0) + (actor.tempSpd || 0); }

function pickBestOwnActor(player, excludeInstanceId) {
  const cs = player.field.filter(a => a.instanceId !== excludeInstanceId);
  if (cs.length === 0) return null;
  return cs.reduce((b, a) => (a.atk > b.atk ? a : b), cs[0]);
}
function pickBestGraveyardActor(player) {
  const actorIds = player.graveyard.filter(id => getCard(id).type === "ACTOR");
  if (actorIds.length === 0) return null;
  return actorIds.reduce((best, id) => (getCard(id).atk > getCard(best).atk ? id : best), actorIds[0]);
}

function makeActorInstance(card, costOverride) {
  const isUndefined = card.id === "VC-056";
  return {
    instanceId: uid(), cardId: card.id,
    atk: isUndefined ? costOverride : card.atk, def: isUndefined ? costOverride : card.def, spd: isUndefined ? costOverride : card.spd,
    summonedThisTurn: true, hasActed: false, tapped: false,
    tempAtk: 0, tempDef: 0, tempSpd: 0,
    watcherUses: 0, driverUses: 0, unlockCoreStrike: false, overclockUsed: false,
    architectUsed: false, zeroUsed: false, omegaUsed: false, ignitionActive: false,
    quickAllowed: (card.keywords || []).includes("QUICK"),
  };
}

// ---------- ON SUMMON ----------
function runOnSummon(owner, actor) {
  const me = getPlayer(owner), foe = getPlayer(other(owner));
  switch (actor.cardId) {
    case "VC-001": if (me.chain === 0) me.chain = 1; break;
    case "VC-002": log(`${me.name}: デッキの一番上を確認した`); break;
    case "VC-004": { const t = pickBestOwnActor(me, actor.instanceId); if (t) { t.tempSpd += 20; log(`${me.name}: ${cardName(t.cardId)}のSPD+20`); } break; }
    case "VC-006": if (foe.chain >= 3) foe.chain -= 1; break;
    case "VC-010": if (foe.chain >= 2) foe.chain = Math.max(0, foe.chain - 2); break;
    case "VC-014": me.coreShield = Math.min(RULES.CORE_SHIELD_MAX, me.coreShield + 1); break;
    case "VC-017": if (me.graveyard.length >= 3) draw(me, 1); break;
    case "VC-020": { const top = me.graveyard[me.graveyard.length - 1]; if (top && getCard(top).type === "ACTION") draw(me, 1); break; }
    case "VC-028": { const others = me.field.filter(a => a.instanceId !== actor.instanceId && getCard(a.cardId).effect); if (others.length) { const t = others[others.length - 1]; log(`${me.name}: ${cardName(t.cardId)}のON SUMMONを再発動`); runOnSummon(owner, t); } break; }
    case "VC-029": if (foe.chain >= 4) { foe.chain = 0; actor.hasActed = true; log(`${me.name}: NULL EXECUTORが相手CHAINを0にした`); } break;
    case "VC-030": if (foe.hand.length > 0) { const r = foe.hand[Math.floor(Math.random() * foe.hand.length)]; log(`${me.name}: 相手の手札に「${cardName(r)}」を確認`); } break;
    case "VC-041": me.chain = 5; log(`${me.name}: VECTOR OVERDRIVEがCHAINを5にした`); break;
    case "VC-051": me.chain = 5; log(`${me.name}: VECTOR//ZEROがCHAINを5にした`); break;
    case "VC-053": foe.coreShield = 0; log(`${me.name}: NOVA//STARFALLが相手SHIELDを全破壊`); break;
    case "VC-056": actor.atk += me.chain; actor.def += me.chain; actor.spd += me.chain; log(`${me.name}: THE UNDEFINEDの全ステータスにCHAIN分(+${me.chain})上昇`); break;
  }
}

function runOnDestroy(owner, actor) {
  const me = getPlayer(owner);
  switch (actor.cardId) {
    case "VC-016": { const idx = me.graveyard.findIndex(id => getCard(id).type === "ACTION"); if (idx !== -1) { const [c] = me.graveyard.splice(idx, 1); me.deck.push(c); } break; }
    case "VC-036": {
      if (!me.usedPhantomRevive) {
        me.usedPhantomRevive = true;
        me.graveyard = me.graveyard.filter(id => id !== actor.cardId);
        const revived = makeActorInstance(getCard(actor.cardId)); revived.def = 20;
        me.field.push(revived);
        log(`${me.name}: ECHO PHANTOMが墓地から復活(DEF20)`);
      }
      break;
    }
    case "VC-054": {
      const pool = me.graveyard.slice(-3);
      const reviveId = pool.find(id => getCard(id).type === "ACTOR" && id !== actor.cardId) || pool.find(id => getCard(id).type === "ACTOR");
      if (reviveId) { me.graveyard.splice(me.graveyard.lastIndexOf(reviveId), 1); me.field.push(makeActorInstance(getCard(reviveId))); log(`${me.name}: ECHO//ETERNALが${cardName(reviveId)}を墓地から復活`); }
      break;
    }
  }
}
function runOnDestroyEnemy(owner, actor) {
  const foe = getPlayer(other(owner));
  switch (actor.cardId) {
    case "VC-015": actor.unlockCoreStrike = true; log(`${cardName(actor.cardId)}: このターンCORE STRIKE可能`); break;
    case "VC-044": actor.unlockCoreStrike = true; log(`${cardName(actor.cardId)}: このターンCORE STRIKE可能`); break;
    case "VC-053": foe.core -= 1; log(`${cardName(actor.cardId)}: 相手CORE-1(${foe.core})`); checkGameEnd(); break;
  }
}

function runActionEffect(owner, cardId) {
  const me = getPlayer(owner), foe = getPlayer(other(owner));
  switch (cardId) {
    case "VC-021": draw(me, 1); break;
    case "VC-022": { const t = pickBestOwnActor(me, null); if (t) t.tempSpd += 30; break; }
    case "VC-023": foe.chain = Math.max(0, foe.chain - 1); break;
    case "VC-024": me.coreShield = Math.min(RULES.CORE_SHIELD_MAX, me.coreShield + 1); break;
    case "VC-039": incrementChain(owner, 2); break;
    case "VC-040": { const t = me.hand.map(id => getCard(id)).filter(c => c.type === "ACTOR" && c.cost <= 2).sort((a, b) => b.cost - a.cost)[0]; if (t) { me.hand.splice(me.hand.indexOf(t.id), 1); const a = makeActorInstance(t); me.field.push(a); runOnSummon(owner, a); log(`${me.name}: RAPID DEPLOYで${t.name}を無償召喚`); } break; }
    case "VC-045": { const rId = pickBestGraveyardActor(me); if (rId) { me.graveyard.splice(me.graveyard.lastIndexOf(rId), 1); me.field.push(makeActorInstance(getCard(rId))); log(`${me.name}: ECHO REBIRTHで${cardName(rId)}を復活`); } break; }
    case "VC-047": if (me.core >= 5 && foe.core >= 5) { const t = me.core; me.core = foe.core; foe.core = t; log(`${me.name}: CORE INVERSIONでCOREを入れ替えた`); checkGameEnd(); } break;
    case "VC-048": { const t = pickBestOwnActor(me, null); if (t) { t.tempAtk += 100; t.ignitionActive = true; } break; }
    case "VC-057":
      me.field = []; foe.field = []; me.protocols = []; foe.protocols = [];
      me.chain = 0; foe.chain = 0; me.core = 5; foe.core = 5;
      me.noMoreActionsThisTurn = true;
      log(`${me.name}: WORLD RESET発動。両者のフィールドとCOREが初期化された`);
      flashBanner("WORLD RESET", "chainBreak");
      checkGameEnd();
      break;
  }
}

function canUseCore(owner, cardId) {
  const me = getPlayer(owner);
  if (cardId === "VC-058") return me.core <= 4;
  if (cardId === "VC-059") return me.core <= 1 && !me.usedVectorCoreUltimate;
  return true;
}
function useCore(owner, cardId) {
  const me = getPlayer(owner), card = getCard(cardId);
  if (!canUseCore(owner, cardId)) { log(`${me.name}: ${card.name}は条件を満たしておらず使用できない`); return false; }
  if (me.energy < card.cost) return false;
  const idx = me.hand.indexOf(cardId); if (idx === -1) return false;
  me.hand.splice(idx, 1); me.energy -= card.cost;
  const foe = getPlayer(other(owner));
  if (cardId === "VC-055") {
    if (me.core <= 3) me.core += 2; else if (me.core >= 6) foe.core -= 1;
    me.chainCapThisTurn = 5; me.chain = Math.min(me.chain, 5);
    log(`${me.name}: CORE BREAK: AWAKENING発動`);
  } else if (cardId === "VC-058") {
    me.core = 6; me.awakening = true;
    log(`${me.name}: SIXTH COREが出現。COREが6に`); flashBanner("AWAKENING", "awaken");
  } else if (cardId === "VC-059") {
    me.core = 5; if (foe.core >= 6) foe.core = 5;
    me.usedVectorCoreUltimate = true;
    log(`${me.name}: VECTOR//CORE発動`); flashBanner("VECTOR//CORE", "awaken");
  }
  me.graveyard.push(cardId);
  checkGameEnd();
  return true;
}

function placeProtocol(owner, cardId) {
  const me = getPlayer(owner), card = getCard(cardId);
  if (me.energy < card.cost) return false;
  const idx = me.hand.indexOf(cardId); if (idx === -1) return false;
  if (me.protocols.length >= RULES.PROTOCOL_MAX) { const d = me.protocols.shift(); me.graveyard.push(d.cardId); log(`${me.name}: PROTOCOL上限のため${cardName(d.cardId)}を墓地へ`); }
  me.hand.splice(idx, 1); me.energy -= card.cost;
  me.protocols.push({ instanceId: uid(), cardId });
  log(`${me.name}: ${card.name} を配置`);
  return true;
}

// ---------- CHAIN(ストーリー特殊ルール反映) ----------
function incrementChain(owner, amount) {
  const me = getPlayer(owner), foe = getPlayer(other(owner));
  if (foe.field.some(a => a.cardId === "VC-043")) amount = Math.max(0, amount - 1);
  if (G && G.storyMods && G.storyMods.opponentChainMultiplier && owner === "opp") amount *= G.storyMods.opponentChainMultiplier;
  if (amount <= 0) return;
  me.chain += amount;
  if (me.chainCapThisTurn != null) me.chain = Math.min(me.chain, me.chainCapThisTurn);
  for (const a of me.field) {
    if (a.cardId === "VC-026" && (a.driverUses || 0) < 3) { a.tempAtk += 10; a.driverUses = (a.driverUses || 0) + 1; }
    if (a.cardId === "VC-042" && !a.architectUsed) { a.architectUsed = true; draw(me, 1); }
  }
  if (me.chain >= RULES.CHAIN_BREAK_AT) {
    me.chain = 0;
    log(`${me.name}: CHAIN BREAK 発生!`);
    flashBanner("CHAIN BREAK", "chainBreak");
    if (G && G.storyStage && G.storyStage.id === "S05") log("(STAGE05の目標「CHAIN BREAKを発生させる」を達成!)");
    const architect = me.field.find(a => a.cardId === "VC-042");
    if (architect) { me.field = me.field.filter(a => a.instanceId !== architect.instanceId); me.graveyard.push(architect.cardId); log(`${me.name}: CHAIN ARCHITECTが破壊された`); }
    if (me.field.some(a => a.cardId === "VC-051")) { me.chain = 2; log(`${me.name}: VECTOR//ZEROの効果でCHAINが2に`); }
    if (foe.field.some(a => a.cardId === "VC-043")) { foe.coreShield = Math.min(RULES.CORE_SHIELD_MAX, foe.coreShield + 2); log(`${foe.name}: NULL ABSOLUTEがSHIELD+2`); }
  }
}

// ---------- ターン進行 ----------
function startTurn() {
  const me = getPlayer(G.active);
  me.energyMax = Math.min(RULES.ENERGY_MAX, me.energyMax + 1);
  me.energy = me.energyMax;
  me.chainCapThisTurn = null;
  me.noMoreActionsThisTurn = false;
  for (const a of me.field) {
    a.summonedThisTurn = false; a.hasActed = false; a.tapped = false;
    a.tempSpd = 0; a.tempAtk = 0; a.tempDef = 0;
    a.unlockCoreStrike = false; a.watcherUses = 0; a.driverUses = 0;
    a.overclockUsed = false; a.architectUsed = false; a.zeroUsed = false; a.omegaUsed = false;
    if (a.cardId === "VC-037") { const idx = me.graveyard.findIndex(id => getCard(id).type === "ACTION"); if (idx !== -1) { const [c] = me.graveyard.splice(idx, 1); me.deck.push(c); } }
  }
  for (const p of me.protocols) { if (p.cardId === "VC-050" && me.graveyard.length >= 7) draw(me, 1); }
  // ストーリー特殊ルール: 敵はCORE SHIELDを持てない
  if (G && G.storyMods && G.storyMods.opponentNoShield) G.opp.coreShield = 0;

  const isFirstTurn = G.turn === 1;
  if (isFirstTurn && G.active === G.firstPlayer) { /* no draw */ }
  else if (isFirstTurn && G.active !== G.firstPlayer) draw(me, 2);
  else draw(me, 1);

  render();
  log(`--- ${me.name} のターン(${G.turn}) ---`);
  if (G.active === "opp") setTimeout(runAiTurn, 700);
  if (G.tutorial && G.active === "self") {
    const st = tutorialStep();
    if (st && st.deferToTurnStart && !st._shown) { st._shown = true; showTutorialStepIntro(); }
  }
  startTurnTimer();
}

// ---------- 30秒ターンタイマー ----------
// 正式ルール: 1ターン30秒。時間切れで即座にターン終了(自動処理中/ダイアログ表示中は進行しない)。
// チュートリアル中は操作説明を優先するためタイマーを回さない。
let turnTimerInterval = null;
const TURN_TIME_LIMIT = 30;
function stopTurnTimer() {
  if (turnTimerInterval) { clearInterval(turnTimerInterval); turnTimerInterval = null; }
  const el = document.getElementById("turnTimerStat");
  if (el) el.classList.add("hidden");
}
function startTurnTimer() {
  stopTurnTimer();
  if (!G || G.gameOver || G.tutorial || G.active !== "self") return;
  G.turnTimeLeft = TURN_TIME_LIMIT;
  const stat = document.getElementById("turnTimerStat");
  const val = document.getElementById("turnTimerVal");
  if (!stat || !val) return;
  stat.classList.remove("hidden", "warn");
  val.textContent = G.turnTimeLeft;
  turnTimerInterval = setInterval(() => {
    if (!G || G.gameOver || G.active !== "self") { stopTurnTimer(); return; }
    // ダイアログ/結果オーバーレイ/カード詳細表示中は時間を止める(選択待ち中は進行しない)
    const blocked = !document.getElementById("dialogueOverlay").classList.contains("hidden")
      || !document.getElementById("overlay").classList.contains("hidden")
      || !document.getElementById("cardDetailOverlay").classList.contains("hidden")
      || !document.getElementById("mulliganOverlay").classList.contains("hidden");
    if (blocked) return;
    G.turnTimeLeft -= 1;
    val.textContent = Math.max(0, G.turnTimeLeft);
    stat.classList.toggle("warn", G.turnTimeLeft <= 10);
    if (G.turnTimeLeft <= 0) {
      stopTurnTimer();
      log("時間切れ。ターンを自動終了した。");
      endTurn();
    }
  }, 1000);
}

function endTurn() {
  if (G.tutorial && G.active === "self" && tutorialActionAllowed("endTurn")) tutorialStepCompleted();
  const me = getPlayer(G.active);
  for (const p of me.protocols) {
    if (p.cardId === "VC-049" && (me.actionsUsedThisTurn || 0) >= 2) draw(me, 1);
    if (p.cardId === "VC-046" && me.lastActionUsed) { const idx = me.graveyard.lastIndexOf(me.lastActionUsed); if (idx !== -1) { const [c] = me.graveyard.splice(idx, 1); me.deck.push(c); } }
  }
  me.actionsUsedThisTurn = 0; me.lastActionUsed = null;
  me.chain = 0; me.energy = 0;
  G.active = other(G.active);
  if (G.active === G.firstPlayer) G.turn += 1;
  render();
  startTurn();
}

// ---------- 召喚・使用 ----------
function summonActor(owner, cardId) {
  const me = getPlayer(owner), card = getCard(cardId);
  const cost = cardId === "VC-056" ? me.undefinedX : card.cost;
  if (me.energy < cost) return false;
  const idx = me.hand.indexOf(cardId); if (idx === -1) return false;
  me.hand.splice(idx, 1); me.energy -= cost;
  const actor = makeActorInstance(card, cardId === "VC-056" ? me.undefinedX : undefined);
  me.field.push(actor);
  runOnSummon(owner, actor);
  log(`${me.name}: ${card.name} を召喚`);
  if (owner === "self" && G.tutorial && tutorialActionAllowed("summon", cardId)) tutorialStepCompleted();
  return true;
}
function useAction(owner, cardId) {
  const me = getPlayer(owner), foe = getPlayer(other(owner));
  if (me.noMoreActionsThisTurn) { log(`${me.name}: このターンはこれ以上ACTIONを使用できない`); return false; }
  const card = getCard(cardId);
  if (me.energy < card.cost) return false;
  const omega = foe.field.find(a => a.cardId === "VC-052" && !a.omegaUsed);
  if (omega && me.chain >= 5) {
    omega.omegaUsed = true;
    const idx = me.hand.indexOf(cardId); if (idx === -1) return false;
    me.hand.splice(idx, 1); me.energy -= card.cost; me.graveyard.push(cardId);
    log(`${foe.name}のNULL//OMEGAが${card.name}を無効化した(NULLIFIED)`);
    return true;
  }
  const idx = me.hand.indexOf(cardId); if (idx === -1) return false;
  me.hand.splice(idx, 1); me.energy -= card.cost;
  runActionEffect(owner, cardId);
  me.graveyard.push(cardId);
  me.actionsUsedThisTurn = (me.actionsUsedThisTurn || 0) + 1;
  me.lastActionUsed = cardId;
  incrementChain(owner, 1);
  log(`${me.name}: ${card.name} を使用`);
  const zero = me.field.find(a => a.cardId === "VC-051" && !a.zeroUsed);
  if (zero) { zero.zeroUsed = true; me.energy += 1; log(`${me.name}: VECTOR//ZEROがENERGY+1`); }
  if (owner === "self" && G.tutorial && tutorialActionAllowed("action", cardId)) tutorialStepCompleted();
  return true;
}

// ---------- 戦闘 ----------
function canActorAct(actor) { if (actor.hasActed) return false; if (actor.summonedThisTurn && !actor.quickAllowed) return false; return true; }

function attack(owner, instanceId, targetInstanceId) {
  const me = getPlayer(owner), foe = getPlayer(other(owner));
  const attacker = me.field.find(a => a.instanceId === instanceId);
  const defender = foe.field.find(a => a.instanceId === targetInstanceId);
  if (!attacker || !defender || !canActorAct(attacker)) return;
  attacker.hasActed = true;
  const a = effAtk(attacker, owner), d = effDef(defender, other(owner));
  if (a >= d) {
    foe.field = foe.field.filter(x => x.instanceId !== targetInstanceId);
    if (attacker.cardId === "VC-038") { foe.exile.push(defender.cardId); log(`${me.name}: MEMORY EATERが${cardName(defender.cardId)}をEXILE`); }
    else foe.graveyard.push(defender.cardId);
    log(`${me.name}の${cardName(attacker.cardId)}が${cardName(defender.cardId)}を破壊`);
    if (attacker.ignitionActive) { foe.coreShield = Math.max(0, foe.coreShield - 1); log(`${me.name}: NOVA IGNITIONで相手SHIELD-1`); }
    runOnDestroy(other(owner), defender);
    runOnDestroyEnemy(owner, attacker);
  } else {
    log(`${me.name}の${cardName(attacker.cardId)}の攻撃は防がれた`);
  }
  if (attacker.cardId === "VC-033") attacker.def = Math.max(0, attacker.def - 10);
  if (attacker.cardId === "VC-027" && !attacker.overclockUsed && me.chain >= 5) { attacker.overclockUsed = true; me.chain -= 1; attacker.hasActed = false; log(`${me.name}: OVERCLOCKERが追加行動可能に`); }
  if (attacker.cardId === "VC-041" && me.chain >= 5 && foe.field.length === 0) { attacker.hasActed = false; coreStrike(owner, attacker.instanceId); }
  checkGameEnd();
  if (owner === "self" && G.tutorial && tutorialActionAllowed("attack")) tutorialStepCompleted();
}

function coreStrike(owner, instanceId) {
  const me = getPlayer(owner), foe = getPlayer(other(owner));
  const attacker = me.field.find(a => a.instanceId === instanceId);
  if (!attacker || !canActorAct(attacker)) return;
  if (attacker.summonedThisTurn && attacker.quickAllowed) { log("QUICK FRAMEは召喚ターンにCORE STRIKEできない"); return; }
  if (foe.field.some(a => a.cardId === "VC-031")) { log("相手のVOID PRISONによりCORE STRIKEできない"); return; }
  if (foe.field.length > 0 && !attacker.unlockCoreStrike) { log("相手ACTORが存在するためCORE STRIKEできない"); return; }
  attacker.hasActed = true;
  const preCore = foe.core;
  if (foe.coreShield > 0) {
    foe.coreShield -= 1;
    if (attacker.cardId === "VC-034" && foe.coreShield > 0) { foe.coreShield -= 1; log(`${me.name}: CORE BREAKERがSHIELDを追加破壊`); }
    log(`${me.name}のCORE STRIKEはSHIELDに防がれた`);
    return;
  }
  const guard = foe.field.find(a => a.cardId === "VC-009" && !a.tapped);
  if (guard) { guard.tapped = true; log(`${foe.name}のNULL GUARDがCORE STRIKEを無効化した`); return; }
  foe.core -= 1;
  log(`${me.name}のCORE STRIKE成功!(相手CORE ${foe.core})`);
  flashBanner("CORE STRIKE", "coreStrike");
  if (attacker.cardId === "VC-013") foe.chain = Math.max(0, foe.chain - 1);
  if (attacker.cardId === "VC-032" && preCore >= 5) { foe.core -= 1; log(`${me.name}: CORE THIEFが追加で相手CORE-1`); }
  checkGameEnd();
  if (owner === "self" && G.tutorial && tutorialActionAllowed("coreStrike")) tutorialStepCompleted();
}

function checkGameEnd() {
  if (!G || G.gameOver) return;
  if (G.self.core <= 0 || G.opp.core <= 0) {
    G.gameOver = true;
    stopTurnTimer();
    const win = G.opp.core <= 0 && G.self.core > 0;
    const draw = G.self.core <= 0 && G.opp.core <= 0;
    addCurrency(win ? 30 : (draw ? 15 : 10));
    const msg = draw ? "引き分け" : (win ? "勝利!" : "敗北... AIの勝利");
    if (G.storyStage) endStoryBattle(win && !draw, msg);
    else showResultOverlay(msg);
  }
}

// ---------- 簡易AI ----------
function runAiTurn() {
  if (G && G.tutorial) { log("(チュートリアル中はAIは待機している)"); setTimeout(endTurn, 500); return; }
  const me = G.opp, foe = G.self;
  let played = true;
  while (played) { played = false; const p = me.hand.map(id => getCard(id)).filter(c => c.type === "ACTOR" && (c.id === "VC-056" ? me.undefinedX : c.cost) <= me.energy).sort((a, b) => a.cost - b.cost); if (p.length) { summonActor("opp", p[0].id); played = true; render(); } }
  played = true;
  while (played) { played = false; const p = me.hand.map(id => getCard(id)).filter(c => c.type === "ACTION" && c.cost <= me.energy && !me.noMoreActionsThisTurn); if (p.length) { useAction("opp", p[0].id); played = true; render(); } }
  played = true;
  while (played) { played = false; const p = me.hand.map(id => getCard(id)).filter(c => c.type === "PROTOCOL" && c.cost <= me.energy); if (p.length && me.protocols.length < RULES.PROTOCOL_MAX) { placeProtocol("opp", p[0].id); played = true; render(); } }
  played = true;
  while (played) { played = false; const p = me.hand.map(id => getCard(id)).filter(c => c.type === "CORE" && c.cost <= me.energy && canUseCore("opp", c.id)); if (p.length) { useCore("opp", p[0].id); played = true; render(); } }
  const order = [...me.field].sort((x, y) => effSpd(y) - effSpd(x));
  for (const actor of order) {
    if (!canActorAct(actor)) continue;
    if (foe.field.length === 0) coreStrike("opp", actor.instanceId);
    else { const targets = [...foe.field].sort((x, y) => effDef(x, "self") - effDef(y, "self")); const w = targets.find(t => effAtk(actor, "opp") >= effDef(t, "self")); attack("opp", actor.instanceId, (w || targets[0]).instanceId); }
    render();
  }
  log("AIがターンを終了");
  setTimeout(endTurn, 500);
}

// ---------- マリガン(初手交換) ----------
// 正式ルール: 手札5枚のうち好きな枚数をデッキに戻してシャッフルし、同じ枚数を引き直す。1回だけ。
function mulliganExchange(player, indices) {
  if (!indices.length) return;
  const sorted = [...indices].sort((a, b) => b - a); // 後ろから取り除く
  const removed = [];
  for (const i of sorted) { const [id] = player.hand.splice(i, 1); removed.push(id); }
  player.deck.push(...removed);
  shuffle(player.deck);
  draw(player, removed.length);
}
function aiAutoMulligan(player) {
  // 簡易AI: コスト5以上の重いカードを戻して引き直す(最大3枚まで)
  const indices = player.hand.map((id, i) => (getCard(id).cost >= 5 ? i : -1)).filter(i => i !== -1).slice(0, 3);
  mulliganExchange(player, indices);
}
let mulliganSelected = [];
function beginMulliganPhase(afterFn) {
  aiAutoMulligan(G.opp);
  mulliganSelected = [];
  render();
  renderMulliganOverlay();
  document.getElementById("mulliganOverlay").classList.remove("hidden");
  document.getElementById("mulliganKeepBtn").onclick = () => { finishMulliganPhase([], afterFn); };
  document.getElementById("mulliganSwapBtn").onclick = () => { finishMulliganPhase(mulliganSelected, afterFn); };
}
function finishMulliganPhase(indices, afterFn) {
  const count = indices.length;
  mulliganExchange(G.self, indices);
  document.getElementById("mulliganOverlay").classList.add("hidden");
  if (count) log(`あなた: マリガンで${count}枚を交換した`);
  render();
  afterFn();
}

// ---------- 実践チュートリアル(STAGE01用) ----------
const TUTORIAL_STEPS = [
  { allow: { type: "summon", cardId: "VC-001" }, explain: "ENERGYはカードを使うためのリソースだ。今、ENERGYが1ある。\n手札のVECTOR RUNNER(コスト1)を召喚してみよう。", hint: "VECTOR RUNNERを「召喚」しよう" },
  { allow: { type: "action", cardId: "VC-022" }, explain: "ACTIONカードは1回使い切りの効果だ。使うとCHAINが1増える。\nVECTOR BOOSTを使ってみよう。", hint: "VECTOR BOOSTを「使用」しよう" },
  { allow: { type: "endTurn" }, explain: "行動が終わったら、END TURNでターンを相手に渡そう。", hint: "「END TURN」をタップ" },
  { allow: { type: "attack" }, explain: "相手のACTORが現れた。ATKがDEF以上なら相手を撃破できる。\n自分のACTORで攻撃してみよう。", hint: "自分のACTORで「攻撃」しよう", deferToTurnStart: true },
  { allow: { type: "endTurn" }, explain: "1体のACTORが行動できるのは1ターンに1回だけだ。\nもう一度END TURNでターンを終えよう。", hint: "「END TURN」をタップ" },
  { allow: { type: "coreStrike" }, explain: "相手フィールドにACTORがいなければ、COREへ直接攻撃(CORE STRIKE)できる。\n試してみよう。", hint: "「CORE STRIKE」を使おう", deferToTurnStart: true },
];
function tutorialStep() { return (G && G.tutorial) ? TUTORIAL_STEPS[G.tutorial.step] : null; }
function tutorialActionAllowed(type, cardId) {
  const st = tutorialStep();
  if (!st) return true;
  if (st.allow.type !== type) return false;
  if (st.allow.cardId && cardId !== st.allow.cardId) return false;
  return true;
}
function showTutorialStepIntro() {
  const st = tutorialStep();
  if (!st) return;
  showDialogue([{ s: "SYSTEM", t: st.explain }], () => render());
}
function tutorialStepCompleted() {
  if (!G.tutorial) return;
  G.tutorial.step += 1;
  if (G.tutorial.step >= TUTORIAL_STEPS.length) { completeTutorial(); return; }
  const next = TUTORIAL_STEPS[G.tutorial.step];
  // 次の指示(召喚/使用)を実行できるよう、不足分のENERGYを補充して進行不能を防ぐ
  if ((next.allow.type === "action" || next.allow.type === "summon") && next.allow.cardId) {
    const need = getCard(next.allow.cardId).cost;
    if (G.self.energyMax < need) G.self.energyMax = need;
    if (G.self.energy < need) G.self.energy = need;
  }
  if (!next.deferToTurnStart) showTutorialStepIntro();
  render();
}
function completeTutorial() {
  const stage = G.storyStage;
  G.tutorial = null;
  const closing = [{ s: "VECTOR", t: "……悪くないな。基本操作はもう身体が覚えたはずだ。" }].concat(stage.outro || []);
  showDialogue(closing, () => { markStageCleared(stage.id); showScreen("storyScreen"); renderStoryList(); });
}
function startTutorialBattle(stage) {
  const selfDeckList = loadCustomDeck() || defaultDeckList();
  knownInstanceIds.self = new Set(); knownInstanceIds.opp = new Set();
  G = { self: newPlayer("YOU", selfDeckList), opp: newPlayer("AI", defaultDeckList()), active: "self", turn: 1, firstPlayer: "self", gameOver: false, storyStage: stage, storyMods: null, tutorial: { step: 0 } };
  G.self.hand = ["VC-001", "VC-022"];
  G.self.energy = 1; G.self.energyMax = 1;
  const oppActor = makeActorInstance(getCard("VC-011")); // NOVA SOLDIER、練習用にDEFを下げておく
  oppActor.def = 30;
  G.opp.field = [oppActor];
  TUTORIAL_STEPS.forEach(s => { s._shown = false; });
  document.getElementById("logArea").innerHTML = "";
  log(`STAGE ${stage.id}「${stage.title}」開始(チュートリアル)`);
  showScreen("gameScreen");
  render();
  showTutorialStepIntro();
}

// ---------- フリー対戦 ----------
function startBattle() {
  const selfDeckList = loadCustomDeck() || defaultDeckList();
  const oppDeckList = defaultDeckList();
  knownInstanceIds.self = new Set(); knownInstanceIds.opp = new Set();
  G = { self: newPlayer("YOU", selfDeckList), opp: newPlayer("AI", oppDeckList), active: "self", turn: 1, firstPlayer: Math.random() < 0.5 ? "self" : "opp", gameOver: false, storyStage: null, storyMods: null };
  G.active = G.firstPlayer;
  document.getElementById("logArea").innerHTML = "";
  draw(G.self, 5); draw(G.opp, 5);
  log(`先攻: ${G.firstPlayer === "self" ? "あなた" : "AI"}`);
  showScreen("gameScreen");
  beginMulliganPhase(startTurn);
}
