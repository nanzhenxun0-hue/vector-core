/* ---------- net.js: オンライン(P2P)対戦 ----------
 * サーバー不要。WebRTCのデータ通信で2台を直接つなぐ(接続コードを手動で交換する方式)。
 * 対戦は「ロックステップ」: 両端末が同じシード乱数・同じデッキ・同じ操作列でエンジンを動かし、
 * 操作(召喚/攻撃/ターン終了/選択など)だけを送り合う。盤面の同期ズレは起きない設計。
 */
const NET = {
  pc: null, ch: null, role: null, connected: false,
  applying: 0, depth: 0, pendingChoice: null, mull: null,
  seed: 0, hostDeck: null, started: false,
};
const NET_ICE = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }, { urls: "stun:stun1.l.google.com:19302" }] };

function netSend(obj) { try { if (NET.ch && NET.ch.readyState === "open") NET.ch.send(JSON.stringify(obj)); } catch (e) {} }
function netAwaitChoice(candidates, cb) {
  NET.pendingChoice = i => cb(candidates[i] !== undefined ? candidates[i] : candidates[0]);
  flashBanner("相手が選択中…", "chainBreak");
}

// ---------- 接続コード(SDPを圧縮して文字列化) ----------
function b64uEncode(bytes) { let s = ""; bytes.forEach(b => s += String.fromCharCode(b)); return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""); }
function b64uDecode(str) { str = str.replace(/-/g, "+").replace(/_/g, "/"); while (str.length % 4) str += "="; const bin = atob(str); return Uint8Array.from(bin, c => c.charCodeAt(0)); }
async function encodeCode(desc) {
  const json = JSON.stringify({ s: desc.sdp, t: desc.type });
  const raw = new TextEncoder().encode(json);
  if (typeof CompressionStream !== "undefined") {
    const buf = await new Response(new Blob([raw]).stream().pipeThrough(new CompressionStream("deflate-raw"))).arrayBuffer();
    return "VC1." + b64uEncode(new Uint8Array(buf));
  }
  return "VC0." + b64uEncode(raw);
}
async function decodeCode(code) {
  code = (code || "").trim().replace(/\s+/g, "");
  const kind = code.slice(0, 4), body = code.slice(4);
  let bytes = b64uDecode(body);
  if (kind === "VC1.") bytes = new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream("deflate-raw"))).arrayBuffer());
  else if (kind !== "VC0.") throw new Error("コードの形式が正しくありません");
  const o = JSON.parse(new TextDecoder().decode(bytes));
  return { sdp: o.s, type: o.t };
}
function waitIceComplete(pc) {
  return new Promise(res => {
    if (pc.iceGatheringState === "complete") return res();
    const t = setTimeout(res, 5000);
    pc.addEventListener("icegatheringstatechange", () => { if (pc.iceGatheringState === "complete") { clearTimeout(t); res(); } });
  });
}
function netCreatePc() {
  netCloseConn();
  NET.pc = new RTCPeerConnection(NET_ICE);
  NET.pc.onconnectionstatechange = () => {
    const st = NET.pc && NET.pc.connectionState;
    if (st === "failed" || st === "disconnected" || st === "closed") netOnDisconnected();
  };
  return NET.pc;
}
function netBindChannel(ch) {
  NET.ch = ch;
  ch.onopen = () => {
    NET.connected = true; netSetStatus("接続しました。対戦を準備しています…");
    if (NET.role === "host") {
      NET.seed = (Math.random() * 4294967296) >>> 0;
      NET.hostDeck = loadCustomDeck() || defaultDeckList();
      netSend({ t: "init", seed: NET.seed, deck: NET.hostDeck });
    }
  };
  ch.onmessage = e => { try { netHandle(JSON.parse(e.data)); } catch (err) { console.error(err); } };
  ch.onclose = () => netOnDisconnected();
}
async function netHostCreate() {
  NET.role = "host";
  const pc = netCreatePc();
  netBindChannel(pc.createDataChannel("vc", { ordered: true }));
  await pc.setLocalDescription(await pc.createOffer());
  await waitIceComplete(pc);
  return encodeCode(pc.localDescription);
}
async function netHostAccept(code) { await NET.pc.setRemoteDescription(await decodeCode(code)); }
async function netGuestJoin(offerCode) {
  NET.role = "guest";
  const offer = await decodeCode(offerCode);
  const pc = netCreatePc();
  pc.ondatachannel = e => netBindChannel(e.channel);
  await pc.setRemoteDescription(offer);
  await pc.setLocalDescription(await pc.createAnswer());
  await waitIceComplete(pc);
  return encodeCode(pc.localDescription);
}
function netCloseConn() {
  try { if (NET.ch) { NET.ch.onclose = null; NET.ch.close(); } } catch (e) {}
  try { if (NET.pc) { NET.pc.onconnectionstatechange = null; NET.pc.close(); } } catch (e) {}
  NET.pc = null; NET.ch = null; NET.connected = false; NET.started = false; NET.pendingChoice = null; NET.mull = null;
}
function netSetStatus(t) { const el = document.getElementById("onlineStatus"); if (el) el.textContent = t; }

