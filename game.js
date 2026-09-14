/* =========================================================
   VECTOR//CORE - AWAKENING VECTOR
   ブラウザ版プロトタイプ v0.4
   - 全60種カード(v0.3までと同じ)
   - NEW: ストーリーモード(PROLOGUE〜STAGE09を実装、以降はMAPにプレースホルダー表示)
   ビルド不要。index.html / style.css とセットで使用。
   ========================================================= */

const RULES = {
  CORE_INITIAL: 5, CORE_MAX: 7, CORE_SHIELD_MAX: 3,
  ENERGY_MAX: 10, CHAIN_BREAK_AT: 7,
  DECK_SIZE: 30, MAX_COPIES: 3, PROTOCOL_MAX: 3,
};

// ---------- カードデータ(全60種) ----------
const CARD_POOL = [
  { id: "VC-001", name: "VECTOR RUNNER", type: "ACTOR", faction: "VECTOR", rarity: "N", cost: 1, atk: 40, def: 30, spd: 80, effect: "VC001" },
  { id: "VC-002", name: "VECTOR SCOUT", type: "ACTOR", faction: "VECTOR", rarity: "N", cost: 2, atk: 60, def: 40, spd: 90, effect: "VC002" },
  { id: "VC-003", name: "QUICK FRAME", type: "ACTOR", faction: "VECTOR", rarity: "N", cost: 2, atk: 70, def: 40, spd: 100, effect: "VC003", keywords: ["QUICK"] },
  { id: "VC-004", name: "VECTOR MECHANIC", type: "ACTOR", faction: "VECTOR", rarity: "N", cost: 2, atk: 50, def: 70, spd: 50, effect: "VC004" },
  { id: "VC-005", name: "DATA HOUND", type: "ACTOR", faction: "VECTOR", rarity: "N", cost: 3, atk: 100, def: 50, spd: 90, effect: "VC005" },
  { id: "VC-006", name: "NULL DRONE", type: "ACTOR", faction: "NULL", rarity: "N", cost: 1, atk: 30, def: 50, spd: 40, effect: "VC006" },
  { id: "VC-007", name: "NULL WATCHER", type: "ACTOR", faction: "NULL", rarity: "N", cost: 2, atk: 50, def: 80, spd: 30, effect: "VC007" },
  { id: "VC-008", name: "ZERO FRAME", type: "ACTOR", faction: "NULL", rarity: "N", cost: 3, atk: 70, def: 90, spd: 40, effect: "VC008" },
  { id: "VC-009", name: "NULL GUARD", type: "ACTOR", faction: "NULL", rarity: "N", cost: 2, atk: 40, def: 100, spd: 20, effect: "VC009" },
  { id: "VC-010", name: "STATIC EATER", type: "ACTOR", faction: "NULL", rarity: "N", cost: 3, atk: 80, def: 70, spd: 50, effect: "VC010" },
  { id: "VC-011", name: "NOVA SOLDIER", type: "ACTOR", faction: "NOVA", rarity: "N", cost: 2, atk: 100, def: 50, spd: 40 },
  { id: "VC-012", name: "NOVA GUARD", type: "ACTOR", faction: "NOVA", rarity: "N", cost: 2, atk: 60, def: 100, spd: 30, effect: "VC012" },
  { id: "VC-013", name: "BLAZE UNIT", type: "ACTOR", faction: "NOVA", rarity: "N", cost: 3, atk: 120, def: 50, spd: 50, effect: "VC013" },
  { id: "VC-014", name: "NOVA ENGINEER", type: "ACTOR", faction: "NOVA", rarity: "N", cost: 2, atk: 50, def: 60, spd: 40, effect: "VC014" },
  { id: "VC-015", name: "RED BREAKER", type: "ACTOR", faction: "NOVA", rarity: "N", cost: 4, atk: 150, def: 70, spd: 30, effect: "VC015" },
  { id: "VC-016", name: "ECHO MEMORY", type: "ACTOR", faction: "ECHO", rarity: "N", cost: 1, atk: 30, def: 40, spd: 50, effect: "VC016" },
  { id: "VC-017", name: "ECHO SEEKER", type: "ACTOR", faction: "ECHO", rarity: "N", cost: 2, atk: 60, def: 60, spd: 60, effect: "VC017" },
  { id: "VC-018", name: "REPLAY UNIT", type: "ACTOR", faction: "ECHO", rarity: "N", cost: 3, atk: 80, def: 80, spd: 40, effect: "VC018" },
  { id: "VC-019", name: "ECHO GUARDIAN", type: "ACTOR", faction: "ECHO", rarity: "N", cost: 4, atk: 90, def: 120, spd: 30, effect: "VC019" },
  { id: "VC-020", name: "ARCHIVE BEAST", type: "ACTOR", faction: "ECHO", rarity: "N", cost: 3, atk: 100, def: 60, spd: 50, effect: "VC020" },
  { id: "VC-021", name: "QUICK SIGNAL", type: "ACTION", faction: "VECTOR", rarity: "N", cost: 1, effect: "VC021" },
  { id: "VC-022", name: "VECTOR BOOST", type: "ACTION", faction: "VECTOR", rarity: "N", cost: 1, effect: "VC022" },
  { id: "VC-023", name: "NULL PULSE", type: "ACTION", faction: "NULL", rarity: "N", cost: 1, effect: "VC023" },
  { id: "VC-024", name: "BASIC SHIELD", type: "ACTION", faction: "NULL", rarity: "N", cost: 1, effect: "VC024" },
  { id: "VC-025", name: "VECTOR ASSASSIN", type: "ACTOR", faction: "VECTOR", rarity: "R", cost: 3, atk: 110, def: 50, spd: 120 },
  { id: "VC-026", name: "CHAIN DRIVER", type: "ACTOR", faction: "VECTOR", rarity: "R", cost: 3, atk: 80, def: 70, spd: 100, effect: "VC026" },
  { id: "VC-027", name: "OVERCLOCKER", type: "ACTOR", faction: "VECTOR", rarity: "R", cost: 4, atk: 130, def: 60, spd: 130, effect: "VC027" },
  { id: "VC-028", name: "VECTOR RELAY", type: "ACTOR", faction: "VECTOR", rarity: "R", cost: 2, atk: 50, def: 50, spd: 110, effect: "VC028" },
  { id: "VC-029", name: "NULL EXECUTOR", type: "ACTOR", faction: "NULL", rarity: "R", cost: 4, atk: 100, def: 110, spd: 40, effect: "VC029" },
  { id: "VC-030", name: "NULL HACKER", type: "ACTOR", faction: "NULL", rarity: "R", cost: 3, atk: 70, def: 70, spd: 70, effect: "VC030" },
  { id: "VC-031", name: "VOID PRISON", type: "ACTOR", faction: "NULL", rarity: "R", cost: 4, atk: 60, def: 140, spd: 10, effect: "VC031" },
  { id: "VC-032", name: "CORE THIEF", type: "ACTOR", faction: "NULL", rarity: "R", cost: 4, atk: 90, def: 60, spd: 90, effect: "VC032" },
  { id: "VC-033", name: "NOVA BERSERKER", type: "ACTOR", faction: "NOVA", rarity: "R", cost: 4, atk: 170, def: 50, spd: 60, effect: "VC033" },
  { id: "VC-034", name: "CORE BREAKER", type: "ACTOR", faction: "NOVA", rarity: "R", cost: 4, atk: 130, def: 80, spd: 50, effect: "VC034" },
  { id: "VC-035", name: "NOVA COMMANDER", type: "ACTOR", faction: "NOVA", rarity: "R", cost: 5, atk: 150, def: 120, spd: 50, effect: "VC035" },
  { id: "VC-036", name: "ECHO PHANTOM", type: "ACTOR", faction: "ECHO", rarity: "R", cost: 3, atk: 90, def: 50, spd: 90, effect: "VC036" },
  { id: "VC-037", name: "ARCHIVE KEEPER", type: "ACTOR", faction: "ECHO", rarity: "R", cost: 4, atk: 80, def: 100, spd: 50, effect: "VC037" },
  { id: "VC-038", name: "MEMORY EATER", type: "ACTOR", faction: "ECHO", rarity: "R", cost: 4, atk: 120, def: 70, spd: 60, effect: "VC038" },
  { id: "VC-039", name: "CHAIN SURGE", type: "ACTION", faction: "VECTOR", rarity: "R", cost: 2, effect: "VC039" },
  { id: "VC-040", name: "RAPID DEPLOY", type: "ACTION", faction: "VECTOR", rarity: "R", cost: 2, effect: "VC040" },
  { id: "VC-041", name: "VECTOR OVERDRIVE", type: "ACTOR", faction: "VECTOR", rarity: "SR", cost: 5, atk: 160, def: 100, spd: 150, effect: "VC041" },
  { id: "VC-042", name: "CHAIN ARCHITECT", type: "ACTOR", faction: "VECTOR", rarity: "SR", cost: 4, atk: 90, def: 100, spd: 100, effect: "VC042" },
  { id: "VC-043", name: "NULL ABSOLUTE", type: "ACTOR", faction: "NULL", rarity: "SR", cost: 5, atk: 100, def: 180, spd: 20, effect: "VC043" },
  { id: "VC-044", name: "NOVA TITAN", type: "ACTOR", faction: "NOVA", rarity: "SR", cost: 6, atk: 230, def: 170, spd: 30, effect: "VC044" },
  { id: "VC-045", name: "ECHO REBIRTH", type: "ACTION", faction: "ECHO", rarity: "SR", cost: 5, effect: "VC045" },
  { id: "VC-046", name: "MEMORY LOOP", type: "PROTOCOL", faction: "ECHO", rarity: "SR", cost: 4, effect: "VC046" },
  { id: "VC-047", name: "CORE INVERSION", type: "ACTION", faction: "NULL", rarity: "SR", cost: 5, effect: "VC047" },
  { id: "VC-048", name: "NOVA IGNITION", type: "ACTION", faction: "NOVA", rarity: "SR", cost: 3, effect: "VC048" },
  { id: "VC-049", name: "VECTOR GATE", type: "PROTOCOL", faction: "VECTOR", rarity: "SR", cost: 4, effect: "VC049" },
  { id: "VC-050", name: "ECHO ARCHIVE", type: "PROTOCOL", faction: "ECHO", rarity: "SR", cost: 3, effect: "VC050" },
  { id: "VC-051", name: "VECTOR//ZERO", type: "ACTOR", faction: "VECTOR", rarity: "UR", cost: 7, atk: 250, def: 150, spd: 200, effect: "VC051" },
  { id: "VC-052", name: "NULL//OMEGA", type: "ACTOR", faction: "NULL", rarity: "UR", cost: 7, atk: 180, def: 250, spd: 10, effect: "VC052", keywords: ["INTERRUPT"] },
  { id: "VC-053", name: "NOVA//STARFALL", type: "ACTOR", faction: "NOVA", rarity: "UR", cost: 8, atk: 320, def: 180, spd: 40, effect: "VC053" },
  { id: "VC-054", name: "ECHO//ETERNAL", type: "ACTOR", faction: "ECHO", rarity: "UR", cost: 7, atk: 180, def: 200, spd: 80, effect: "VC054" },
  { id: "VC-055", name: "CORE BREAK: AWAKENING", type: "CORE", faction: "NONE", rarity: "UR", cost: 6, effect: "VC055" },
  { id: "VC-056", name: "THE UNDEFINED", type: "ACTOR", faction: "NONE", rarity: "XR", cost: 0, atk: 0, def: 0, spd: 0, effect: "VC056", keywords: ["X_COST"] },
  { id: "VC-057", name: "WORLD RESET", type: "ACTION", faction: "NONE", rarity: "XR", cost: 10, effect: "VC057" },
  { id: "VC-058", name: "SIXTH CORE", type: "CORE", faction: "NONE", rarity: "XR", cost: 8, effect: "VC058" },
  { id: "VC-059", name: "VECTOR//CORE", type: "CORE", faction: "NONE", rarity: "SEC", cost: 10, effect: "VC059" },
  { id: "VC-060", name: "I AM NOT YOUR CREATION", type: "ACTOR", faction: "NONE", rarity: "SEC", cost: 0, atk: 0, def: 0, spd: Infinity, effect: "VC060", keywords: ["NOT_DECKABLE", "NO_NORMAL_SUMMON"] },
];
const DEFAULT_EXTRA_COPIES = ["VC-001", "VC-006", "VC-016", "VC-021", "VC-022", "VC-023"];

