/* ---------- engine.js: ゲームエンジン本体(ルール・戦闘・AI・チュートリアル) ---------- */
// ---------- プレイヤー状態 ----------
function newPlayer(name, deckList) {
  return {
    name, core: RULES.CORE_INITIAL, coreMax: RULES.CORE_MAX, coreShield: 0,
    energy: 1, energyMax: 1, chain: 0, chainCapThisTurn: null,
    hand: [], deck: buildDeckFor(deckList), graveyard: [], exile: [],
    field: [], protocols: [],
    usedPhantomRevive: false, usedVectorCoreUltimate: false, awakening: false,
    noMoreActionsThisTurn: false, undefinedX: 1 + Math.floor(rand() * 10),
  };
}
function draw(player, n = 1) {
  const rules = !(G && G.tutorial);
  for (let i = 0; i < n; i++) {
    const c = player.deck.shift();
    if (c) {
      if (rules && player.hand.length >= RULES.HAND_MAX) { player.graveyard.push(c); log(`${player.name}: 手札上限のため${cardName(c)}が墓地へ`); }
      else player.hand.push(c);
    } else if (rules && G && !G.gameOver) {
      player.core = Math.max(0, player.core - 1); log(`${player.name}: デッキ切れでCORE-1`);
      if (player.core <= 0) checkGameEnd();
    }
  }
}
// ---------- 戦術ヘルパー(GUARD / PIERCE / STUN) ----------
const hasKw = (actor, kw) => (getCard(actor.cardId).keywords || []).includes(kw);
function legalTargets(attacker, foeField) {
  if (hasKw(attacker, "PIERCE")) return foeField;
  const guards = foeField.filter(a => hasKw(a, "GUARD"));
  return guards.length ? guards : foeField;
}
function guardBlocksCoreStrike(attacker, foe) { return foe.field.some(a => hasKw(a, "GUARD")) && !hasKw(attacker, "PIERCE"); }
function strongestActor(owner) { const p = getPlayer(owner); return [...p.field].sort((x, y) => effAtk(y, owner) - effAtk(x, owner))[0] || null; }
function stunActor(owner, a) { if (!a) return; a.stunned = true; log(`${getPlayer(owner).name}の${cardName(a.cardId)}がSTUN(次のターン行動不可)`); }
function pickFor(owner, prompt, cands, labelFn, apply, aiPick) {
  if (owner === "self" || netOnline()) requestChoiceFor(owner, prompt, cands, labelFn, apply);
  else apply(cands.length ? aiPick(cands) : null);
}

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
  if (actor.cardId !== "VC-068" && me.field.some(a => a.cardId === "VC-068")) v += 10;
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
// ---------- プレイヤーへの選択要求(カード効果のターゲットを実際に選ばせる) ----------
// 候補が0件ならスキップ、1件なら自動選択(実質選ぶ余地が無いため)、2件以上なら選択肢を表示する。
function requestChoice(promptText, candidates, labelFn, onChosen) {
  if (candidates.length === 0) { onChosen(null); render(); return; }
  if (candidates.length === 1) { onChosen(candidates[0]); render(); return; }
  showChoiceOverlay(promptText, candidates.map(c => ({ label: labelFn(c), onClick: () => { onChosen(c); render(); } })));
}

function makeActorInstance(card, costOverride) {
  const isUndefined = card.id === "VC-056";
  return {
    instanceId: uid(), cardId: card.id,
    atk: isUndefined ? costOverride : card.atk, def: isUndefined ? costOverride : card.def, spd: isUndefined ? costOverride : card.spd,
    summonedThisTurn: true, hasActed: false, tapped: false,
    tempAtk: 0, tempDef: 0, tempSpd: 0,
    watcherUses: 0, driverUses: 0, unlockCoreStrike: false, overclockUsed: false,
    architectUsed: false, zeroUsed: false, omegaUsed: false, ignitionActive: false, replayUsedThisTurn: false,
    quickAllowed: (card.keywords || []).includes("QUICK"),
  };
}