// ---------- メッセージ処理 ----------
function netHandle(m) {
  switch (m.t) {
    case "emote": showEmoteBubble(m.i, false); break;
    case "rematch": NET.rematchTheirs = true; netTryRematch(); break;
    case "bye": NET.peerLeft = true; if (G && G.online) { G.gameOver = true; stopTurnTimer(); hideOverlay(); showResultOverlay("相手が退出しました。"); } break;
    case "init": { // ゲスト側: ホストの初期情報を受けて対戦開始
      NET.started = false; NET.rematchMine = NET.rematchTheirs = false; hideOverlay(); NET.seed = m.seed; NET.hostDeck = m.deck;
      const mine = loadCustomDeck() || defaultDeckList();
      netSend({ t: "ready", deck: mine });
      startOnlineBattle("guest", m.seed, m.deck, mine);
      break;
    }
    case "ready": startOnlineBattle("host", NET.seed, NET.hostDeck, m.deck); break;
    case "mull": if (NET.mull) { NET.mull.theirs = m.idx; netTryFinishMull(); } break;
    case "choice": if (NET.pendingChoice) { const p = NET.pendingChoice; NET.pendingChoice = null; p(m.i); } break;
    case "act": netApply(m); break;
    case "quit": netRemoteQuit(); break;
  }
}
function netApply(m) {
  if (!G || !G.online || G.gameOver) return;
  NET.applying++;
  try {
    switch (m.k) {
      case "summon": summonActor("opp", m.id); break;
      case "action": useAction("opp", m.id); break;
      case "protocol": placeProtocol("opp", m.id); break;
      case "core": useCore("opp", m.id); break;
      case "attack": attack("opp", m.a, m.b); break;
      case "strike": coreStrike("opp", m.a); break;
      case "replay": activateReplayUnit("opp", m.a); break;
      case "end": endTurn(); break;
    }
  } finally { NET.applying--; }
  render();
}
function netRemoteQuit() {
  if (!G || !G.online || G.gameOver) return;
  G.gameOver = true; stopTurnTimer(); addCurrency(30);
  if (typeof trackStat === "function") { trackStat("wins"); trackStat("onlineWins"); }
  showResultOverlay("勝利!(相手が投了しました)");
}
function netOnDisconnected() {
  if (G && G.online && !G.gameOver) { G.gameOver = true; stopTurnTimer(); showResultOverlay("接続が切れました。対戦を終了します。"); }
  else if (!G || !G.online) netSetStatus("接続が切れました。もう一度やり直してください。");
}
function netLeave() {
  const wasOnline = G && G.online;
  netCloseConn(); clearRng();
  if (G) G.online = false;
  NET.role = null;
  if (wasOnline) { showScreen("menuScreen"); refreshMenu(); }
}
function netForfeit() {
  showChoiceOverlay("投了して対戦を終了しますか?", [
    { label: "投了する", onClick: () => { netSend({ t: "quit" }); if (G) G.gameOver = true; stopTurnTimer(); netLeave(); } },
    { label: "続ける", onClick: () => {} },
  ]);
}