function getCard(id) { return CARD_POOL.find(c => c.id === id); }
function cardName(id) { return getCard(id).name; }
function deckablePool() { return CARD_POOL.filter(c => !(c.keywords || []).includes("NOT_DECKABLE")); }
function defaultDeckList() { return CARD_POOL.filter(c => c.rarity === "N").map(c => c.id).concat(DEFAULT_EXTRA_COPIES); }

// ---------- ストーリーデータ ----------
// implemented:true のステージだけ実際に遊べる(プロローグ〜STAGE09)。
// それ以外はMAP上にタイトルだけ表示し、タップすると「未実装」と案内する。
const STORY_STAGES = [
  { id: "S00", chapter: "PROLOGUE", title: "起動", battle: false, implemented: true,
    intro: [
      { s: "NARRATION", t: "2198年。\n人類は世界中のエネルギーを、ひとつのシステムへ統合した。" },
      { s: "SYSTEM", t: "VECTOR//CORE SYSTEM — ONLINE" },
      { s: "SYSTEM", t: "SYSTEM ERROR\nVECTOR//CORE — OFFLINE" },
      { s: "SYSTEM", t: "UNKNOWN DATA DETECTED\nORIGIN：UNKNOWN\nLIFEFORM：ACTOR" },
      { s: "主人公", t: "……ここは？" },
    ] },
  { id: "S01", chapter: "PROLOGUE", title: "最初の接続", battle: true, implemented: true, reward: null,
    intro: [{ s: "主人公", t: "このカード……俺に反応してる？" }],
    outro: [{ s: "SYSTEM", t: "CORE DATA：6" }, { s: "SYSTEM", t: "（表示はすぐに消えた）" }] },
  { id: "S02", chapter: "PROLOGUE", title: "緑の影", battle: true, implemented: true, reward: null,
    intro: [
      { s: "？？？", t: "お前、どこから来た？" },
      { s: "主人公", t: "……分からない。" },
      { s: "？？？", t: "なら、戦って確かめろ。" },
    ],
    outro: [
      { s: "？？？", t: "俺はVECTOR。この世界には、俺たちの他に、NULL、NOVA、ECHOがいる。" },
      { s: "VECTOR", t: "最近、存在しないデータが増えてる。" },
    ] },
  { id: "S03", chapter: "PROLOGUE", title: "目覚めた世界", battle: false, implemented: true,
    intro: [
      { s: "NARRATION", t: "主人公はVECTORの拠点へ案内された。" },
      { s: "SYSTEM", t: "UNKNOWN SIGNAL：1" },
    ] },
  { id: "S04", chapter: "CHAPTER1 - AWAKENING VECTOR", title: "高速戦", battle: true, implemented: true, reward: null,
    intro: [{ s: "NARRATION", t: "VECTORの訓練。時間内にCHAINを繋ぐ必要がある。" }],
    rules: { note: "30秒タイマー(このプロトタイプでは省略)" } },
  { id: "S05", chapter: "CHAPTER1 - AWAKENING VECTOR", title: "CHAIN", battle: true, implemented: true, reward: null,
    intro: [
      { s: "敵", t: "速さだけじゃ勝てない。" },
      { s: "主人公", t: "だったら、もっと速くする！" },
    ],
    rules: { note: "CHAIN 7以上でCHAIN BREAKを発生させると特別ログが出る" } },
  { id: "S06", chapter: "CHAPTER1 - AWAKENING VECTOR", title: "分岐", battle: false, implemented: true, hasRouteChoice: true,
    intro: [{ s: "NARRATION", t: "主人公は2つのルートの前に立っている。" }] },
  { id: "S07", chapter: "CHAPTER1 - AWAKENING VECTOR", title: "VECTOR中枢", battle: false, implemented: true,
    intro: [
      { s: "主人公", t: "……このデータ、全部ACTORの記録なのか？" },
      { s: "？？？", t: "違う。これは……俺たちが生まれる前の記録だ。" },
      { s: "SYSTEM", t: "CREATION DATA：NOT FOUND" },
    ] },
  { id: "S08", chapter: "CHAPTER1 - AWAKENING VECTOR", title: "最初の異常", battle: true, boss: true, implemented: true, reward: null,
    intro: [{ s: "NARRATION", t: "巨大なUNKNOWN ACTORが出現した。" }],
    rules: { opponentNoShield: true, opponentChainMultiplier: 2, note: "敵はCORE SHIELDを持たず、CHAINが2倍増加する" },
    outro: [{ s: "UNKNOWN VECTOR", t: "……NULLが……来る……" }] },
  { id: "S09", chapter: "CHAPTER1 - AWAKENING VECTOR", title: "NULL SIGNAL", battle: true, boss: true, implemented: true, reward: null,
    intro: [
      { s: "NULL", t: "VECTORは、まだ何も知らない。" },
      { s: "主人公", t: "何を？" },
      { s: "NULL", t: "お前たちが何から生まれたのかを。" },
    ],
    outro: [{ s: "SYSTEM", t: "NULLカードが解禁された。" }] },
  // ここから先は未実装(タイトルのみMAPに表示)
  { id: "S10", chapter: "CHAPTER2 - NULL", title: "黒いデータ", implemented: false },
  { id: "S11", chapter: "CHAPTER2 - NULL", title: "停止命令", implemented: false },
  { id: "S12", chapter: "CHAPTER2 - NULL", title: "消された記録", implemented: false },
  { id: "S13", chapter: "CHAPTER2 - NULL", title: "NULLの目的", implemented: false },
  { id: "S14", chapter: "CHAPTER2 - NULL", title: "NULL//OMEGA", implemented: false, boss: true },
  { id: "S15", chapter: "CHAPTER3 - NOVA", title: "赤い侵攻", implemented: false },
  { id: "S16", chapter: "CHAPTER3 - NOVA", title: "VECTOR WAR", implemented: false },
  { id: "S17", chapter: "CHAPTER3 - NOVA", title: "防衛線", implemented: false },
  { id: "S18", chapter: "CHAPTER3 - NOVA", title: "NOVAの戦士", implemented: false },
  { id: "S19", chapter: "CHAPTER3 - NOVA", title: "CORE崩壊", implemented: false },
  { id: "S20", chapter: "CHAPTER3 - NOVA", title: "NOVA//STARFALL", implemented: false, boss: true },
  { id: "S21", chapter: "CHAPTER4 - ECHO", title: "残された記憶", implemented: false },
  { id: "S22", chapter: "CHAPTER4 - ECHO", title: "墓場のデータ", implemented: false },
  { id: "S23", chapter: "CHAPTER4 - ECHO", title: "失われたACTOR", implemented: false },
  { id: "S24", chapter: "CHAPTER4 - ECHO", title: "2198年以前", implemented: false },
  { id: "S25", chapter: "CHAPTER4 - ECHO", title: "創造の日", implemented: false },
  { id: "S26", chapter: "CHAPTER4 - ECHO", title: "ECHO//ETERNAL", implemented: false, boss: true },
  { id: "S27", chapter: "CHAPTER5 - ERROR", title: "世界規模の異常", implemented: false },
  { id: "S28", chapter: "CHAPTER5 - ERROR", title: "ルールエラー", implemented: false },
  { id: "S29", chapter: "CHAPTER5 - ERROR", title: "CORE停止", implemented: false },
  { id: "S30", chapter: "CHAPTER5 - ERROR", title: "第六CORE", implemented: false },
  { id: "S31", chapter: "CHAPTER5 - ERROR", title: "UNKNOWN", implemented: false },
  { id: "S32", chapter: "FINAL - SIXTH CORE", title: "世界の再構築", implemented: false },
  { id: "S33", chapter: "FINAL - SIXTH CORE", title: "I AM NOT YOUR CREATION", implemented: false, boss: true },
  { id: "S34", chapter: "FINAL - SIXTH CORE", title: "VECTOR//CORE", implemented: false, boss: true },
];