// ---------- ON SUMMON ----------
// オンライン対戦用: 自分の選択は選んだ番号を相手へ送り、相手(remote)の選択は届くまで待つ
function netOnline() { return !!(G && G.online); }
function requestChoiceFor(owner, promptText, candidates, labelFn, onChosen) {
  if (!netOnline()) { requestChoice(promptText, candidates, labelFn, onChosen); return; }
  if (candidates.length === 0) { onChosen(null); render(); return; }
  if (candidates.length === 1) { onChosen(candidates[0]); render(); return; }
  if (owner === "self") {
    showChoiceOverlay(promptText, candidates.map((c, i) => ({ label: labelFn(c), onClick: () => { netSend({ t: "choice", i }); onChosen(c); render(); } })));
  } else {
    netAwaitChoice(candidates, c => { onChosen(c); render(); });
  }
}
function runOnSummon(owner, actor) {
  const me = getPlayer(owner), foe = getPlayer(other(owner));
  switch (actor.cardId) {
    case "VC-001": if (me.chain === 0) me.chain = 1; break;
    case "VC-002": { const top = me.deck[0]; if (owner === "self" && top) showResultOverlay(`デッキの一番上を確認: ${cardName(top)}`); log(`${me.name}: デッキの一番上を確認した`); break; }
    case "VC-004": {
      const candidates = me.field.filter(a => a.instanceId !== actor.instanceId);
      const apply = (t) => { if (t) { t.tempSpd += 20; log(`${me.name}: ${cardName(t.cardId)}のSPD+20`); } };
      if (owner === "self" || netOnline()) requestChoiceFor(owner, "SPD+20するACTORを選ぼう", candidates, a => `${cardName(a.cardId)}(SPD${effSpd(a)})`, apply);
      else apply(pickBestOwnActor(me, actor.instanceId));
      break;
    }
    case "VC-006": if (foe.chain >= 3) foe.chain -= 1; break;
    case "VC-010": if (foe.chain >= 2) foe.chain = Math.max(0, foe.chain - 2); break;
    case "VC-014": me.coreShield = Math.min(RULES.CORE_SHIELD_MAX, me.coreShield + 1); break;
    case "VC-017": if (me.graveyard.length >= 3) draw(me, 1); break;
    case "VC-020": {
      const candidates = [...me.graveyard];
      const apply = (id) => { if (!id) return; log(`${me.name}: 墓地の「${cardName(id)}」を確認`); if (getCard(id).type === "ACTION") draw(me, 1); };
      if (owner === "self" || netOnline()) requestChoiceFor(owner, "確認する墓地のカードを選ぼう", candidates, id => cardName(id), apply);
      else { const top = me.graveyard[me.graveyard.length - 1]; if (top && getCard(top).type === "ACTION") draw(me, 1); }
      break;
    }
    case "VC-028": {
      const others = me.field.filter(a => a.instanceId !== actor.instanceId && getCard(a.cardId).effect);
      const apply = (t) => { if (t) { log(`${me.name}: ${cardName(t.cardId)}のON SUMMONを再発動`); runOnSummon(owner, t); } };
      if (owner === "self" || netOnline()) requestChoiceFor(owner, "ON SUMMONを再発動するACTORを選ぼう", others, a => cardName(a.cardId), apply);
      else apply(others.length ? others[others.length - 1] : null);
      break;
    }
    case "VC-029": if (foe.chain >= 4) { foe.chain = 0; actor.hasActed = true; log(`${me.name}: NULL EXECUTORが相手CHAINを0にした`); } break;
    case "VC-030": {
      if (foe.hand.length > 0) {
        const r = foe.hand[Math.floor(rand() * foe.hand.length)];
        log(`${me.name}: 相手の手札に「${cardName(r)}」を確認`);
        if (owner === "self") showResultOverlay(`NULL HACKERが相手の手札を確認: ${cardName(r)}`);
      }
      break;
    }
    case "VC-041": me.chain = 5; log(`${me.name}: VECTOR OVERDRIVEがCHAINを5にした`); break;
    case "VC-051": me.chain = 5; log(`${me.name}: VECTOR//ZEROがCHAINを5にした`); break;
    case "VC-064": stunActor(other(owner), strongestActor(other(owner))); break;
    case "VC-066": pickFor(owner, "手札に加えるACTIONを選ぼう", me.graveyard.filter(id => getCard(id).type === "ACTION"), id => cardName(id),
      id => { if (!id) return; me.graveyard.splice(me.graveyard.lastIndexOf(id), 1); me.hand.push(id); log(`${me.name}: ECHO ARCHIVISTが${cardName(id)}を手札に戻した`); }, c => c[c.length - 1]); break;
    case "VC-067": draw(me, 1); pickFor(owner, "捨てるカードを選ぼう", [...me.hand], id => cardName(id),
      id => { if (!id) return; me.hand.splice(me.hand.indexOf(id), 1); me.graveyard.push(id); log(`${me.name}: ${cardName(id)}を捨てた`); },
      c => c.slice().sort((a, b) => getCard(b).cost - getCard(a).cost)[0]); break;
    case "VC-069": if (foe.hand.length) { const i = Math.floor(rand() * foe.hand.length); const [c] = foe.hand.splice(i, 1); foe.exile.push(c); log(`${me.name}: NULL SABOTEURが相手の手札1枚をEXILE`); if (owner === "self") showResultOverlay(`NULL SABOTEURが相手の「${cardName(c)}」をEXILE`); } break;
    case "VC-071": if (me.graveyard.length >= 5) { me.energy += 2; log(`${me.name}: ECHO MEDIUMでENERGY+2`); } break;
    case "VC-072": me.coreShield = Math.min(RULES.CORE_SHIELD_MAX, me.coreShield + 1); break;
    case "VC-074": stunActor(other(owner), strongestActor(other(owner))); foe.chain = Math.max(0, foe.chain - 1); break;
    case "VC-075": { const n = me.field.filter(a => a !== actor && getCard(a.cardId).faction === "NOVA").length; if (n) { actor.atk += 20 * n; log(`${me.name}: NOVA OVERLORDのATK+${20 * n}`); } break; }
    case "VC-076": { const top = me.deck.splice(0, 3);
      pickFor(owner, "手札に加えるカードを選ぼう", top, id => cardName(id), id => { for (const t of top) { if (t === id) { me.hand.push(t); id = null; } else me.graveyard.push(t); } log(`${me.name}: ECHO ORACLEでデッキ上${top.length}枚を処理`); }, c => c.slice().sort((a, b) => getCard(b).cost - getCard(a).cost)[0]);
      if (!top.length) log(`${me.name}: デッキが空だった`); break; }
    case "VC-080": for (const a of [...foe.field]) stunActor(other(owner), a); me.coreShield = Math.min(RULES.CORE_SHIELD_MAX, me.coreShield + 1); break;
    case "VC-062": draw(me, 1); me.coreShield = Math.min(RULES.CORE_SHIELD_MAX, me.coreShield + 1); log(`${me.name}: ORIGIN//ZEROがカードを引き、SHIELDを+1した`); break;
    case "VC-053": foe.coreShield = 0; log(`${me.name}: NOVA//STARFALLが相手SHIELDを全破壊`); break;
    case "VC-056": actor.atk += me.chain; actor.def += me.chain; actor.spd += me.chain; log(`${me.name}: THE UNDEFINEDの全ステータスにCHAIN分(+${me.chain})上昇`); break;
  }
}

