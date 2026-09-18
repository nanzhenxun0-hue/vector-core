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
const TREASURE_RATE = 1 / 50; // SECを引いた中でさらに1/50 = 全体では約1/25000の超低確率
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
  const isTreasure = rarity === "SEC" && Math.random() < TREASURE_RATE;
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
function saveStoryProgress(p) { localStorage.setItem(LS_STORY, JSON.stringify(p)); }

function buildDeckFor(list) { const d = [...list]; shuffle(d); return d; }
function shuffle(arr) { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[arr[i], arr[j]] = [arr[j], arr[i]]; } }
function uid() { return Math.random().toString(36).slice(2, 9); }