// ---------- localStorage ----------
const LS_DECK = "vc_custom_deck", LS_COLLECTION = "vc_collection", LS_STORY = "vc_story_progress";
function loadCustomDeck() { try { const raw = JSON.parse(localStorage.getItem(LS_DECK) || "null"); if (Array.isArray(raw) && raw.length === RULES.DECK_SIZE) return raw; } catch (e) {} return null; }
function saveCustomDeck(list) { localStorage.setItem(LS_DECK, JSON.stringify(list)); }
function resetCustomDeck() { localStorage.removeItem(LS_DECK); }
function loadCollection() {
  try { const raw = JSON.parse(localStorage.getItem(LS_COLLECTION) || "null"); if (raw) return raw; } catch (e) {}
  const obj = {}; CARD_POOL.forEach(c => obj[c.id] = true);
  localStorage.setItem(LS_COLLECTION, JSON.stringify(obj));
  return obj;
}
function loadStoryProgress() {
  try { const raw = JSON.parse(localStorage.getItem(LS_STORY) || "null"); if (raw) return raw; } catch (e) {}
  return { cleared: [], route: null };
}
function saveStoryProgress(p) { localStorage.setItem(LS_STORY, JSON.stringify(p)); }

function buildDeckFor(list) { const d = [...list]; shuffle(d); return d; }
function shuffle(arr) { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[arr[i], arr[j]] = [arr[j], arr[i]]; } }
function uid() { return Math.random().toString(36).slice(2, 9); }

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
}

