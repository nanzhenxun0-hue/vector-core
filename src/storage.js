/* ---------- storage.js: localStorage永続化 + ガチャ抽選ロジック ---------- */
// ---------- localStorage ----------
const LS_DECK = "vc_custom_deck", LS_COLLECTION_COUNTS = "vc_collection_counts", LS_STORY = "vc_story_progress", LS_CURRENCY = "vc_gacha_points";
function loadCustomDeck() { try { const raw = JSON.parse(localStorage.getItem(LS_DECK) || "null"); if (Array.isArray(raw) && raw.length === RULES.DECK_SIZE) return raw; } catch (e) {} return null; }
function saveCustomDeck(list) { localStorage.setItem(LS_DECK, JSON.stringify(list)); }
function resetCustomDeck() { localStorage.removeItem(LS_DECK); }

// カードの所持枚数(パック開封で増える)。初回起動時だけ、初期デッキ分を無償付与してすぐ遊べるようにする。
function loadCollectionCounts() {
  try {
    const raw = JSON.parse(localStorage.getItem(LS_COLLECTION_COUNTS) || "null");
    if (raw) return raw;
  } catch (e) {}
  const obj = {};
  for (const id of defaultDeckList()) obj[id] = (obj[id] || 0) + 1;
  localStorage.setItem(LS_COLLECTION_COUNTS, JSON.stringify(obj));
  return obj;
}
function saveCollectionCounts(obj) { localStorage.setItem(LS_COLLECTION_COUNTS, JSON.stringify(obj)); }
function ownedCount(cardId) { const c = loadCollectionCounts(); return c[cardId] || 0; }
function addToCollection(cardId, n = 1) { const c = loadCollectionCounts(); c[cardId] = (c[cardId] || 0) + n; saveCollectionCounts(c); }

function loadCurrency() { const v = parseInt(localStorage.getItem(LS_CURRENCY) || "", 10); return Number.isFinite(v) ? v : 300; }
function saveCurrency(v) { localStorage.setItem(LS_CURRENCY, String(v)); }
function addCurrency(n) { saveCurrency(loadCurrency() + n); }
function spendCurrency(n) { const cur = loadCurrency(); if (cur < n) return false; saveCurrency(cur - n); return true; }

// ㊙レア(SECの中でも超低確率で出る特別な箔バージョン。所持データだけ別記録する)
const LS_TREASURE = "vc_treasure_cards";
function loadTreasureCards() { try { const raw = JSON.parse(localStorage.getItem(LS_TREASURE) || "null"); if (Array.isArray(raw)) return raw; } catch (e) {} return []; }
function hasTreasure(cardId) { return loadTreasureCards().includes(cardId); }
function markTreasure(cardId) { const list = loadTreasureCards(); if (!list.includes(cardId)) { list.push(cardId); localStorage.setItem(LS_TREASURE, JSON.stringify(list)); } }

// ---------- ガチャ抽選 ----------
const RARITY_RATES = { N: 0.60, R: 0.25, SR: 0.10, UR: 0.04, XR: 0.008, SEC: 0.002 };
// ㊙レア抽選: どのレアリティからでも出現しうるが、レアリティが低いほど追加の狭き門を用意し、
// どのレアリティで当たっても全体としてはおよそ1/25000前後になるよう調整してある。
const TREASURE_RATE_BY_RARITY = { N: 1 / 15000, R: 1 / 6000, SR: 1 / 2500, UR: 1 / 1000, XR: 1 / 200, SEC: 1 / 50 };
const PACK_COST = 100, PACK_SIZE = 5;
function rollRarity(pool) {
  const r = Math.random();
  let acc = 0;
  for (const rarity of Object.keys(RARITY_RATES)) {
    acc += RARITY_RATES[rarity];
    if (r <= acc && pool.some(c => c.rarity === rarity)) return rarity;
  }
  return "N";
}
function pullOneCard(pool) {
  const rarity = rollRarity(pool);
  const candidates = pool.filter(c => c.rarity === rarity);
  const id = candidates[Math.floor(Math.random() * candidates.length)].id;
  const isTreasure = Math.random() < TREASURE_RATE_BY_RARITY[rarity];
  return { id, isTreasure };
}
function pullPack() {
  const pool = deckablePool(); // VC-060は排出対象外
  const results = [];
  for (let i = 0; i < PACK_SIZE; i++) results.push(pullOneCard(pool));
  // 天井保証: 5枚すべてNだったら最後の1枚をR以上に引き直す
  if (results.every(r => getCard(r.id).rarity === "N")) {
    const better = pool.filter(c => c.rarity !== "N");
    results[results.length - 1] = { id: better[Math.floor(Math.random() * better.length)].id, isTreasure: false };
  }
  for (const r of results) { addToCollection(r.id, 1); if (r.isTreasure) markTreasure(r.id); }
  return results;
}
function loadStoryProgress() {
  try { const raw = JSON.parse(localStorage.getItem(LS_STORY) || "null"); if (raw) return raw; } catch (e) {}
  return { cleared: [], route: null };
}
// TRUE END用の進行集計: UNKNOWN SIGNAL(6) / CORE MEMORY(4)
const SIGNAL_STAGES = ["S00", "S09", "S14", "S20", "S26", "S31"];
const MEMORY_AWARDS = { S14: "NULL", S20: "NOVA", S26: "ECHO" };
function countSignals(p) { p = p || loadStoryProgress(); return SIGNAL_STAGES.filter(id => p.cleared.includes(id)).length; }
function countMemories(p) { p = p || loadStoryProgress(); const cm = p.coreMemory || {}; return ["VECTOR", "NULL", "NOVA", "ECHO"].filter(k => cm[k]).length; }
function sixthCoreUnlocked() { const p = loadStoryProgress(); return countMemories(p) >= 4 && countSignals(p) >= 5; }
function saveStoryProgress(p) { localStorage.setItem(LS_STORY, JSON.stringify(p)); }

function buildDeckFor(list) { const d = [...list]; shuffle(d); return d; }
// ---- 決定論乱数(オンライン対戦用): seedRngすると両端末で同じ乱数列になる ----
let _rng = null, _uidN = 0;
function seedRng(seed) { let s = seed >>> 0; _uidN = 0; _rng = () => { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function clearRng() { _rng = null; }
function rand() { return _rng ? _rng() : Math.random(); }
function shuffle(arr) { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1));[arr[i], arr[j]] = [arr[j], arr[i]]; } }
function uid() { return _rng ? "u" + (++_uidN) : Math.random().toString(36).slice(2, 9); }