function runOnDestroy(owner, actor) {
  const me = getPlayer(owner);
  switch (actor.cardId) {
    case "VC-016": {
      const candidates = me.graveyard.filter(id => getCard(id).type === "ACTION");
      const apply = (id) => { if (!id) return; me.graveyard.splice(me.graveyard.lastIndexOf(id), 1); me.deck.push(id); log(`${me.name}: ECHO MEMORYで${cardName(id)}をデッキの一番下へ`); };
      if (owner === "self" || netOnline()) requestChoiceFor(owner, "デッキの下に戻すACTIONを選ぼう", candidates, id => cardName(id), apply);
      else apply(candidates[0] || null);
      break;
    }
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
      const pool = me.graveyard.slice(-3).filter(id => getCard(id).type === "ACTOR");
      const apply = (id) => { if (!id) return; me.graveyard.splice(me.graveyard.lastIndexOf(id), 1); me.field.push(makeActorInstance(getCard(id))); log(`${me.name}: ECHO//ETERNALが${cardName(id)}を墓地から復活`); };
      if (owner === "self" || netOnline()) requestChoiceFor(owner, "墓地(直近3枚)から復活させるACTORを選ぼう", pool, id => cardName(id), apply);
      else apply(pool.length ? pool[pool.length - 1] : null);
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
    case "VC-022": {
      const apply = (t) => { if (t) { t.tempSpd += 30; log(`${me.name}: ${cardName(t.cardId)}のSPD+30`); } };
      if (owner === "self" || netOnline()) requestChoiceFor(owner, "SPD+30するACTORを選ぼう", me.field, a => `${cardName(a.cardId)}(SPD${effSpd(a)})`, apply);
      else apply(pickBestOwnActor(me, null));
      break;
    }
    case "VC-023": foe.chain = Math.max(0, foe.chain - 1); break;
    case "VC-024": me.coreShield = Math.min(RULES.CORE_SHIELD_MAX, me.coreShield + 1); break;
    case "VC-039": incrementChain(owner, 2); break;
    case "VC-040": {
      const candidates = me.field.length >= RULES.FIELD_MAX ? [] : me.hand.filter(id => { const c = getCard(id); return c.type === "ACTOR" && c.cost <= 2; });
      const apply = (id) => {
        if (!id) return;
        const t = getCard(id);
        me.hand.splice(me.hand.indexOf(id), 1);
        const a = makeActorInstance(t); me.field.push(a); runOnSummon(owner, a);
        log(`${me.name}: RAPID DEPLOYで${t.name}を無償召喚`);
      };
      if (owner === "self" || netOnline()) requestChoiceFor(owner, "無償召喚するACTORを選ぼう", candidates, id => cardName(id), apply);
      else { const t = candidates.map(id => getCard(id)).sort((a, b) => b.cost - a.cost)[0]; apply(t ? t.id : null); }
      break;
    }
    case "VC-045": {
      const candidates = me.graveyard.filter(id => getCard(id).type === "ACTOR");
      const apply = (rId) => { if (!rId) return; me.graveyard.splice(me.graveyard.lastIndexOf(rId), 1); me.field.push(makeActorInstance(getCard(rId))); log(`${me.name}: ECHO REBIRTHで${cardName(rId)}を復活`); };
      if (owner === "self" || netOnline()) requestChoiceFor(owner, "墓地から復活させるACTORを選ぼう", candidates, id => cardName(id), apply);
      else apply(pickBestGraveyardActor(me));
      break;
    }
    case "VC-061": {
      const candidates = me.graveyard.filter(id => getCard(id).type === "ACTOR");
      const apply = (rId) => {
        if (rId) { me.graveyard.splice(me.graveyard.lastIndexOf(rId), 1); const a = makeActorInstance(getCard(rId)); me.field.push(a); log(`${me.name}: BEFORE 2198で${cardName(rId)}を復活`); }
        me.coreShield = Math.min(RULES.CORE_SHIELD_MAX, me.coreShield + 1); foe.chain = 0; log(`${me.name}: SHIELD+1、相手のCHAINが0になった`);
      };
      if (owner === "self" || netOnline()) requestChoiceFor(owner, "復活させるACTORを選ぼう", candidates, id => cardName(id), apply);
      else apply(pickBestGraveyardActor(me));
      break;
    }
    case "VC-079": for (const a of [...foe.field]) stunActor(other(owner), a); foe.chain = 0; break;
    case "VC-081": {
      pickFor(owner, "手札に戻すACTORを選ぼう", [...me.field], a => cardName(a.cardId), a => {
        if (a) { me.field = me.field.filter(x => x.instanceId !== a.instanceId); me.hand.push(a.cardId); log(`${me.name}: ${cardName(a.cardId)}を手札に戻した`); }
        draw(me, 1);
      }, c => c.slice().sort((x, y) => (x.atk + x.def) - (y.atk + y.def))[0]);
      if (!me.field.length) draw(me, 1);
      break;
    }
    case "VC-082": {
      pickFor(owner, "DEF-30にする相手ACTORを選ぼう", [...foe.field], a => `${cardName(a.cardId)}(DEF${effDef(a, other(owner))})`,
        a => { if (a) { a.tempDef -= 30; log(`${me.name}: ${cardName(a.cardId)}のDEF-30`); } }, c => strongestActor(other(owner)));
      break;
    }
    case "VC-047": if (me.core >= 5 && foe.core >= 5) { const t = me.core; me.core = foe.core; foe.core = t; log(`${me.name}: CORE INVERSIONでCOREを入れ替えた`); checkGameEnd(); } break;
    case "VC-048": {
      const apply = (t) => { if (t) { t.tempAtk += 100; t.ignitionActive = true; log(`${me.name}: ${cardName(t.cardId)}のATK+100`); } };
      if (owner === "self" || netOnline()) requestChoiceFor(owner, "ATK+100するACTORを選ぼう", me.field, a => `${cardName(a.cardId)}(ATK${effAtk(a, owner)})`, apply);
      else apply(pickBestOwnActor(me, null));
      break;
    }
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
  if (owner === "self" && G && G.storyMods && G.storyMods.coreCardsDisabled) return false;
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
  if (owner === "self" && G.tutorial && tutorialActionAllowed("core", cardId)) tutorialStepCompleted();
  return true;
}

// ---------- 発動型アビリティ(ONCE PER TURN) ----------
function canActivateReplayUnit(owner, instanceId) {
  const me = getPlayer(owner);
  const actor = me.field.find(a => a.instanceId === instanceId);
  if (!actor || actor.cardId !== "VC-018" || actor.replayUsedThisTurn) return false;
  return me.graveyard.some(id => getCard(id).type === "ACTION");
}
function activateReplayUnit(owner, instanceId) {
  const me = getPlayer(owner);
  const actor = me.field.find(a => a.instanceId === instanceId);
  if (!canActivateReplayUnit(owner, instanceId)) return;
  actor.replayUsedThisTurn = true;
  const candidates = me.graveyard.filter(id => getCard(id).type === "ACTION");
  const apply = (id) => { if (!id) return; me.graveyard.splice(me.graveyard.lastIndexOf(id), 1); me.deck.push(id); log(`${me.name}: REPLAY UNITで${cardName(id)}をデッキの一番下へ`); };
  if (owner === "self" || netOnline()) requestChoiceFor(owner, "デッキの下に戻すACTIONを選ぼう", candidates, id => cardName(id), apply);
  else apply(candidates[0] || null);
}

function placeProtocol(owner, cardId) {
  const me = getPlayer(owner), card = getCard(cardId);
  if (me.energy < card.cost) return false;
  const idx = me.hand.indexOf(cardId); if (idx === -1) return false;
  if (me.protocols.length >= RULES.PROTOCOL_MAX) { const d = me.protocols.shift(); me.graveyard.push(d.cardId); log(`${me.name}: PROTOCOL上限のため${cardName(d.cardId)}を墓地へ`); }
  me.hand.splice(idx, 1); me.energy -= card.cost;
  me.protocols.push({ instanceId: uid(), cardId });
  log(`${me.name}: ${card.name} を配置`);
  if (owner === "self" && G.tutorial && tutorialActionAllowed("protocol", cardId)) tutorialStepCompleted();
  return true;
}

// ---------- CHAIN(ストーリー特殊ルール反映) ----------
function incrementChain(owner, amount) {
  const me = getPlayer(owner), foe = getPlayer(other(owner));
  if (foe.field.some(a => a.cardId === "VC-043")) amount = Math.max(0, amount - 1);
  if (G && G.storyMods && typeof G.storyMods.opponentChainMultiplier === "number" && owner === "opp") amount = Math.round(amount * G.storyMods.opponentChainMultiplier);
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
    screenFlash("chainBreakFlash");
    if (typeof playBreakLayer === "function") playBreakLayer();
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
    a.overclockUsed = false; a.architectUsed = false; a.zeroUsed = false; a.omegaUsed = false; a.replayUsedThisTurn = false;
    if (a.cardId === "VC-037") { const idx = me.graveyard.findIndex(id => getCard(id).type === "ACTION"); if (idx !== -1) { const [c] = me.graveyard.splice(idx, 1); me.deck.push(c); } }
  }
  for (const p of me.protocols) { if (p.cardId === "VC-050" && me.graveyard.length >= 7) draw(me, 1); }
  for (const p of me.protocols) { if (p.cardId === "VC-078" && new Set(me.field.map(a => getCard(a.cardId).faction)).size >= 3) { draw(me, 1); log(`${me.name}: RESONANCE ENGINEで追加ドロー`); } }
  for (const a of me.field) { if (a.cardId === "VC-077") { me.coreShield = Math.min(RULES.CORE_SHIELD_MAX, me.coreShield + 1); log(`${me.name}: FORTRESS//AEGISがSHIELD+1`); } }
  // ストーリー特殊ルール: ルールエラー(ENERGY増減/CHAIN自動加算)
  if (G && G.storyMods && G.storyMods.energyJitter) {
    const d = Math.floor(rand() * 5) - 2;
    me.energy = Math.max(1, Math.min(RULES.ENERGY_MAX, me.energyMax + d));
    if (d !== 0) { log(`RULE ERROR: ENERGYが${me.energy}に書き換えられた`); setTimeout(() => screenFlash("hitFlash"), 50); }
  }
  if (G && G.storyMods && G.storyMods.autoChainPerTurn) { me.chain = Math.min(5, me.chain + G.storyMods.autoChainPerTurn); log(`RULE ERROR: CHAINが勝手に${me.chain}になった`); }
  // ストーリー特殊ルール: 敵はCORE SHIELDを持てない
  if (G && G.storyMods && G.storyMods.opponentNoShield) G.opp.coreShield = 0;

  // S31: 倒さずに生き延びる「和解」ルート
  if (G.storyMods && G.storyMods.peaceTurn && G.active === "self" && G.turn >= G.storyMods.peaceTurn && G.opp.core > 0 && !G.gameOver) {
    G.gameOver = true; G.peaceful = true; stopTurnTimer();
    const pp = loadStoryProgress(); pp.peaceS31 = true; saveStoryProgress(pp);
    addCurrency(30); endStoryBattle(true, "和解 — UNKNOWNは戦いをやめた"); return;
  }
  // VC-060 登場(ストーリー専用)
  if (G.storyMods && G.storyMods.summonVc060AtTurn && G.active === "opp" && !G.vc060Done && G.turn >= G.storyMods.summonVc060AtTurn) summonVc060();

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
  for (const a of me.field) a.stunned = false;
  me.chain = 0; me.energy = 0;
  if (G.active === "self" && G.storyMods && G.storyMods.selfCoreDrainPerTurn) {
    if (me.coreShield > 0) { me.coreShield -= 1; log("COREの不安定化をCORE SHIELDが吸収した"); }
    else { me.core = Math.max(0, me.core - G.storyMods.selfCoreDrainPerTurn); log(`COREが不安定化し、自分のCOREが${G.storyMods.selfCoreDrainPerTurn}減少した`); }
    checkGameEnd();
    if (G.gameOver) { render(); return; }
  }
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
  if (!(G && G.tutorial) && me.field.length >= RULES.FIELD_MAX) { log(`${me.name}: 場が満員(${RULES.FIELD_MAX}体)のため召喚できない`); return false; }
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
function canActorAct(actor) { if (actor.stunned) return false; if (actor.hasActed) return false; if (actor.summonedThisTurn && !actor.quickAllowed) return false; return true; }

// ---------- SPD(速度)ルール ----------
// ・攻撃側SPDが防御側より30以上高い → 加速突撃: 攻撃側ATK+20
// ・防御側SPDが攻撃側より30以上高い → 見切り: 防御側DEF+20
// ・攻撃が防がれ、かつ防御側SPDが攻撃側より高い → カウンター: 防御側ATK ≥ 攻撃側DEFなら攻撃側が破壊される
// チュートリアル中は適用しない(基本操作の学習を優先)。
const SPD_GAP = 30, SPD_BONUS = 20;
function combatCalc(attacker, ownerA, defender, ownerD) {
  let a = effAtk(attacker, ownerA), d = effDef(defender, ownerD);
  const notes = [];
  const sa = effSpd(attacker), sd = effSpd(defender);
  if (!(G && G.tutorial) && !(G && G.storyMods && G.storyMods.noSpdRules)) {
    if (sa - sd >= SPD_GAP) { a += SPD_BONUS; notes.push("加速突撃 ATK+" + SPD_BONUS); }
    else if (sd - sa >= SPD_GAP) { d += SPD_BONUS; notes.push("見切り DEF+" + SPD_BONUS); }
  }
  const hits = a >= d;
  const counter = !hits && !(G && G.tutorial) && !(G && G.storyMods && G.storyMods.noSpdRules) && sd > sa && effAtk(defender, ownerD) >= effDef(attacker, ownerA);
  if (counter) notes.push("カウンター発動");
  return { a, d, hits, counter, notes };
}
function attack(owner, instanceId, targetInstanceId) {
  const me = getPlayer(owner), foe = getPlayer(other(owner));
  const attacker = me.field.find(a => a.instanceId === instanceId);
  const defender = foe.field.find(a => a.instanceId === targetInstanceId);
  if (!attacker || !defender || !canActorAct(attacker)) return;
  if (!legalTargets(attacker, foe.field).includes(defender)) { log("GUARDがいるため、その対象は攻撃できない"); return; }
  attacker.hasActed = true;
  const cc = combatCalc(attacker, owner, defender, other(owner));
  if (cc.notes.length) log(`SPD: ${cardName(attacker.cardId)}(SPD${effSpd(attacker)}) vs ${cardName(defender.cardId)}(SPD${effSpd(defender)}) → ${cc.notes.join(" / ")}`);
  if (cc.notes.length && typeof flashBanner === "function") flashBanner(cc.counter ? "COUNTER!" : cc.notes[0].split(" ")[0], "chainBreak");
  if (cc.hits) {
    foe.field = foe.field.filter(x => x.instanceId !== targetInstanceId);
    if (attacker.cardId === "VC-038") { foe.exile.push(defender.cardId); log(`${me.name}: MEMORY EATERが${cardName(defender.cardId)}をEXILE`); }
    else foe.graveyard.push(defender.cardId);
    log(`${me.name}の${cardName(attacker.cardId)}が${cardName(defender.cardId)}を破壊`);
    if (attacker.ignitionActive) { foe.coreShield = Math.max(0, foe.coreShield - 1); log(`${me.name}: NOVA IGNITIONで相手SHIELD-1`); }
    if (attacker.cardId === "VC-073" && effSpd(attacker) - effSpd(defender) >= SPD_GAP) { draw(me, 1); log(`${me.name}: SPEED DEMONが速度優位でカードを引いた`); }
    runOnDestroy(other(owner), defender);
    runOnDestroyEnemy(owner, attacker);
  } else {
    log(`${me.name}の${cardName(attacker.cardId)}の攻撃は防がれた`);
    if (cc.counter) {
      me.field = me.field.filter(x => x.instanceId !== attacker.instanceId);
      me.graveyard.push(attacker.cardId);
      log(`${foe.name}の${cardName(defender.cardId)}がカウンター! ${cardName(attacker.cardId)}は破壊された`);
      runOnDestroy(owner, attacker);
      checkGameEnd();
      if (owner === "self" && G.tutorial && tutorialActionAllowed("attack")) tutorialStepCompleted();
      return;
    }
  }
  if (attacker.cardId === "VC-025" && me.chain >= 4) {
    const acts = me.hand.filter(id => getCard(id).type === "ACTION" && getCard(id).cost <= me.energy);
    if (acts.length && !me.noMoreActionsThisTurn) {
      if (!netOnline() && owner === "opp") useAction(owner, acts[0]);
      else requestChoiceFor(owner, "VECTOR ASSASSIN: ACTIONを1枚使用できる", [...acts, "__skip"], id => id === "__skip" ? "使わない" : cardName(id), id => { if (id && id !== "__skip") useAction(owner, id); });
    }
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
  if (!attacker || !canActorAct(attacker)) return; // 行動できるACTORが無ければ、そもそも試みてすらいないので進行判定しない
  const finishTutorialCheck = () => { if (owner === "self" && G.tutorial && tutorialActionAllowed("coreStrike")) tutorialStepCompleted(); };
  if (attacker.summonedThisTurn && attacker.quickAllowed) { log("QUICK FRAMEは召喚ターンにCORE STRIKEできない"); finishTutorialCheck(); return; }
  if (foe.field.some(a => a.cardId === "VC-031")) { log("相手のVOID PRISONによりCORE STRIKEできない"); finishTutorialCheck(); return; }
  if (guardBlocksCoreStrike(attacker, foe)) { log("相手のGUARDがいるためCORE STRIKEできない"); finishTutorialCheck(); return; }
  if (foe.field.length > 0 && !attacker.unlockCoreStrike) { log("相手ACTORが存在するためCORE STRIKEできない"); finishTutorialCheck(); return; }
  attacker.hasActed = true;
  const preCore = foe.core;
  if (foe.coreShield > 0) {
    foe.coreShield -= 1;
    if (attacker.cardId === "VC-034" && foe.coreShield > 0) { foe.coreShield -= 1; log(`${me.name}: CORE BREAKERがSHIELDを追加破壊`); }
    log(`${me.name}のCORE STRIKEはSHIELDに防がれた`);
    finishTutorialCheck();
    return;
  }
  const guard = foe.field.find(a => a.cardId === "VC-009" && !a.tapped);
  if (guard) { guard.tapped = true; log(`${foe.name}のNULL GUARDがCORE STRIKEを無効化した`); finishTutorialCheck(); return; }
  foe.core -= 1;
  log(`${me.name}のCORE STRIKE成功!(相手CORE ${foe.core})`);
  flashBanner("CORE STRIKE", "coreStrike");
  if (attacker.cardId === "VC-013") foe.chain = Math.max(0, foe.chain - 1);
  if (attacker.cardId === "VC-032" && preCore >= 5) { foe.core -= 1; log(`${me.name}: CORE THIEFが追加で相手CORE-1`); }
  checkGameEnd();
  finishTutorialCheck();
}

function checkGameEnd() {
  if (!G || G.gameOver) return;
  const threshold = (G.storyMods && typeof G.storyMods.selfLossCoreThreshold === "number") ? G.storyMods.selfLossCoreThreshold : 0;
  if (G.self.core <= threshold || G.opp.core <= 0) {
    G.gameOver = true;
    stopTurnTimer();
    const win = G.opp.core <= 0 && G.self.core > threshold;
    const draw = G.self.core <= threshold && G.opp.core <= 0;
    addCurrency(win ? 30 : (draw ? 15 : 10));
    const msg = draw ? "引き分け" : (win ? "勝利!" : (G.online ? "敗北..." : "敗北... AIの勝利"));
    if (G.storyStage) endStoryBattle(win && !draw, msg);
    else showResultOverlay(msg);
  }
}

// ---------- 簡易AI ----------
// ---------- CPU戦術AI ----------
function aiFactionOf(player) {
  const ids = [...player.hand, ...player.deck, ...player.graveyard, ...player.field.map(a => a.cardId)];
  const counts = { VECTOR: 0, NULL: 0, NOVA: 0, ECHO: 0 };
  for (const id of ids) {
    const f = getCard(id).faction;
    if (counts[f] != null) counts[f]++;
  }
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
}
function aiActorScore(card, me, foe, faction) {
  let score = card.atk * 0.24 + card.def * 0.17 + card.spd * 0.13 - card.cost * 5;
  // 陣営ごとの得意分野を評価し、同じ盤面でも出すカードを変える。
  if (card.faction === "VECTOR") {
    score += card.spd * 0.12 + Math.min(me.chain, 5) * 2;
    if (card.id === "VC-005" && me.chain < 3) score -= 8;
    if (card.id === "VC-026" || card.id === "VC-042") score += 12;
  } else if (card.faction === "NULL") {
    score += card.def * 0.13 + Math.min(foe.chain, 5) * 3;
    if (foe.coreShield > 0) score += 5;
    if (card.id === "VC-009" && me.coreShield === 0) score += 10;
  } else if (card.faction === "NOVA") {
    score += card.atk * 0.14 + foe.field.length * 3;
    if (card.id === "VC-035") score += me.field.filter(a => getCard(a.cardId).faction === "NOVA").length * 7;
    if (card.id === "VC-075") score += me.field.filter(a => getCard(a.cardId).faction === "NOVA").length * 8;
  } else if (card.faction === "ECHO") {
    const graveActors = me.graveyard.filter(id => getCard(id).type === "ACTOR").length;
    const graveActions = me.graveyard.filter(id => getCard(id).type === "ACTION").length;
    score += Math.min(graveActors, 5) * 3 + Math.min(graveActions, 4) * 2;
    if (card.id === "VC-036" && !me.usedPhantomRevive) score += 14;
    if (card.id === "VC-054" && graveActors > 0) score += 18;
  }
  if (card.id === "VC-056") score += me.chain * 2;
  if (card.id === "VC-060") score -= 100; // 特殊ストーリー用カードは通常CPUが優先しない
  if (me.field.length >= 4) score -= card.cost * 2;
  return score;
}
function aiActionScore(card, me, foe) {
  switch (card.id) {
    case "VC-021": return me.hand.length < RULES.HAND_MAX ? 28 : -100;
    case "VC-022": return me.field.length ? 12 + Math.max(...me.field.map(a => effSpd(a))) / 10 : -100;
    case "VC-023": return foe.chain > 0 ? 18 + foe.chain * 3 : -100;
    case "VC-024": return me.coreShield < RULES.CORE_SHIELD_MAX ? 17 + (me.core <= 3 ? 12 : 0) : -100;
    case "VC-039": return me.chain >= 4 ? 30 : me.chain >= 2 ? 19 : 8;
    case "VC-040": return me.field.length < RULES.FIELD_MAX && me.hand.some(id => getCard(id).type === "ACTOR" && getCard(id).cost <= 2) ? 35 : -100;
    case "VC-045":
    case "VC-061": return me.field.length < RULES.FIELD_MAX && me.graveyard.some(id => getCard(id).type === "ACTOR") ? 32 : -100;
    case "VC-047": return me.core >= 5 && foe.core >= 5 && foe.core > me.core ? 40 : -100;
    case "VC-048": return me.field.length ? 20 + Math.max(...me.field.map(a => effAtk(a, "opp"))) / 10 : -100;
    case "VC-057": return (me.field.length + me.protocols.length) < (foe.field.length + foe.protocols.length) - 1 ? 24 : -100;
    case "VC-079": return foe.field.length ? 28 + foe.field.length * 5 : foe.chain > 0 ? 16 : -100;
    case "VC-081": return me.field.length && me.hand.length < RULES.HAND_MAX ? 12 : -100;
    case "VC-082": return foe.field.length ? 22 : -100;
    default: return 8;
  }
}
function aiProtocolScore(card, me, foe) {
  if (card.id === "VC-049") return me.actionsUsedThisTurn >= 1 ? 20 : 13;
  if (card.id === "VC-050") return me.graveyard.length >= 4 ? 24 : 13;
  if (card.id === "VC-046") return me.lastActionUsed ? 22 : 10;
  if (card.id === "VC-078") return new Set(me.field.map(a => getCard(a.cardId).faction)).size >= 2 ? 25 : 12;
  return 8;
}
function aiPickBest(cards, scoreFn) {
  return cards.map(card => ({ card, score: scoreFn(card) }))
    .sort((a, b) => b.score - a.score || a.card.cost - b.card.cost)[0];
}
function runAiTurn() {
  if (G && G.tutorial) { log("(チュートリアル中はAIは待機している)"); setTimeout(endTurn, 500); return; }
  const me = G.opp, foe = G.self;
  const faction = aiFactionOf(me);

  // ACTOR: 陣営の強み、盤面、墓地との相性を見て選ぶ。
  let played = true;
  while (played && me.field.length < RULES.FIELD_MAX) {
    played = false;
    const candidates = me.hand.map(id => getCard(id))
      .filter(c => c.type === "ACTOR" && (c.id === "VC-056" ? me.undefinedX : c.cost) <= me.energy);
    const best = aiPickBest(candidates, c => aiActorScore(c, me, foe, faction));
    if (best && best.score > 0) {
      played = summonActor("opp", best.card.id);
      if (played) render();
    }
  }

  // ACTION: 盤面に意味のある効果だけを優先し、空振りを減らす。
  played = true;
  while (played && !me.noMoreActionsThisTurn) {
    played = false;
    const candidates = me.hand.map(id => getCard(id))
      .filter(c => c.type === "ACTION" && c.cost <= me.energy);
    const best = aiPickBest(candidates, c => aiActionScore(c, me, foe));
    if (best && best.score > 0) {
      played = useAction("opp", best.card.id);
      if (played) render();
    }
  }

  // PROTOCOL: 継続効果が活きる状況で配置する。
  played = true;
  while (played && me.protocols.length < RULES.PROTOCOL_MAX) {
    played = false;
    const candidates = me.hand.map(id => getCard(id))
      .filter(c => c.type === "PROTOCOL" && c.cost <= me.energy);
    const best = aiPickBest(candidates, c => aiProtocolScore(c, me, foe));
    if (best && best.score > 0) {
      played = placeProtocol("opp", best.card.id);
      if (played) render();
    }
  }

  // CORE: 使用条件を満たし、盤面やCORE状況に意味がある場合に使う。
  const cores = me.hand.map(id => getCard(id))
    .filter(c => c.type === "CORE" && c.cost <= me.energy && canUseCore("opp", c.id));
  const core = aiPickBest(cores, c => {
    if (c.id === "VC-058") return me.core <= 3 ? 35 : -100;
    if (c.id === "VC-059") return me.core <= 1 ? 50 : -100;
    if (c.id === "VC-055") return me.core <= 3 ? 32 : me.core >= 6 && foe.core >= 4 ? 15 : -100;
    return 0;
  });
  if (core && core.score > 0) { useCore("opp", core.card.id); render(); }

  // 攻撃: 撃破できる対象を優先。反撃で損をするだけの攻撃は避ける。
  const order = [...me.field].sort((x, y) => effSpd(y) - effSpd(x));
  for (const actor of order) {
    if (!canActorAct(actor)) continue;
    if (foe.field.length === 0) { coreStrike("opp", actor.instanceId); render(); }
    else {
      const targets = [...legalTargets(actor, foe.field)].sort((x, y) => effDef(x, "self") - effDef(y, "self"));
      const calcs = targets.map(t => ({ t, c: combatCalc(actor, "opp", t, "self") }));
      const w = calcs.find(x => x.c.hits);
      const safe = calcs.find(x => !x.c.counter);
      if (!w && !safe) continue;
      const targetId = (w || safe).t.instanceId;
      const node = document.querySelector(`#selfField [data-instance="${targetId}"]`);
      attack("opp", actor.instanceId, targetId);
      const destroyed = !G.self.field.some(a => a.instanceId === targetId);
      if (destroyed && node) { screenFlash("hitFlash"); node.classList.add("destroyAnim"); setTimeout(render, 300); }
      else render();
    }
  }
  log(`AI（${faction}戦術）: ターン終了`);
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
function tutorialStep() { return (G && G.tutorial) ? G.tutorial.steps[G.tutorial.step] : null; }
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
  showDialogue([{ s: "SYSTEM", t: st.explain }], () => { render(); if (st.allow.type === "info") tutorialStepCompleted(); });
}
function tutorialStepCompleted() {
  if (!G.tutorial) return;
  G.tutorial.step += 1;
  const steps = G.tutorial.steps;
  if (G.tutorial.step >= steps.length) { (G.tutorial.onComplete || completeTutorial)(); return; }
  const next = steps[G.tutorial.step];
  // 次の指示(召喚/使用)を実行できるよう、不足分のENERGYを補充して進行不能を防ぐ
  if ((next.allow.type === "action" || next.allow.type === "summon" || next.allow.type === "protocol" || next.allow.type === "core") && next.allow.cardId) {
    const need = getCard(next.allow.cardId).cost;
    if (G.self.energyMax < need) G.self.energyMax = need;
    if (G.self.energy < need) G.self.energy = need;
  }
  if (next.setup) next.setup();
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
  G = { self: newPlayer("YOU", selfDeckList), opp: newPlayer("AI", defaultDeckList()), active: "self", turn: 1, firstPlayer: "self", gameOver: false, storyStage: stage, storyMods: null, tutorial: { step: 0, steps: TUTORIAL_STEPS } };
  G.self.hand = ["VC-001", "VC-022"];
  G.self.energy = 1; G.self.energyMax = 1;
  const oppActor = makeActorInstance(getCard("VC-011")); // NOVA SOLDIER、練習用にDEFを下げておく
  oppActor.def = 30;
  G.opp.field = [oppActor];
  TUTORIAL_STEPS.forEach(s => { s._shown = false; });
  document.getElementById("logArea").innerHTML = "";
  log(`STAGE ${stage.id}「${stage.title}」開始(チュートリアル)`);
  showScreen("gameScreen");
  playBgm("awakening");
  render();
  showTutorialStepIntro();
}

// ---------- 完全版チュートリアル(ストーリーとは別、約10分で全システムを解説) ----------
const FULL_TUTORIAL_STEPS = [
  { allow: { type: "info" }, hint: "説明を読み進めよう",
    explain: "ようこそ、VECTOR//CORE 完全ガイドへ。\n実際に手を動かしながら全システムを確認していく。\n\nCOREはプレイヤーのライフだ。初期値5、最大値7。0になった瞬間に敗北する。" },
  { allow: { type: "summon", cardId: "VC-001" }, hint: "VECTOR RUNNERを「召喚」しよう",
    explain: "ENERGYはカードを使うためのリソース。今ENERGYは1ある。\n手札のVECTOR RUNNER(コスト1)を召喚してみよう。" },
  { allow: { type: "info" }, hint: "説明を読み進めよう",
    explain: "ACTORにはCOST・ATK・DEF・SPDがある。\n戦闘は「攻撃側ATK ≥ 防御側DEF」なら防御側を1発で撃破する判定で、ダメージが蓄積することはない。\nSPDは行動の速さの目安になる。" },
  { allow: { type: "action", cardId: "VC-021" }, hint: "QUICK SIGNALを「使用」しよう",
    explain: "ACTIONは使い切りの効果カードだ。使うとCHAINが1増える。\nQUICK SIGNALを使って1枚ドローしてみよう。",
    setup: () => { if (!G.self.hand.includes("VC-021")) G.self.hand.push("VC-021"); } },
  { allow: { type: "endTurn" }, hint: "「END TURN」をタップ",
    explain: "行動が終わったらEND TURNでターンを相手に渡そう。" },
  { allow: { type: "attack" }, hint: "自分のACTORで「攻撃」しよう", deferToTurnStart: true,
    explain: "相手のACTORが現れた。自分のACTORで攻撃してみよう。\nATKがDEF以上なら相手を撃破できる。" },
  { allow: { type: "endTurn" }, hint: "「END TURN」をタップ",
    explain: "1体のACTORが行動できるのは1ターンに1回だけだ。\nもう一度END TURNでターンを終えよう。" },
  { allow: { type: "coreStrike" }, hint: "「CORE STRIKE」を使おう", deferToTurnStart: true,
    explain: "相手フィールドにACTORがいなければ、COREへ直接攻撃(CORE STRIKE)できる。試してみよう。" },
  { allow: { type: "coreStrike" }, hint: "もう一度「CORE STRIKE」を使おう",
    explain: "今度は相手がCORE SHIELDを持っている状態でCORE STRIKEしてみよう。\nSHIELDがあるとCORE STRIKEは無効化され、SHIELDを1つ消費するだけでCOREは減らない。",
    setup: () => {
      G.opp.field = []; G.opp.coreShield = 1;
      const a = makeActorInstance(getCard("VC-001")); a.hasActed = false; a.summonedThisTurn = false;
      G.self.field.push(a);
    } },
  { allow: { type: "info" }, hint: "説明を読み進めよう",
    explain: "今のCORE STRIKEはSHIELDに防がれ、相手のSHIELDは0になったはずだ。\nSHIELDをどう剥がすか、いつCORE STRIKEを狙うかが駆け引きの核心になる。" },
  { allow: { type: "protocol", cardId: "VC-049" }, hint: "VECTOR GATEを「配置」しよう",
    explain: "PROTOCOLは場に残り続ける継続カードだ(自分の場に最大3枚)。\nVECTOR GATEを配置してみよう。",
    setup: () => { if (!G.self.hand.includes("VC-049")) G.self.hand.push("VC-049"); } },
  { allow: { type: "core", cardId: "VC-055" }, hint: "CORE BREAK: AWAKENINGを「使用」しよう",
    explain: "CORE専用の特殊カードもある。今COREを3にしておいた。\nCORE BREAK: AWAKENINGを使ってCOREを回復してみよう。",
    setup: () => { G.self.core = 3; if (!G.self.hand.includes("VC-055")) G.self.hand.push("VC-055"); } },
  { allow: { type: "action", cardId: "VC-039" }, hint: "CHAIN SURGEを「使用」しよう",
    explain: "CHAINが7以上になった瞬間「CHAIN BREAK」が発生し、CHAINは0にリセットされる。\n今CHAINを5にしておいた。CHAIN SURGE(CHAIN+2)でCHAIN BREAKを起こしてみよう。",
    setup: () => { G.self.chain = 5; if (!G.self.hand.includes("VC-039")) G.self.hand.push("VC-039"); } },
  { allow: { type: "info" }, hint: "説明を読み進めよう",
    explain: "CHAIN BREAKが発生した!カードによっては「CHAIN BREAK時」の強力な追加効果を持つ。\n危険域であると同時に、大きなチャンスでもある。" },
  { allow: { type: "info" }, hint: "説明を読み進めよう",
    explain: "墓地は破壊されたACTORや使用済みACTIONが置かれる場所で、両者が内容を確認できる公開情報だ。\n対戦画面下の「墓地」ボタンからいつでも中身を見られる。" },
  { allow: { type: "info" }, hint: "説明を読み進めよう",
    explain: "INTERRUPTは相手のターン中にも使える特殊な効果。\nEXILEは墓地よりさらに深く取り除かれた領域で、カード効果に明記されない限り戻せない。" },
  { allow: { type: "info" }, hint: "説明を読み進めよう",
    explain: "カードにはVECTOR(速度・CHAIN)/NULL(妨害・CORE操作)/NOVA(戦闘・破壊)/ECHO(墓地・再利用)の4つのFACTIONがある。\nデッキ編成で自分の戦い方を組み立てよう。" },
  { allow: { type: "info" }, hint: "お疲れ様!",
    explain: "これでVECTOR//COREの基本システムはすべて確認できた。\nあとは実戦の中で、ENERGYの使い切り方やCHAINの伸ばし方、CORE STRIKEのタイミングを磨いていこう。" },
];
function completeFullTutorial() {
  G.tutorial = null;
  stopTurnTimer();
  showDialogue([{ s: "SYSTEM", t: "完全版チュートリアルを終了する。お疲れ様でした!" }], () => { showScreen("menuScreen"); refreshMenu(); });
}
function startFullTutorialBattle() {
  const selfDeckList = loadCustomDeck() || defaultDeckList();
  knownInstanceIds.self = new Set(); knownInstanceIds.opp = new Set();
  G = { self: newPlayer("YOU", selfDeckList), opp: newPlayer("AI", defaultDeckList()), active: "self", turn: 1, firstPlayer: "self", gameOver: false, storyStage: null, storyMods: null, tutorial: { step: 0, steps: FULL_TUTORIAL_STEPS, onComplete: completeFullTutorial } };
  G.self.hand = ["VC-001"];
  G.self.energy = 1; G.self.energyMax = 1;
  const oppActor = makeActorInstance(getCard("VC-011"));
  oppActor.def = 30;
  G.opp.field = [oppActor];
  FULL_TUTORIAL_STEPS.forEach(s => { s._shown = false; });
  document.getElementById("logArea").innerHTML = "";
  log("完全版チュートリアル開始");
  showScreen("gameScreen");
  playBgm("awakening");
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
  playBgm("vectorBattle");
  beginMulliganPhase(startTurn);
}


// ---------- VC-060 登場 / SIXTH CORE ----------
function summonVc060() {
  G.vc060Done = true;
  const card = getCard("VC-060");
  const actor = makeActorInstance(card);
  actor.atk = 40; actor.def = 30; actor.summonedThisTurn = false;
  G.opp.field.push(actor);
  log("VC-060「I AM NOT YOUR CREATION」が出現した――");
  if (typeof bgmSilenceThenFinal === "function") bgmSilenceThenFinal();
  flashBanner("I AM NOT YOUR CREATION", "chainBreak");
  const ov = document.getElementById("screenFlashOverlay");
  ov.className = ""; void ov.offsetWidth; ov.classList.add("show", "silenceFlash");
  setTimeout(() => ov.classList.remove("show", "silenceFlash"), 1800);
}
function useSixthCore() {
  if (!G || G.gameOver || G.active !== "self" || !G.storyMods || !G.storyMods.sixthCoreAvailable || G.sixthUsed) return;
  if (!sixthCoreUnlocked()) return;
  G.sixthUsed = true;
  G.self.core = G.self.coreMax; G.self.coreShield = RULES.CORE_SHIELD_MAX;
  log("SIXTH CORE 起動: COREが全回復し、CORE SHIELDが満タンになった");
  flashBanner("SIXTH CORE", "chainBreak"); screenFlash("chainBreakFlash");
  render();
}
