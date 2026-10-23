/* ---------- extra.js: 効果音(SE) / 統計・デイリーミッション・実績 / オンライン用スタンプ ---------- */

// ======== 効果音(WebAudioで合成。音声ファイル不要) ========
let _ac = null, seMuted = false;
try { seMuted = localStorage.getItem("vc_se_muted") === "1"; } catch (e) {}
function seCtx() {
  if (!_ac) { try { _ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; } }
  if (_ac.state === "suspended") _ac.resume().catch(() => {});
  return _ac;
}
function seTone(freq, dur, type = "sine", vol = 0.12, slideTo = null, delay = 0) {
  if (seMuted) return; const ac = seCtx(); if (!ac) return;
  const t0 = ac.currentTime + delay, o = ac.createOscillator(), g = ac.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t0);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + dur);
  g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(ac.destination); o.start(t0); o.stop(t0 + dur + 0.02);
}
function seNoise(dur, vol = 0.15, hp = 800, delay = 0) {
  if (seMuted) return; const ac = seCtx(); if (!ac) return;
  const t0 = ac.currentTime + delay, len = Math.floor(ac.sampleRate * dur), buf = ac.createBuffer(1, len, ac.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const s = ac.createBufferSource(); s.buffer = buf;
  const f = ac.createBiquadFilter(); f.type = "highpass"; f.frequency.value = hp;
  const g = ac.createGain(); g.gain.value = vol;
  s.connect(f).connect(g).connect(ac.destination); s.start(t0);
}
const SE = {
  tap: () => seTone(900, 0.05, "square", 0.04),
  summon: () => { seTone(330, 0.12, "triangle", 0.12, 660); seTone(660, 0.18, "sine", 0.08, 990, 0.08); },
  action: () => { seTone(500, 0.1, "sawtooth", 0.07, 1200); seNoise(0.08, 0.05, 3000); },
  protocol: () => { seTone(220, 0.2, "triangle", 0.1); seTone(330, 0.25, "triangle", 0.08, null, 0.06); },
  attack: () => { seNoise(0.12, 0.12, 1500); seTone(180, 0.14, "sawtooth", 0.1, 60); },
  destroy: () => { seNoise(0.35, 0.22, 300); seTone(120, 0.3, "square", 0.12, 40); },
  counter: () => { seTone(900, 0.08, "square", 0.1, 300); seTone(300, 0.2, "sawtooth", 0.1, 90, 0.08); },
  strike: () => { seTone(200, 0.35, "sawtooth", 0.14, 800); seNoise(0.25, 0.15, 600, 0.05); },
  damage: () => { seTone(150, 0.3, "sawtooth", 0.15, 50); seNoise(0.2, 0.14, 400); },
  heal: () => { seTone(520, 0.15, "sine", 0.1); seTone(780, 0.2, "sine", 0.1, null, 0.1); },
  chain: () => { for (let i = 0; i < 5; i++) seTone(400 + i * 140, 0.09, "square", 0.07, null, i * 0.05); seNoise(0.3, 0.12, 2000, 0.2); },
  turn: () => { seTone(660, 0.08, "sine", 0.08); seTone(880, 0.12, "sine", 0.08, null, 0.08); },
  win: () => [523, 659, 784, 1047].forEach((f, i) => seTone(f, 0.3, "triangle", 0.12, null, i * 0.13)),
  lose: () => [392, 330, 262, 196].forEach((f, i) => seTone(f, 0.35, "sawtooth", 0.09, null, i * 0.16)),
  claim: () => { seTone(880, 0.1, "sine", 0.1); seTone(1320, 0.2, "sine", 0.1, null, 0.08); },
  emote: () => { seTone(700, 0.08, "triangle", 0.09); seTone(930, 0.1, "triangle", 0.09, null, 0.07); },
};
function playSe(name) { try { SE[name] && SE[name](); } catch (e) {} }
function updateSeBtn() { const b = document.getElementById("seBtn"); if (b) { b.textContent = seMuted ? "🔕" : "🔔"; b.classList.toggle("muted", seMuted); } }
function toggleSeMute() { seMuted = !seMuted; try { localStorage.setItem("vc_se_muted", seMuted ? "1" : "0"); } catch (e) {} updateSeBtn(); if (!seMuted) playSe("tap"); }

// ======== 統計・デイリーミッション・実績 ========
const LS_STATS = "vc_stats_v1";
function loadStats() { try { const r = JSON.parse(localStorage.getItem(LS_STATS) || "null"); if (r) return r; } catch (e) {} return { totals: {}, daily: { date: "", counts: {}, claimed: {} }, claimedAch: {} }; }
function saveStats(s) { try { localStorage.setItem(LS_STATS, JSON.stringify(s)); } catch (e) {} }
function todayKey() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; }
function trackStat(key, n = 1) {
  const s = loadStats();
  if (s.daily.date !== todayKey()) s.daily = { date: todayKey(), counts: {}, claimed: {} };
  s.totals[key] = (s.totals[key] || 0) + n;
  s.daily.counts[key] = (s.daily.counts[key] || 0) + n;
  saveStats(s); try { refreshMissionBadge(); } catch (e) {}
}
const MISSION_POOL = [
  { id: "m_win", label: "対戦に勝利する", key: "wins", target: 1, reward: 30 },
  { id: "m_summon", label: "ACTORを8体召喚する", key: "summons", target: 8, reward: 20 },
  { id: "m_break", label: "CHAIN BREAKを1回起こす", key: "breaks", target: 1, reward: 25 },
  { id: "m_strike", label: "CORE STRIKEを3回成功させる", key: "strikes", target: 3, reward: 25 },
  { id: "m_destroy", label: "相手ACTORを5体撃破する", key: "destroys", target: 5, reward: 25 },
  { id: "m_pull", label: "パックを1回開封する", key: "pulls", target: 1, reward: 20 },
  { id: "m_story", label: "ストーリーを1ステージクリアする", key: "stageClears", target: 1, reward: 30 },
  { id: "m_online", label: "オンライン対戦を1回プレイする", key: "onlinePlays", target: 1, reward: 30 },
];
function dailyMissions() {
  const k = todayKey(); let h = 0; for (const c of k) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const idx = []; let x = h;
  while (idx.length < 3) { x = (Math.imul(x, 1664525) + 1013904223) >>> 0; const i = x % MISSION_POOL.length; if (!idx.includes(i)) idx.push(i); }
  return idx.map(i => MISSION_POOL[i]);
}
const ACHIEVEMENTS = [
  { id: "a_win1", label: "初勝利", desc: "対戦に1回勝利", key: "wins", target: 1, reward: 50 },
  { id: "a_win10", label: "常勝の兆し", desc: "対戦に10回勝利", key: "wins", target: 10, reward: 100 },
  { id: "a_win50", label: "VECTORの覇者", desc: "対戦に50回勝利", key: "wins", target: 50, reward: 300 },
  { id: "a_summon100", label: "召喚師", desc: "ACTORを100体召喚", key: "summons", target: 100, reward: 100 },
  { id: "a_break20", label: "CHAIN MASTER", desc: "CHAIN BREAKを20回発生", key: "breaks", target: 20, reward: 150 },
  { id: "a_destroy100", label: "破壊者", desc: "相手ACTORを100体撃破", key: "destroys", target: 100, reward: 150 },
  { id: "a_pull10", label: "パックコレクター", desc: "パックを10回開封", key: "pulls", target: 10, reward: 100 },
  { id: "a_online1", label: "初オンライン", desc: "オンライン対戦に1回勝利", key: "onlineWins", target: 1, reward: 100 },
  { id: "a_cards30", label: "図鑑30種", desc: "30種類のカードを所持", custom: () => Object.values(loadCollectionCounts()).filter(n => n > 0).length, target: 30, reward: 200 },
  { id: "a_story", label: "AWAKENING", desc: "ストーリーS34をクリア", custom: () => (loadStoryProgress().cleared.includes("S34") ? 1 : 0), target: 1, reward: 300 },
  { id: "a_true", label: "TRUE END", desc: "TRUE ENDに到達", custom: () => (loadStoryProgress().trueEnd ? 1 : 0), target: 1, reward: 500 },
];
function missionProgress(def, s) { return def.custom ? def.custom() : (def.daily ? (s.daily.counts[def.key] || 0) : (s.totals[def.key] || 0)); }
function missionRows() {
  const s = loadStats(); if (s.daily.date !== todayKey()) { s.daily = { date: todayKey(), counts: {}, claimed: {} }; saveStats(s); }
  const daily = dailyMissions().map(m => ({ ...m, daily: true, prog: s.daily.counts[m.key] || 0, claimed: !!s.daily.claimed[m.id], kind: "daily" }));
  const ach = ACHIEVEMENTS.map(a => ({ ...a, prog: missionProgress(a, s), claimed: !!s.claimedAch[a.id], kind: "ach" }));
  return { daily, ach };
}
function claimMission(row) {
  const s = loadStats();
  if (row.prog < row.target) return;
  if (row.kind === "daily") { if (s.daily.claimed[row.id]) return; s.daily.claimed[row.id] = true; }
  else { if (s.claimedAch[row.id]) return; s.claimedAch[row.id] = true; }
  saveStats(s); addCurrency(row.reward); playSe("claim"); renderMissionScreen(); refreshMenu();
}
function claimableCount() { const r = missionRows(); return [...r.daily, ...r.ach].filter(x => !x.claimed && x.prog >= x.target).length; }
function refreshMissionBadge() { const b = document.getElementById("missionBadge"); if (!b) return; const n = claimableCount(); b.textContent = n; b.classList.toggle("hidden", n === 0); }
function renderMissionScreen() {
  const r = missionRows(), box = document.getElementById("missionList");
  const rowHtml = x => { const pct = Math.min(100, Math.round(100 * Math.min(x.prog, x.target) / x.target)); const done = x.prog >= x.target;
    return `<div class="missionRow${x.claimed ? " claimed" : ""}"><div class="mInfo"><div class="mLabel">${x.label}${x.desc ? `<span class="mDesc"> - ${x.desc}</span>` : ""}</div><div class="mBar"><i style="width:${pct}%"></i></div><div class="mProg">${Math.min(x.prog, x.target)}/${x.target} ・ 報酬 ${x.reward}PT</div></div><button data-id="${x.id}" ${!done || x.claimed ? "disabled" : ""}>${x.claimed ? "受取済" : done ? "受け取る" : "未達成"}</button></div>`; };
  box.innerHTML = `<div class="mSection">デイリーミッション(毎日更新)</div>${r.daily.map(rowHtml).join("")}<div class="mSection">実績</div>${r.ach.map(rowHtml).join("")}`;
  const all = [...r.daily, ...r.ach];
  box.querySelectorAll("button[data-id]").forEach(b => b.onclick = () => claimMission(all.find(x => x.id === b.dataset.id)));
}
function openMissionScreen() { renderMissionScreen(); showScreen("missionScreen"); }

