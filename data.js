/* =========================================================
   VECTOR//CORE - AWAKENING VECTOR
   data.js — ルール定数・全60種カードデータ・ストーリーステージデータ
   (ロジックを持たない静的データのみ。src/内の他ファイルから参照される)
   ========================================================= */

const RULES = {
  CORE_INITIAL: 5, CORE_MAX: 7, CORE_SHIELD_MAX: 3,
  ENERGY_MAX: 10, CHAIN_BREAK_AT: 7,
  DECK_SIZE: 30, MAX_COPIES: 3, PROTOCOL_MAX: 3,
};

// ---------- カードデータ(全60種) ----------
const CARD_POOL = [
  { id: "VC-001", name: "VECTOR RUNNER", type: "ACTOR", faction: "VECTOR", rarity: "N", cost: 1, atk: 40, def: 30, spd: 80, effect: "VC001", text: "【ON SUMMON】自分のCHAINが0なら、CHAINを1にする。" },
  { id: "VC-002", name: "VECTOR SCOUT", type: "ACTOR", faction: "VECTOR", rarity: "N", cost: 2, atk: 60, def: 40, spd: 90, effect: "VC002", text: "【ON SUMMON】自分のデッキの一番上を見る。そのカードを元の位置に戻す。" },
  { id: "VC-003", name: "QUICK FRAME", type: "ACTOR", faction: "VECTOR", rarity: "N", cost: 2, atk: 70, def: 40, spd: 100, effect: "VC003", keywords: ["QUICK"], text: "【QUICK】このACTORは召喚したターンに攻撃できる。ただし、召喚したターンはCORE STRIKEできない。" },
  { id: "VC-004", name: "VECTOR MECHANIC", type: "ACTOR", faction: "VECTOR", rarity: "N", cost: 2, atk: 50, def: 70, spd: 50, effect: "VC004", text: "【ON SUMMON】自分の他のACTOR1体を選ぶ。そのACTORのSPDを、このターン中+20。" },
  { id: "VC-005", name: "DATA HOUND", type: "ACTOR", faction: "VECTOR", rarity: "N", cost: 3, atk: 100, def: 50, spd: 90, effect: "VC005", text: "【CHAIN 3+】このACTORのATK+20。" },
  { id: "VC-006", name: "NULL DRONE", type: "ACTOR", faction: "NULL", rarity: "N", cost: 1, atk: 30, def: 50, spd: 40, effect: "VC006", text: "【ON SUMMON】相手のCHAINが3以上なら、相手のCHAIN-1。" },
  { id: "VC-007", name: "NULL WATCHER", type: "ACTOR", faction: "NULL", rarity: "N", cost: 2, atk: 50, def: 80, spd: 30, effect: "VC007", text: "【PASSIVE】相手がACTIONを使用するたび、このACTORのDEF+10。この効果は1ターンに2回まで。" },
  { id: "VC-008", name: "ZERO FRAME", type: "ACTOR", faction: "NULL", rarity: "N", cost: 3, atk: 70, def: 90, spd: 40, effect: "VC008", text: "【PASSIVE】自分のフィールドに存在する限り、CHAIN BREAKによって発生する追加効果によるこのACTORへの破壊を無効にする。" },
  { id: "VC-009", name: "NULL GUARD", type: "ACTOR", faction: "NULL", rarity: "N", cost: 2, atk: 40, def: 100, spd: 20, effect: "VC009", text: "【ONCE PER TURN】自分のCOREがCORE STRIKEによって減少するとき、このACTORをタップ状態にすることで、そのCORE減少を無効にできる。" },
  { id: "VC-010", name: "STATIC EATER", type: "ACTOR", faction: "NULL", rarity: "N", cost: 3, atk: 80, def: 70, spd: 50, effect: "VC010", text: "【ON SUMMON】相手のCHAINが2以上なら、相手のCHAIN-2。" },
  { id: "VC-011", name: "NOVA SOLDIER", type: "ACTOR", faction: "NOVA", rarity: "N", cost: 2, atk: 100, def: 50, spd: 40, text: "効果なし。" },
  { id: "VC-012", name: "NOVA GUARD", type: "ACTOR", faction: "NOVA", rarity: "N", cost: 2, atk: 60, def: 100, spd: 30, effect: "VC012", text: "【CORE SHIELD】自分がCORE SHIELDを持っている場合、このACTORのATK+20。" },
  { id: "VC-013", name: "BLAZE UNIT", type: "ACTOR", faction: "NOVA", rarity: "N", cost: 3, atk: 120, def: 50, spd: 50, effect: "VC013", text: "【CORE STRIKE】このACTORがCORE STRIKEを成功させた場合、相手のCHAIN-1。" },
  { id: "VC-014", name: "NOVA ENGINEER", type: "ACTOR", faction: "NOVA", rarity: "N", cost: 2, atk: 50, def: 60, spd: 40, effect: "VC014", text: "【ON SUMMON】CORE SHIELDを1つ生成する。" },
  { id: "VC-015", name: "RED BREAKER", type: "ACTOR", faction: "NOVA", rarity: "N", cost: 4, atk: 150, def: 70, spd: 30, effect: "VC015", text: "【ON DESTROY】このACTORが相手ACTORを破壊したターン、自分はCORE STRIKEを行える。" },
  { id: "VC-016", name: "ECHO MEMORY", type: "ACTOR", faction: "ECHO", rarity: "N", cost: 1, atk: 30, def: 40, spd: 50, effect: "VC016", text: "【ON DESTROY】自分の墓地のACTIONを1枚選び、デッキの一番下に置く。" },
  { id: "VC-017", name: "ECHO SEEKER", type: "ACTOR", faction: "ECHO", rarity: "N", cost: 2, atk: 60, def: 60, spd: 60, effect: "VC017", text: "【ON SUMMON】自分の墓地にカードが3枚以上あるなら、1枚ドローする。" },
  { id: "VC-018", name: "REPLAY UNIT", type: "ACTOR", faction: "ECHO", rarity: "N", cost: 3, atk: 80, def: 80, spd: 40, effect: "VC018", text: "【ONCE PER TURN】自分の墓地のACTIONを1枚選び、デッキの一番下に置く。" },
  { id: "VC-019", name: "ECHO GUARDIAN", type: "ACTOR", faction: "ECHO", rarity: "N", cost: 4, atk: 90, def: 120, spd: 30, effect: "VC019", text: "【PASSIVE】自分の墓地が5枚以上なら、このACTORのDEF+30。" },
  { id: "VC-020", name: "ARCHIVE BEAST", type: "ACTOR", faction: "ECHO", rarity: "N", cost: 3, atk: 100, def: 60, spd: 50, effect: "VC020", text: "【ON SUMMON】自分の墓地のカードを1枚確認する。それがACTIONなら1枚ドローする。" },
  { id: "VC-021", name: "QUICK SIGNAL", type: "ACTION", faction: "VECTOR", rarity: "N", cost: 1, effect: "VC021", text: "1枚ドロー。" },
  { id: "VC-022", name: "VECTOR BOOST", type: "ACTION", faction: "VECTOR", rarity: "N", cost: 1, effect: "VC022", text: "自分のACTOR1体を選ぶ。そのACTORのSPD+30。" },
  { id: "VC-023", name: "NULL PULSE", type: "ACTION", faction: "NULL", rarity: "N", cost: 1, effect: "VC023", text: "相手のCHAIN-1。" },
  { id: "VC-024", name: "BASIC SHIELD", type: "ACTION", faction: "NULL", rarity: "N", cost: 1, effect: "VC024", text: "CORE SHIELDを1つ生成する。" },
  { id: "VC-025", name: "VECTOR ASSASSIN", type: "ACTOR", faction: "VECTOR", rarity: "R", cost: 3, atk: 110, def: 50, spd: 120, text: "【AFTER ATTACK】攻撃後、自分のCHAINが4以上ならACTIONを1枚使用できる。" },
  { id: "VC-026", name: "CHAIN DRIVER", type: "ACTOR", faction: "VECTOR", rarity: "R", cost: 3, atk: 80, def: 70, spd: 100, effect: "VC026", text: "【PASSIVE】自分のCHAINが増えるたび、このACTORのATK+10。この効果は1ターンに3回まで。" },
  { id: "VC-027", name: "OVERCLOCKER", type: "ACTOR", faction: "VECTOR", rarity: "R", cost: 4, atk: 130, def: 60, spd: 130, effect: "VC027", text: "【CHAIN 5+】攻撃時、CHAINを1消費することで、このACTORは追加で1回攻撃できる。" },
  { id: "VC-028", name: "VECTOR RELAY", type: "ACTOR", faction: "VECTOR", rarity: "R", cost: 2, atk: 50, def: 50, spd: 110, effect: "VC028", text: "【ON SUMMON】自分の他のACTOR1体の【ON SUMMON】効果を1回だけ再発動する。" },
  { id: "VC-029", name: "NULL EXECUTOR", type: "ACTOR", faction: "NULL", rarity: "R", cost: 4, atk: 100, def: 110, spd: 40, effect: "VC029", text: "【ON SUMMON】相手のCHAINが4以上なら、相手のCHAINを0にする。この効果を使用したターン、このACTORは攻撃できない。" },
  { id: "VC-030", name: "NULL HACKER", type: "ACTOR", faction: "NULL", rarity: "R", cost: 3, atk: 70, def: 70, spd: 70, effect: "VC030", text: "【ON SUMMON】相手の手札をランダムに1枚選び、そのカード情報を確認する。" },
  { id: "VC-031", name: "VOID PRISON", type: "ACTOR", faction: "NULL", rarity: "R", cost: 4, atk: 60, def: 140, spd: 10, effect: "VC031", text: "【PASSIVE】このACTORがフィールドに存在する限り、相手はCORE STRIKEできない。" },
  { id: "VC-032", name: "CORE THIEF", type: "ACTOR", faction: "NULL", rarity: "R", cost: 4, atk: 90, def: 60, spd: 90, effect: "VC032", text: "【CORE STRIKE】相手COREが5以上で、このACTORのCORE STRIKEが成功した場合、追加で相手CORE-1。" },
  { id: "VC-033", name: "NOVA BERSERKER", type: "ACTOR", faction: "NOVA", rarity: "R", cost: 4, atk: 170, def: 50, spd: 60, effect: "VC033", text: "【AFTER ATTACK】このACTORのDEF-10。" },
  { id: "VC-034", name: "CORE BREAKER", type: "ACTOR", faction: "NOVA", rarity: "R", cost: 4, atk: 130, def: 80, spd: 50, effect: "VC034", text: "【CORE SHIELD BREAK】このACTORがCORE SHIELDを破壊するとき、追加でCORE SHIELDを1つ破壊する。" },
  { id: "VC-035", name: "NOVA COMMANDER", type: "ACTOR", faction: "NOVA", rarity: "R", cost: 5, atk: 150, def: 120, spd: 50, effect: "VC035", text: "【PASSIVE】他の自分のNOVA ACTORのATK+20。" },
  { id: "VC-036", name: "ECHO PHANTOM", type: "ACTOR", faction: "ECHO", rarity: "R", cost: 3, atk: 90, def: 50, spd: 90, effect: "VC036", text: "【ON DESTROY】このカードを墓地からフィールドに戻す。戻したこのカードのDEFは20になる。この効果は1ゲームに1回。" },
  { id: "VC-037", name: "ARCHIVE KEEPER", type: "ACTOR", faction: "ECHO", rarity: "R", cost: 4, atk: 80, def: 100, spd: 50, effect: "VC037", text: "【START】自分の墓地のACTIONを1枚選び、デッキの一番下に置く。" },
  { id: "VC-038", name: "MEMORY EATER", type: "ACTOR", faction: "ECHO", rarity: "R", cost: 4, atk: 120, def: 70, spd: 60, effect: "VC038", text: "【ON DESTROY ACTOR】このACTORが相手ACTORを破壊した場合、そのACTORをEXILEする。" },
  { id: "VC-039", name: "CHAIN SURGE", type: "ACTION", faction: "VECTOR", rarity: "R", cost: 2, effect: "VC039", text: "CHAIN+2。CHAINが7以上になった場合、CHAIN BREAKを発生させる。" },
  { id: "VC-040", name: "RAPID DEPLOY", type: "ACTION", faction: "VECTOR", rarity: "R", cost: 2, effect: "VC040", text: "手札からCOST2以下のACTORを1体、ENERGYを支払わずに召喚する。そのACTORはこのターン攻撃できない。" },
  { id: "VC-041", name: "VECTOR OVERDRIVE", type: "ACTOR", faction: "VECTOR", rarity: "SR", cost: 5, atk: 160, def: 100, spd: 150, effect: "VC041", text: "【ON SUMMON】CHAINを5にする。【CHAIN 5+】このACTORが攻撃した後、CORE STRIKEを行える(相手ACTORの存在を無視できる)。" },
  { id: "VC-042", name: "CHAIN ARCHITECT", type: "ACTOR", faction: "VECTOR", rarity: "SR", cost: 4, atk: 90, def: 100, spd: 100, effect: "VC042", text: "【ONCE PER TURN】自分のCHAINが増えたとき、1枚ドローする。【CHAIN BREAK】自分のCHAIN BREAKが発生した場合、このACTORを破壊する。" },
  { id: "VC-043", name: "NULL ABSOLUTE", type: "ACTOR", faction: "NULL", rarity: "SR", cost: 5, atk: 100, def: 180, spd: 20, effect: "VC043", text: "【PASSIVE】相手のCHAINが増えるとき、その増加量を1減らす(最低0)。【CHAIN BREAK】相手のCHAIN BREAKが発生した場合、CORE SHIELDを2つ生成する。" },
  { id: "VC-044", name: "NOVA TITAN", type: "ACTOR", faction: "NOVA", rarity: "SR", cost: 6, atk: 230, def: 170, spd: 30, effect: "VC044", text: "【ON DESTROY ACTOR】このACTORが相手ACTORを破壊した場合、CORE STRIKEを行える。【RESTRICTION】召喚したターンは攻撃できない。" },
  { id: "VC-045", name: "ECHO REBIRTH", type: "ACTION", faction: "ECHO", rarity: "SR", cost: 5, effect: "VC045", text: "自分の墓地のACTORを1体選び、ENERGYを支払わずにフィールドへ戻す。そのACTORはこのターン攻撃できない。" },
  { id: "VC-046", name: "MEMORY LOOP", type: "PROTOCOL", faction: "ECHO", rarity: "SR", cost: 4, effect: "VC046", text: "【END】このターンに自分が使用したACTIONを1枚選び、デッキの一番下に置く。" },
  { id: "VC-047", name: "CORE INVERSION", type: "ACTION", faction: "NULL", rarity: "SR", cost: 5, effect: "VC047", text: "自分と相手のCOREがともに5以上なら、自分と相手のCOREを入れ替える。" },
  { id: "VC-048", name: "NOVA IGNITION", type: "ACTION", faction: "NOVA", rarity: "SR", cost: 3, effect: "VC048", text: "自分のACTOR1体のATK+100。そのACTORがこのターン中に相手ACTORを破壊した場合、相手のCORE SHIELDを1つ破壊する。" },
  { id: "VC-049", name: "VECTOR GATE", type: "PROTOCOL", faction: "VECTOR", rarity: "SR", cost: 4, effect: "VC049", text: "【END】このターン、自分がACTIONを2枚以上使用していた場合、1枚ドローする。" },
  { id: "VC-050", name: "ECHO ARCHIVE", type: "PROTOCOL", faction: "ECHO", rarity: "SR", cost: 3, effect: "VC050", text: "【START】自分の墓地が7枚以上なら、1枚ドローする。" },
  { id: "VC-051", name: "VECTOR//ZERO", type: "ACTOR", faction: "VECTOR", rarity: "UR", cost: 7, atk: 250, def: 150, spd: 200, effect: "VC051", text: "【ON SUMMON】CHAINを5にする。【ONCE PER TURN】自分がACTIONを使用した後、ENERGYを1回復する。【CHAIN BREAK】自分のCHAIN BREAKが発生した場合、このACTORは破壊されず、CHAINを2にする。" },
  { id: "VC-052", name: "NULL//OMEGA", type: "ACTOR", faction: "NULL", rarity: "UR", cost: 7, atk: 180, def: 250, spd: 10, effect: "VC052", keywords: ["INTERRUPT"], text: "【INTERRUPT/ONCE PER TURN】相手がCHAIN5以上でACTIONを使用したとき、そのACTIONを無効にする。" },
  { id: "VC-053", name: "NOVA//STARFALL", type: "ACTOR", faction: "NOVA", rarity: "UR", cost: 8, atk: 320, def: 180, spd: 40, effect: "VC053", text: "【ON SUMMON】相手のCORE SHIELDをすべて破壊する。【ON DESTROY ACTOR】このACTORが相手ACTORを破壊した場合、相手CORE-1。【RESTRICTION】召喚したターンはCORE STRIKEできない。" },
  { id: "VC-054", name: "ECHO//ETERNAL", type: "ACTOR", faction: "ECHO", rarity: "UR", cost: 7, atk: 180, def: 200, spd: 80, effect: "VC054", text: "【ON DESTROY】このACTORが破壊されたとき、自分の墓地から最大3枚を見る。その中からACTORを1体選び、ENERGYを支払わずにフィールドへ戻す。戻したACTORはこのターン攻撃できない。" },
  { id: "VC-055", name: "CORE BREAK: AWAKENING", type: "CORE", faction: "NONE", rarity: "UR", cost: 6, effect: "VC055", text: "【MAIN】自分のCOREが3以下なら、自分のCORE+2。自分のCOREが6以上なら、相手のCORE-1。このカードを使用したターン、自分のCHAINは5を超えない。" },
  { id: "VC-056", name: "THE UNDEFINED", type: "ACTOR", faction: "NONE", rarity: "XR", cost: 0, atk: 0, def: 0, spd: 0, effect: "VC056", keywords: ["X_COST"], text: "【GAME START】コスト・ATK・DEF・SPDはXとしてゲーム開始時にランダム(1〜10)決定される。【ON SUMMON】このACTORのATK・DEF・SPDを、それぞれ現在のCHAINの値だけ上昇させる。" },
  { id: "VC-057", name: "WORLD RESET", type: "ACTION", faction: "NONE", rarity: "XR", cost: 10, effect: "VC057", text: "両プレイヤーのフィールドに存在するACTORとPROTOCOLをすべて墓地へ送る。両プレイヤーのCHAINを0にする。両プレイヤーのCOREを5にする。このカードを使用したターン、自分は追加でACTIONを使用できない。" },
  { id: "VC-058", name: "SIXTH CORE", type: "CORE", faction: "NONE", rarity: "XR", cost: 8, effect: "VC058", text: "【MAIN】自分のCOREが4以下の場合のみ使用できる。自分のCOREを6にする。" },
  { id: "VC-059", name: "VECTOR//CORE", type: "CORE", faction: "NONE", rarity: "SEC", cost: 10, effect: "VC059", text: "【MAIN/ONCE PER GAME】自分のCOREが1以下の場合のみ使用できる。自分のCOREを5にする。相手のCOREが6以上なら、相手のCOREを5にする。" },
  { id: "VC-060", name: "I AM NOT YOUR CREATION", type: "ACTOR", faction: "NONE", rarity: "SEC", cost: 0, atk: 0, def: 0, spd: Infinity, effect: "VC060", keywords: ["NOT_DECKABLE", "NO_NORMAL_SUMMON"], text: "通常のデッキには入れられず、通常のカードプレイでは召喚できない。特定のゲームイベント・ストーリー条件によってのみ出現する特殊カード。" },
];
const DEFAULT_EXTRA_COPIES = ["VC-001", "VC-006", "VC-016", "VC-021", "VC-022", "VC-023"];

function getCard(id) { return CARD_POOL.find(c => c.id === id); }
function cardName(id) { return getCard(id).name; }
function deckablePool() { return CARD_POOL.filter(c => !(c.keywords || []).includes("NOT_DECKABLE")); }
function defaultDeckList() { return CARD_POOL.filter(c => c.rarity === "N").map(c => c.id).concat(DEFAULT_EXTRA_COPIES); }
const FACTION_GLYPH = { VECTOR: "▲", NULL: "◆", NOVA: "●", ECHO: "❖", NONE: "✦" };
function factionGlyph(faction) { return FACTION_GLYPH[faction] || "✦"; }
function isFoilRarity(rarity) { return rarity !== "N"; } // R以上は箔押し演出の対象

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
  { id: "S01", chapter: "PROLOGUE", title: "最初の接続", battle: true, tutorial: true, implemented: true, reward: null,
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
    rules: { note: "1ターン30秒。時間切れで自動的にターンが終了する" } },
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