function endTurn() {
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
}

function checkGameEnd() {
  if (!G || G.gameOver) return;
  if (G.self.core <= 0 || G.opp.core <= 0) {
    G.gameOver = true;
    const win = G.opp.core <= 0 && G.self.core > 0;
    const draw = G.self.core <= 0 && G.opp.core <= 0;
    const msg = draw ? "引き分け" : (win ? "勝利!" : "敗北... AIの勝利");
    if (G.storyStage) endStoryBattle(win && !draw, msg);
    else showResultOverlay(msg);
  }
}

// ---------- 簡易AI ----------
function runAiTurn() {
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
  document.getElementById("endTurnBtn").disabled = G.active !== "self" || G.gameOver;
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
    if (["SR", "UR", "XR", "SEC"].includes(card.rarity)) div.classList.add(`rarity-glow-${card.rarity}`);
    if (!knownInstanceIds[owner].has(a.instanceId)) div.classList.add("enter");
    const done = a.hasActed || (a.summonedThisTurn && !a.quickAllowed);
    if (done) div.classList.add("tappedOrDone");
    div.innerHTML = `<div class="name">${card.name}</div><div class="stats"><b>${effAtk(a, owner)}</b><i>${effDef(a, owner)}</i><u>${effSpd(a)}</u></div>`;
    if (owner === "self" && G.active === "self" && !done && !G.gameOver) {
      const row = document.createElement("div"); row.className = "actorBtnRow";
      if (G.opp.field.length > 0) { const btn = document.createElement("button"); btn.textContent = "攻撃"; btn.onclick = () => { div.classList.add("attackAnim"); setTimeout(() => openAttackPicker(a.instanceId), 150); }; row.appendChild(btn); }
      const csBtn = document.createElement("button"); csBtn.textContent = "CORE STRIKE";
      csBtn.disabled = G.opp.field.length > 0 && !a.unlockCoreStrike;
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
    div.className = "handCard " + (playable ? "canPlay" : "cannotPlay");
    const statLine = card.type === "ACTOR" ? ` / ${cardId === "VC-056" ? "X" : card.atk}-${cardId === "VC-056" ? "X" : card.def}-${cardId === "VC-056" ? "X" : card.spd}` : "";
    div.innerHTML = `<div class="cname">${card.name}</div><div class="cmeta">${card.rarity} / ${card.type} / C${cost}${statLine}</div>`;
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
function showScreen(id) { ["menuScreen", "storyScreen", "deckScreen", "collectionScreen", "gameScreen"].forEach(s => document.getElementById(s).classList.toggle("hidden", s !== id)); }
function refreshMenu() {
  const deck = loadCustomDeck();
  document.getElementById("deckStatus").textContent = deck ? "カスタムデッキ(30枚)で対戦します" : "初期デッキ(N24種ベース・30枚)で対戦します";
}

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

// ---------- デッキ編成 ----------
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
    const div = document.createElement("div"); div.className = "poolCard";
    div.innerHTML = `<div class="rarity ${card.rarity}">${card.rarity}</div><div class="pname">${card.name}</div><div class="pmeta">${card.type} / C${card.id === "VC-056" ? "X" : card.cost}</div>
      <div class="stepper"><button data-a="-1">-</button><span>${count}</span><button data-a="1">+</button></div>`;
    div.querySelector('button[data-a="-1"]').onclick = () => { if (count > 0) { workingDeckCounts[card.id] = count - 1; renderDeckScreen(); } };
    div.querySelector('button[data-a="1"]').onclick = () => { if (count < RULES.MAX_COPIES && totalDeckCount() < RULES.DECK_SIZE) { workingDeckCounts[card.id] = count + 1; renderDeckScreen(); } };
    grid.appendChild(div);
  }
}