// ======== 既存関数を包んで統計とSEを仕込む ========
(function installExtraHooks() {
  const wrap = (name, fn) => { const o = window[name]; if (typeof o !== "function") return; window[name] = function (...a) { return fn(o, a, this); }; };
  wrap("summonActor", (o, a, t) => { const r = o.apply(t, a); if (r !== false && a[0] === "self" && !(G && G.tutorial)) { trackStat("summons"); } if (r !== false) playSe("summon"); return r; });
  wrap("useAction", (o, a, t) => { const r = o.apply(t, a); if (r !== false) playSe("action"); return r; });
  wrap("placeProtocol", (o, a, t) => { const r = o.apply(t, a); playSe("protocol"); return r; });
  wrap("useCore", (o, a, t) => { const r = o.apply(t, a); if (r !== false) playSe("heal"); return r; });
  wrap("attack", (o, a, t) => {
    const foeKey = a[0] === "self" ? "opp" : "self"; const before = G && G[foeKey].field.length, mineBefore = G && G[a[0]].field.length;
    playSe("attack"); const r = o.apply(t, a);
    if (G && G[foeKey].field.length < before) { playSe("destroy"); if (a[0] === "self" && !G.tutorial) trackStat("destroys", before - G[foeKey].field.length); }
    else if (G && G[a[0]].field.length < mineBefore) playSe("counter");
    return r;
  });
  wrap("coreStrike", (o, a, t) => { const foeKey = a[0] === "self" ? "opp" : "self"; const c0 = G && G[foeKey].core; const r = o.apply(t, a); if (G && G[foeKey].core < c0) { playSe("strike"); if (a[0] === "self" && !G.tutorial) trackStat("strikes"); } return r; });
  wrap("endTurn", (o, a, t) => { const r = o.apply(t, a); if (G && !G.gameOver) playSe("turn"); return r; });
  wrap("screenFlash", (o, a, t) => { if (a[0] === "damageFlash") playSe("damage"); return o.apply(t, a); });
  wrap("flashBanner", (o, a, t) => { if (a[0] === "CHAIN BREAK") { playSe("chain"); if (G && G.active === "self" && !G.tutorial) trackStat("breaks"); } return o.apply(t, a); });
  wrap("checkGameEnd", (o, a, t) => {
    const was = G && G.gameOver; const r = o.apply(t, a);
    if (G && !was && G.gameOver) {
      const won = G.opp.core <= 0 && G.self.core > 0 && !G.tutorial;
      if (!G.tutorial) { if (won) { trackStat("wins"); if (G.online) trackStat("onlineWins"); } playSe(won ? "win" : "lose"); }
    }
    return r;
  });
  wrap("markStageCleared", (o, a, t) => { const had = isStageCleared(a[0]); const r = o.apply(t, a); if (!had) trackStat("stageClears"); return r; });
  wrap("doGachaPull", (o, a, t) => { const c = loadCurrency(); const r = o.apply(t, a); if (loadCurrency() < c) trackStat("pulls"); return r; });
  // ボタン押下音
  document.addEventListener("click", e => { if (e.target.closest && e.target.closest("button, .homeTile")) playSe("tap"); }, true);
})();