// ---------- 対戦開始(両端末で同一の初期状態を作る) ----------
function startOnlineBattle(role, seed, hostDeck, guestDeck) {
  if (NET.started) return; NET.started = true;
  seedRng(seed);
  knownInstanceIds.self = new Set(); knownInstanceIds.opp = new Set();
  const p1 = newPlayer("P1", hostDeck), p2 = newPlayer("P2", guestDeck); // 乱数の消費順を両端末で揃える
  const firstIsP1 = rand() < 0.5;
  const mine = role === "host" ? p1 : p2, theirs = role === "host" ? p2 : p1;
  mine.name = "YOU"; theirs.name = "相手";
  if (typeof trackStat === "function") trackStat("onlinePlays");
  G = { self: mine, opp: theirs, active: "self", turn: 1, gameOver: false, storyStage: null, storyMods: null, online: true, onlineRole: role };
  G.firstPlayer = (firstIsP1 === (role === "host")) ? "self" : "opp";
  G.active = G.firstPlayer;
  draw(p1, 5); draw(p2, 5);
  document.getElementById("logArea").innerHTML = "";
  log(`オンライン対戦開始(あなたは${role === "host" ? "ホスト" : "ゲスト"})`);
  log(`先攻: ${G.firstPlayer === "self" ? "あなた" : "相手"}`);
  showScreen("gameScreen");
  playBgm("vectorBattle");
  netBeginMulligan(startTurn);
}
function netBeginMulligan(afterFn) {
  NET.mull = { mine: null, theirs: null, after: afterFn };
  mulliganSelected = [];
  render(); renderMulliganOverlay();
  document.getElementById("mulliganOverlay").classList.remove("hidden");
  const swap = document.getElementById("mulliganSwapBtn"), keep = document.getElementById("mulliganKeepBtn");
  swap.disabled = false; keep.disabled = false;
  keep.onclick = () => netSubmitMull([]);
  swap.onclick = () => netSubmitMull(mulliganSelected.slice());
}
function netSubmitMull(idx) {
  if (!NET.mull || NET.mull.mine !== null) return;
  NET.mull.mine = idx; netSend({ t: "mull", idx });
  const swap = document.getElementById("mulliganSwapBtn"), keep = document.getElementById("mulliganKeepBtn");
  swap.disabled = true; keep.disabled = true; swap.textContent = "相手の選択を待っています…";
  netTryFinishMull();
}
function netTryFinishMull() {
  const m = NET.mull; if (!m || m.mine === null || m.theirs === null) return;
  NET.mull = null;
  // 乱数の消費順を揃えるため、必ずP1(ホスト)→P2(ゲスト)の順に交換する
  if (G.onlineRole === "host") { mulliganExchange(G.self, m.mine); mulliganExchange(G.opp, m.theirs); }
  else { mulliganExchange(G.opp, m.theirs); mulliganExchange(G.self, m.mine); }
  document.getElementById("mulliganOverlay").classList.add("hidden");
  document.getElementById("mulliganSwapBtn").disabled = false;
  if (m.mine.length) log(`あなた: マリガンで${m.mine.length}枚を交換した`);
  if (m.theirs.length) log(`相手: マリガンで${m.theirs.length}枚を交換した`);
  render(); m.after();
}

// ---------- 操作の送信(既存の関数を包んで、自分の操作だけ相手へ送る) ----------
(function installNetHooks() {
  function wrap(name, make, selfOnlyByOwner) {
    const orig = window[name];
    window[name] = function (...args) {
      const live = G && G.online && !NET.applying && NET.depth === 0;
      const mine = selfOnlyByOwner ? args[0] === "self" : G && G.active === "self";
      if (!live || !mine) return orig.apply(this, args);
      NET.depth++;
      let r; try { r = orig.apply(this, args); } finally { NET.depth--; }
      if (r !== false) netSend({ t: "act", ...make(args) });
      return r;
    };
  }
  wrap("summonActor", a => ({ k: "summon", id: a[1] }), true);
  wrap("useAction", a => ({ k: "action", id: a[1] }), true);
  wrap("placeProtocol", a => ({ k: "protocol", id: a[1] }), true);
  wrap("useCore", a => ({ k: "core", id: a[1] }), true);
  wrap("attack", a => ({ k: "attack", a: a[1], b: a[2] }), true);
  wrap("coreStrike", a => ({ k: "strike", a: a[1] }), true);
  wrap("activateReplayUnit", a => ({ k: "replay", a: a[1] }), true);
  wrap("endTurn", () => ({ k: "end" }), false);
  const origAi = window.runAiTurn;
  window.runAiTurn = function () { if (G && G.online) return; return origAi.apply(this, arguments); };
  const origClose = window.defaultOverlayClose;
  window.defaultOverlayClose = function () {
    if (G && G.online && G.gameOver) { hideOverlay(); netAfterGame(); return; }
    origClose();
  };
})();