// ---------- カード図鑑 ----------
function openCollectionScreen() {
  const collection = loadCollection();
  const grid = document.getElementById("collectionGrid"); grid.innerHTML = "";
  for (const card of CARD_POOL) {
    const owned = !!collection[card.id];
    const div = document.createElement("div"); div.className = "poolCard" + (owned ? "" : " locked");
    div.innerHTML = `<div class="rarity ${card.rarity}">${card.rarity}</div><div class="pname">${owned ? card.name : "???"}</div><div class="pmeta">${owned ? `${card.type} / C${card.id === "VC-056" ? "X" : card.cost}` : "未所持"}</div>`;
    grid.appendChild(div);
  }
  showScreen("collectionScreen");
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
  startTurn();
}

// ---------- 初期化 ----------
function init() {
  refreshMenu();
  document.getElementById("btnStory").onclick = openStoryScreen;
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
  document.getElementById("quitBtn").onclick = () => { showScreen("menuScreen"); refreshMenu(); };
  document.getElementById("endTurnBtn").onclick = () => { if (G && G.active === "self" && !G.gameOver) endTurn(); };
  document.getElementById("overlayCloseBtn").onclick = defaultOverlayClose;
  showScreen("menuScreen");
}
window.addEventListener("DOMContentLoaded", init);