// ======== オンライン: スタンプ ========
const EMOTES = ["よろしく!", "ナイス!", "うーん…", "ありがとう", "やるね!", "ごめん!", "いい勝負!", "まだまだ!"];
function openEmotePicker() {
  if (!G || !G.online || G.gameOver) return;
  showChoiceOverlay("スタンプを送る", EMOTES.map((t, i) => ({ label: t, onClick: () => { netSend({ t: "emote", i }); showEmoteBubble(i, true); } })));
}
function showEmoteBubble(i, mine) {
  playSe("emote");
  const b = document.getElementById("emoteBubble"); if (!b) return;
  b.textContent = EMOTES[i] || ""; b.className = "emoteBubble " + (mine ? "mine" : "theirs"); void b.offsetWidth; b.classList.add("show");
  clearTimeout(showEmoteBubble._t); showEmoteBubble._t = setTimeout(() => b.classList.remove("show"), 2200);
}
function initExtraUi() {
  const $ = id => document.getElementById(id);
  $("seBtn").onclick = toggleSeMute; updateSeBtn();
  $("btnMission").onclick = openMissionScreen;
  $("missionBackBtn").onclick = () => { showScreen("menuScreen"); refreshMenu(); };
  $("emoteBtn").onclick = openEmotePicker;
  refreshMissionBadge();
}