// ---------- オンライン対戦画面(接続コードの交換UI) ----------
function netCopy(text, btn) {
  const done = () => { if (btn) { const t = btn.textContent; btn.textContent = "コピーしました"; setTimeout(() => btn.textContent = t, 1500); } };
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, () => netCopyFallback(text, done));
  else netCopyFallback(text, done);
}
function netCopyFallback(text, done) {
  const ta = document.createElement("textarea"); ta.value = text; document.body.appendChild(ta); ta.select();
  try { document.execCommand("copy"); done(); } catch (e) {} ta.remove();
}
function netShare(text) { if (navigator.share) navigator.share({ text }).catch(() => {}); }
function openOnlineScreen() {
  netLeave();
  ["onlineHostPanel", "onlineJoinPanel"].forEach(id => document.getElementById(id).classList.add("hidden"));
  document.getElementById("onlineModeBtns").classList.remove("hidden");
  ["hostOfferOut", "hostAnswerIn", "joinOfferIn", "joinAnswerOut"].forEach(id => document.getElementById(id).value = "");
  const deck = loadCustomDeck();
  const st = loadStats(); const rec = ` ・ 戦績 ${st.totals.onlineWins || 0}勝 / ${st.totals.onlinePlays || 0}戦`;
  document.getElementById("onlineDeckNote").textContent = (deck ? "使用デッキ: 保存したカスタムデッキ(30枚)" : "使用デッキ: 初期デッキ") + rec;
  netSetStatus(typeof RTCPeerConnection === "undefined" ? "このブラウザはP2P通信(WebRTC)に対応していません。" : "「部屋を作る」か「部屋に入る」を選んでください。");
  showScreen("onlineScreen");
}
function initOnlineUi() {
  const $ = id => document.getElementById(id);
  $("btnOnline").onclick = openOnlineScreen;
  $("onlineBackBtn").onclick = () => { netLeave(); showScreen("menuScreen"); refreshMenu(); };
  $("onlineHostBtn").onclick = async () => {
    $("onlineModeBtns").classList.add("hidden"); $("onlineHostPanel").classList.remove("hidden");
    netSetStatus("接続コードを作成中…");
    try { $("hostOfferOut").value = await netHostCreate(); netSetStatus("① 下のコードを相手に送ってください。② 相手から返ってきたコードを貼り付けて「接続」を押します。"); }
    catch (e) { netSetStatus("コード作成に失敗しました: " + e.message); }
  };
  $("onlineJoinBtn").onclick = () => {
    $("onlineModeBtns").classList.add("hidden"); $("onlineJoinPanel").classList.remove("hidden");
    netSetStatus("ホストから届いたコードを貼り付けてください。");
  };
  $("hostCopyBtn").onclick = e => netCopy($("hostOfferOut").value, e.target);
  $("hostShareBtn").onclick = () => netShare($("hostOfferOut").value);
  $("hostConnectBtn").onclick = async () => {
    try { netSetStatus("接続中…"); await netHostAccept($("hostAnswerIn").value); netSetStatus("接続待ち…(数秒かかります)"); }
    catch (e) { netSetStatus("接続できませんでした: " + e.message); }
  };
  $("joinMakeBtn").onclick = async () => {
    try { netSetStatus("返信コードを作成中…"); $("joinAnswerOut").value = await netGuestJoin($("joinOfferIn").value); netSetStatus("下の返信コードをホストへ送ってください。ホストが接続すると自動で対戦が始まります。"); }
    catch (e) { netSetStatus("コードが正しくありません: " + e.message); }
  };
  $("joinCopyBtn").onclick = e => netCopy($("joinAnswerOut").value, e.target);
  $("joinShareBtn").onclick = () => netShare($("joinAnswerOut").value);
  if (!navigator.share) { $("hostShareBtn").classList.add("hidden"); $("joinShareBtn").classList.add("hidden"); }
}

// ---------- 対戦後: 再戦 / 終了 ----------
function netAfterGame() {
  if (NET.peerLeft || !NET.connected) { netLeave(); return; }
  showChoiceOverlay("もう一度対戦しますか?", [
    { label: "再戦する", onClick: () => {
      NET.rematchMine = true; netSend({ t: "rematch" });
      if (!NET.rematchTheirs) showChoiceOverlay("相手の返答を待っています…", [{ label: "やめる", onClick: () => { netSend({ t: "bye" }); netLeave(); } }]);
      netTryRematch();
    } },
    { label: "終了する", onClick: () => { netSend({ t: "bye" }); netLeave(); } },
  ]);
}
function netTryRematch() {
  if (!(NET.rematchMine && NET.rematchTheirs) || NET.role !== "host") return;
  NET.rematchMine = NET.rematchTheirs = false;
  hideOverlay();
  NET.started = false; NET.seed = (Math.random() * 4294967296) >>> 0;
  NET.hostDeck = loadCustomDeck() || defaultDeckList();
  netSend({ t: "init", seed: NET.seed, deck: NET.hostDeck });
}