// ======== オープニング / エンドロール(曲: 超越した轟速) ========
function startOpening(onDone) {
  const ov = document.getElementById("openingOverlay"), tx = document.getElementById("openingText");
  let done = false, idx = 0, timer = null, ready = false;
  const finish = () => { if (done) return; done = true; clearTimeout(timer); ov.classList.add("hidden"); ov.onclick = null; onDone && onDone(); };
  ov.classList.remove("hidden"); playBgm("opening");
  setTimeout(() => { ready = true; }, 800);
  ov.onclick = () => { if (ready) finish(); };
  const next = () => {
    if (done) return;
    if (idx >= OPENING_LINES.length) { finish(); return; }
    const l = OPENING_LINES[idx++];
    tx.classList.remove("show"); 
    setTimeout(() => { if (done) return; tx.className = l.cls || ""; tx.textContent = l.t; void tx.offsetWidth; tx.classList.add("show"); }, 500);
    timer = setTimeout(next, l.cls ? 3200 : 4200);
  };
  next();
}
function showEndRoll(trueEnd, onDone) {
  const ov = document.getElementById("endRollOverlay"), content = document.getElementById("endRollContent");
  const endBox = document.getElementById("endRollEnd"), skip = document.getElementById("endRollSkip");
  const st = loadStats();
  const rows = CREDITS.slice();
  if (trueEnd) rows.splice(rows.length - 1, 0, { type: "head", t: "TRUE END" }, { type: "text", t: "六つのCOREは、ひとつの輪になった。" }, { type: "gap" });
  rows.splice(rows.length - 1, 0, { type: "head", t: "YOUR RECORD" },
    { type: "role", r: "WINS", n: String(st.totals.wins || 0) }, { type: "role", r: "SUMMONS", n: String(st.totals.summons || 0) },
    { type: "role", r: "CHAIN BREAKS", n: String(st.totals.breaks || 0) }, { type: "gap" });
  content.innerHTML = rows.map(r => r.type === "head" ? `<div class="crHead">${r.t}</div>` : r.type === "role" ? `<div class="crRole"><b>${r.r}</b><span>${r.n}</span></div>` : r.type === "gap" ? `<div class="crGap"></div>` : `<div class="crText">${r.t}</div>`).join("");
  endBox.classList.add("hidden"); ov.classList.remove("hidden"); playBgm("ending");
  const vh = ov.clientHeight || 844, ch = content.scrollHeight;
  const anim = content.animate([{ transform: `translateY(${vh}px)` }, { transform: `translateY(${-ch}px)` }], { duration: Math.max(30000, (ch + vh) / 38 * 1000), easing: "linear", fill: "forwards" });
  let closed = false;
  const showEnd = () => { skip.classList.add("hidden"); endBox.classList.remove("hidden"); setTimeout(() => { endBox.onclick = close; }, 600); };
  const close = () => { if (closed) return; closed = true; anim.cancel(); ov.classList.add("hidden"); endBox.onclick = null; skip.classList.remove("hidden"); onDone && onDone(); };
  anim.onfinish = showEnd;
  skip.onclick = () => { anim.finish(); };
}
function initRollUi() {
  const b = document.getElementById("replayRollBtn");
  if (b) b.onclick = () => showEndRoll(!!loadStoryProgress().trueEnd, () => { showScreen("menuScreen"); refreshMenu(); });
}
