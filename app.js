'use strict';

/* ===== WORD BANKS ===== */
const WORDS = {
  easy: ['the','be','to','of','and','a','in','that','have','it','for','not','on','with','he','as','you','do','at','this','but','his','by','from','they','we','say','her','she','or','an','will','my','one','all','would','there','their','what','so','up','out','if','about','who','get','which','go','me','when','make','can','like','time','no','just','him','know','take','people','into','year','your','good','some','could','them','see','other','than','then','now','look','only','come','its','over','think','also','back','after','use','two','how','our','work','first','well','way','even','new','want','because','any','these','give','day','most','us'],
  medium: ['system','program','question','government','number','night','always','point','today','small','children','need','home','hand','large','turn','place','become','show','great','think','between','often','side','social','however','every','information','include','another','whether','form','together','set','end','change','again','play','spell','away','animal','house','page','letter','mother','answer','found','still','learn','should','world','high','near','add','food','own','below','country','plant','last','school','father','keep','tree','never','start','city','earth','eye','light','thought','head','under','story','left'],
  hard: ['particularly','predominantly','infrastructure','sophisticated','circumstances','approximately','fundamentally','extraordinary','simultaneously','implementation','revolutionary','comprehensively','authentication','responsibilities','characteristics','configuration','demonstration','establishment','entrepreneurship','collaboration','unconstitutional','pharmaceutical','incomprehensible','multidisciplinary','epistemological','cryptographic','bureaucratic','conscientiously','disproportionate'],
  quotes: [
    "The only way to do great work is to love what you do",
    "Life is what happens when you are busy making other plans",
    "The future belongs to those who believe in the beauty of their dreams",
    "In the middle of every difficulty lies opportunity",
    "It does not matter how slowly you go as long as you do not stop",
    "The best time to plant a tree was twenty years ago the second best time is now",
    "Always remember that you are absolutely unique just like everyone else"
  ],
  code: [
    "function sum(a, b) { return a + b; }",
    "const arr = [1, 2, 3]; const total = arr.reduce((a, v) => a + v, 0);",
    "class Dog { constructor(name) { this.name = name; } bark() { return 'woof'; } }",
    "async function getData(url) { const res = await fetch(url); return res.json(); }",
    "const double = arr => arr.map(x => x * 2);"
  ]
};

/* ===== STATE ===== */
const state = {
  mode: 'words', difficulty: 'easy', timeLimit: 60,
  timeLeft: 60, timer: null, started: false, finished: false,
  wordList: [], wordIndex: 0, charIndex: 0, wordTyped: '',
  totalChars: 0, correctChars: 0, errorChars: 0,
  streak: 0, wpmHistory: [],
  settings: { sound: true, chart: true, caret: true, theme: 'dark', fontSize: 20 }
};

let history = JSON.parse(localStorage.getItem('tv_history') || '[]');
let wpmChartData = [];

/* ===== DOM ===== */
const $ = id => document.getElementById(id);
const wordsEl      = $('words-display');
const inputEl      = $('typing-input');
const statusDot    = document.querySelector('.status-dot');
const statusText   = $('status-text');
const wpmDisplay   = $('wpm-display');
const rawDisplay   = $('raw-display');
const accDisplay   = $('accuracy-display');
const timerDisplay = $('timer-display');
const streakEl     = $('streak-display');
const progressBar  = $('progress-bar');
const progressGlow = $('progress-glow');

/* ===== INJECT CRITICAL STYLES ===== */
const sty = document.createElement('style');
sty.textContent = `
.words-display {
  font-family: 'JetBrains Mono', monospace;
  font-size: 20px;
  line-height: 46px;
  color: #475569;
  height: 138px;          /* exactly 3 lines */
  overflow: hidden;
  position: relative;
  margin-bottom: 20px;
  user-select: none;
  letter-spacing: 0.02em;
}
.words-inner {
  position: absolute;
  top: 0; left: 0; right: 0;
  transition: top 0.15s ease;
}
.word {
  display: inline-block;
  white-space: nowrap;
  margin-right: 0.55em;
  position: relative;
}
.char { position: relative; color: inherit; }
.char.correct  { color: #00e676; }
.char.incorrect { color: #ff4d4d; }
/* Blinking caret before the current char */
.char.current::before {
  content: '';
  position: absolute;
  left: -1px; top: 10%; bottom: 10%;
  width: 2px;
  background: var(--caret, #a78bfa);
  border-radius: 2px;
  animation: tvBlink 1s step-end infinite;
}
/* Caret at end of word (after last char) */
.word.active-word .char:last-child.current-end::after {
  content: '';
  position: absolute;
  right: -3px; top: 10%; bottom: 10%;
  width: 2px;
  background: var(--caret, #a78bfa);
  border-radius: 2px;
  animation: tvBlink 1s step-end infinite;
}
@keyframes tvBlink { 0%,100%{opacity:1} 50%{opacity:0} }
/* Extra chars typed beyond word end */
.char.extra { color: #f87171; }
/* Shake animation on error */
@keyframes tvShake { 0%,100%{transform:translateX(0)} 25%{transform:translateX(-4px)} 75%{transform:translateX(4px)} }
.input-shake { animation: tvShake 0.2s ease; }
/* Confetti */
@keyframes confettiFall { to { transform: translateY(240px) rotate(400deg); opacity: 0; } }
`;
document.head.appendChild(sty);

/* ===== PARTICLES ===== */
(function () {
  const cv = $('particles-canvas'), ctx = cv.getContext('2d');
  let W = cv.width = innerWidth, H = cv.height = innerHeight;
  const pts = Array.from({length: 35}, () => ({
    x: Math.random()*W, y: Math.random()*H,
    r: Math.random()*1.4+0.3,
    dx: (Math.random()-.5)*.25, dy: (Math.random()-.5)*.25,
    o: Math.random()*.3+.08
  }));
  (function draw() {
    ctx.clearRect(0,0,W,H);
    pts.forEach(p => {
      ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
      ctx.fillStyle = `rgba(255,34,68,${p.o})`; ctx.fill();
      p.x+=p.dx; p.y+=p.dy;
      if(p.x<0||p.x>W) p.dx*=-1; if(p.y<0||p.y>H) p.dy*=-1;
    });
    requestAnimationFrame(draw);
  })();
  window.addEventListener('resize', () => { W=cv.width=innerWidth; H=cv.height=innerHeight; });
})();

/* ===== GENERATE ===== */
function generateWords() {
  if (state.mode === 'quotes') {
    const q = WORDS.quotes[Math.floor(Math.random()*WORDS.quotes.length)];
    return q.split(' ');
  }
  if (state.mode === 'code') {
    const c = WORDS.code[Math.floor(Math.random()*WORDS.code.length)];
    return c.split(' ');
  }
  const pool = WORDS[state.difficulty];
  return Array.from({length: 100}, () => pool[Math.floor(Math.random()*pool.length)]);
}

/* ===== RENDER ===== */
function renderWords() {
  // Create inner scrollable container
  wordsEl.innerHTML = '<div class="words-inner" id="words-inner"></div>';
  const inner = $('words-inner');
  state.wordList.forEach((word, wi) => {
    const wordEl = document.createElement('span');
    wordEl.className = 'word';
    wordEl.dataset.wi = wi;
    word.split('').forEach((ch, ci) => {
      const sp = document.createElement('span');
      sp.className = 'char';
      sp.dataset.wi = wi; sp.dataset.ci = ci;
      sp.textContent = ch;
      wordEl.appendChild(sp);
    });
    inner.appendChild(wordEl);
  });
  updateCaret();
}

/* ===== CARET & SCROLL ===== */
function updateCaret() {
  // Remove all current markers
  wordsEl.querySelectorAll('.current,.current-end,.active-word').forEach(el => {
    el.classList.remove('current','current-end','active-word');
  });
  const wordEl = wordsEl.querySelector(`.word[data-wi="${state.wordIndex}"]`);
  if (!wordEl) return;
  wordEl.classList.add('active-word');
  const chars = wordEl.querySelectorAll('.char:not(.extra)');
  if (state.charIndex < chars.length) {
    chars[state.charIndex].classList.add('current');
  } else if (chars.length > 0) {
    chars[chars.length-1].classList.add('current-end');
  }
  scrollWords();
}

function scrollWords() {
  const inner = $('words-inner');
  if (!inner) return;
  const wordEl = wordsEl.querySelector(`.word[data-wi="${state.wordIndex}"]`);
  if (!wordEl) return;
  const lineH = 46; // must match CSS line-height
  const containerTop = wordsEl.getBoundingClientRect().top;
  const wordTop = wordEl.getBoundingClientRect().top;
  const relTop = wordTop - containerTop;
  // If word is on 3rd line or beyond, scroll up one line
  if (relTop >= lineH * 2) {
    const curTop = parseInt(inner.style.top || '0');
    inner.style.top = (curTop - lineH) + 'px';
  }
}

/* ===== RESET ===== */
function reset() {
  clearInterval(state.timer);
  Object.assign(state, {
    started: false, finished: false,
    wordIndex: 0, charIndex: 0, wordTyped: '',
    totalChars: 0, correctChars: 0, errorChars: 0,
    streak: 0, timeLeft: state.timeLimit, wpmHistory: []
  });
  wpmChartData = [];
  wpmDisplay.textContent   = '0';
  rawDisplay.textContent   = '0';
  accDisplay.innerHTML     = '100<span class="stat-unit">%</span>';
  timerDisplay.textContent = state.timeLimit;
  streakEl.textContent     = '0';
  progressBar.style.width  = '0%';
  progressGlow.style.width = '0%';
  statusDot.className = 'status-dot idle';
  statusText.textContent = 'Click here or press any key to start';
  state.wordList = generateWords();
  renderWords();
  inputEl.value = '';
  inputEl.disabled = false;
  drawLiveChart([]);
}

/* ===== TIMER ===== */
function startTimer() {
  state.started = true;
  statusDot.className = 'status-dot running';
  statusText.textContent = 'Test running…';
  state.timer = setInterval(() => {
    state.timeLeft--;
    timerDisplay.textContent = state.timeLeft;
    const pct = ((state.timeLimit - state.timeLeft) / state.timeLimit) * 100;
    progressBar.style.width = pct + '%';
    progressGlow.style.width = pct + '%';
    const wpm = calcWPM(), raw = calcRaw();
    wpmDisplay.textContent = wpm;
    rawDisplay.textContent = raw;
    state.wpmHistory.push(wpm);
    wpmChartData.push(wpm);
    drawLiveChart(wpmChartData);
    if (state.timeLeft <= 0) finishTest();
  }, 1000);
}

/* ===== CALC ===== */
function calcWPM() {
  const e = (state.timeLimit - state.timeLeft) || 1;
  return Math.round((state.correctChars / 5) / (e / 60));
}
function calcRaw() {
  const e = (state.timeLimit - state.timeLeft) || 1;
  return Math.round((state.totalChars / 5) / (e / 60));
}
function calcAcc() {
  return state.totalChars ? Math.round(state.correctChars / state.totalChars * 100) : 100;
}

/* ===== INPUT ===== */
inputEl.addEventListener('keydown', e => {
  if (state.finished) return;

  if (e.key === 'Backspace') {
    e.preventDefault();
    handleBackspace();
    return;
  }

  if (e.key === ' ') {
    e.preventDefault();
    if (state.wordTyped.length === 0) return; // don't advance on empty word
    if (state.settings.sound) playSpace();
    handleSpace();
    return;
  }

  // Printable chars only
  if (e.key.length !== 1) return;
  if (!state.started) startTimer();
  handleChar(e.key);
});

// Prevent default input so we control everything
inputEl.addEventListener('input', () => {
  inputEl.value = ''; // always clear — we handle keys manually
});

function handleChar(ch) {
  const word = state.wordList[state.wordIndex];
  if (!word) return;

  state.totalChars++;
  state.wordTyped += ch;

  if (state.charIndex < word.length) {
    const expected = word[state.charIndex];
    const charEl = wordsEl.querySelector(`.char[data-wi="${state.wordIndex}"][data-ci="${state.charIndex}"]`);
    if (charEl) {
      if (ch === expected) {
        charEl.className = 'char correct';
        state.correctChars++;
        state.streak++;
      } else {
        charEl.className = 'char incorrect';
        state.errorChars++;
        state.streak = 0;
        doShake();
      }
    }
    state.charIndex++;
  } else {
    // Extra char beyond word length
    const wordEl = wordsEl.querySelector(`.word[data-wi="${state.wordIndex}"]`);
    if (wordEl) {
      const extra = document.createElement('span');
      extra.className = 'char extra';
      extra.dataset.wi = state.wordIndex;
      extra.dataset.ci = 'x' + state.charIndex;
      extra.textContent = ch;
      wordEl.appendChild(extra);
    }
    state.charIndex++;
    state.errorChars++;
    state.streak = 0;
    doShake();
  }

  if (state.settings.sound) playKey(ch === state.wordList[state.wordIndex]?.[state.charIndex - 1]);
  updateCaret();
  updateStats();
}

function handleBackspace() {
  if (state.charIndex === 0) return;
  state.charIndex--;
  state.wordTyped = state.wordTyped.slice(0, -1);

  // Remove extra span if it was an extra char
  const extra = wordsEl.querySelector(`.char[data-wi="${state.wordIndex}"][data-ci="x${state.charIndex}"]`);
  if (extra) { extra.remove(); }
  else {
    const charEl = wordsEl.querySelector(`.char[data-wi="${state.wordIndex}"][data-ci="${state.charIndex}"]`);
    if (charEl) charEl.className = 'char'; // reset to pending
  }

  updateCaret();
  updateStats();
}

function handleSpace() {
  // Mark any untyped chars as incorrect
  const word = state.wordList[state.wordIndex];
  for (let ci = state.charIndex; ci < word.length; ci++) {
    const el = wordsEl.querySelector(`.char[data-wi="${state.wordIndex}"][data-ci="${ci}"]`);
    if (el) el.className = 'char incorrect';
  }
  state.wordIndex++;
  state.charIndex = 0;
  state.wordTyped = '';
  if (state.wordIndex >= state.wordList.length) { finishTest(); return; }
  updateCaret();
  updateStats();
}

function doShake() {
  inputEl.classList.remove('input-shake');
  void inputEl.offsetWidth;
  inputEl.classList.add('input-shake');
}

function updateStats() {
  accDisplay.innerHTML = calcAcc() + '<span class="stat-unit">%</span>';
  streakEl.textContent = state.streak;
}

/* ===== PROFESSIONAL KEYBOARD SOUND ENGINE ===== */
let audioCtx;

// Pre-generate a short white noise buffer for reuse
let noiseBuffer = null;
function getNoiseBuffer(ctx) {
  if (noiseBuffer) return noiseBuffer;
  const seconds = 0.08;
  const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * seconds), ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  noiseBuffer = buf;
  return noiseBuffer;
}

function playKey(correct) {
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const ctx = audioCtx;
    const now = ctx.currentTime;

    // ── LAYER 1: Filtered noise click (the "snap") ──
    const noise = ctx.createBufferSource();
    noise.buffer = getNoiseBuffer(ctx);

    // Bandpass shapes the click character
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = correct ? 4200 : 2200;
    bp.Q.value = correct ? 1.2 : 0.7;

    // High-pass removes low rumble
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = correct ? 1800 : 600;

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(correct ? 0.55 : 0.35, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + (correct ? 0.032 : 0.055));

    noise.connect(bp);
    bp.connect(hp);
    hp.connect(noiseGain);
    noiseGain.connect(ctx.destination);
    noise.start(now);
    noise.stop(now + 0.08);

    // ── LAYER 2: Square oscillator body thud ──
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(correct ? 220 : 130, now);
    osc.frequency.exponentialRampToValueAtTime(correct ? 55 : 40, now + 0.025);
    oscGain.gain.setValueAtTime(correct ? 0.12 : 0.09, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.028);

    // Slight lowpass to soften the square
    const oscLp = ctx.createBiquadFilter();
    oscLp.type = 'lowpass';
    oscLp.frequency.value = 800;

    osc.connect(oscLp);
    oscLp.connect(oscGain);
    oscGain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.03);

    // ── LAYER 3: High-frequency tick (key register) ──
    const tick = ctx.createOscillator();
    const tickGain = ctx.createGain();
    tick.type = 'sine';
    tick.frequency.value = correct ? 6800 : 4200;
    tickGain.gain.setValueAtTime(correct ? 0.06 : 0.04, now);
    tickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.012);
    tick.connect(tickGain);
    tickGain.connect(ctx.destination);
    tick.start(now);
    tick.stop(now + 0.015);

  } catch(_) {}
}

// Space gets a deeper thud
function playSpace() {
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const ctx = audioCtx;
    const now = ctx.currentTime;

    // Deep noise
    const noise = ctx.createBufferSource();
    noise.buffer = getNoiseBuffer(ctx);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 900;
    const ng = ctx.createGain();
    ng.gain.setValueAtTime(0.5, now);
    ng.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
    noise.connect(lp); lp.connect(ng); ng.connect(ctx.destination);
    noise.start(now); noise.stop(now + 0.08);

    // Sub thud
    const sub = ctx.createOscillator();
    const sg = ctx.createGain();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(120, now);
    sub.frequency.exponentialRampToValueAtTime(30, now + 0.05);
    sg.gain.setValueAtTime(0.18, now);
    sg.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
    sub.connect(sg); sg.connect(ctx.destination);
    sub.start(now); sub.stop(now + 0.07);

  } catch(_) {}
}

/* ===== FINISH ===== */
function finishTest() {
  if (state.finished) return;
  state.finished = true;
  clearInterval(state.timer);
  inputEl.disabled = true;
  statusDot.className = 'status-dot finished';
  statusText.textContent = 'Test complete!';
  const wpm = calcWPM(), raw = calcRaw(), acc = calcAcc();
  const elapsed = state.timeLimit - state.timeLeft;
  const entry = { wpm, raw, acc, chars: state.totalChars, errors: state.errorChars, time: elapsed, mode: state.mode, diff: state.difficulty, date: new Date().toISOString() };
  history.unshift(entry);
  if (history.length > 50) history = history.slice(0, 50);
  localStorage.setItem('tv_history', JSON.stringify(history));
  showModal(entry);
  updateHistory();
}

/* ===== MODAL ===== */
function showModal(e) {
  $('modal-wpm').textContent      = e.wpm;
  $('modal-raw').textContent      = e.raw;
  $('modal-accuracy').textContent = e.acc + '%';
  $('modal-chars').textContent    = e.chars;
  $('modal-errors').textContent   = e.errors;
  $('modal-time').textContent     = e.time + 's';
  const bs = [{v:120,b:'🚀',m:'Blazing fast! Keyboard legend!'},{v:100,b:'⚡',m:'Outstanding! Lightning fingers!'},{v:80,b:'🔥',m:'Excellent! Way above average!'},{v:60,b:'🎯',m:'Great job! Keep pushing!'},{v:40,b:'👍',m:'Good start! Keep practicing!'},{v:0,b:'💪',m:'Keep going! Practice makes perfect!'}];
  const badge = bs.find(b => e.wpm >= b.v);
  $('modal-badge').textContent = badge.b;
  $('perf-message').textContent = badge.m;
  drawChartOn($('modal-chart'), state.wpmHistory);
  $('result-modal').classList.add('open');
  spawnConfetti();
}

function spawnConfetti() {
  const c = $('modal-confetti'); c.innerHTML = '';
  ['#a78bfa','#38bdf8','#f472b6','#34d399','#fbbf24'].forEach((col, i) => {
    for (let j = 0; j < 8; j++) {
      const el = document.createElement('div');
      el.style.cssText = `position:absolute;width:${4+Math.random()*6}px;height:${4+Math.random()*6}px;background:${col};border-radius:${Math.random()>.5?'50%':'2px'};left:${Math.random()*100}%;top:-10px;animation:confettiFall ${1+Math.random()*1.5}s ${Math.random()*.5}s ease-out forwards`;
      c.appendChild(el);
    }
  });
}

/* ===== CHARTS ===== */
function drawLiveChart(data) { drawChartOn($('wpm-chart'), data); }
function drawChartOn(canvas, data) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.offsetWidth || 800;
  canvas.width = W;
  const H = canvas.height;
  ctx.clearRect(0, 0, W, H);
  if (!data || data.length < 2) return;
  const max = Math.max(...data, 1), pad = 10;
  const step = (W - pad*2) / (data.length - 1);
  const pts = data.map((v, i) => ({ x: pad + i*step, y: H - pad - ((v/max)*(H - pad*2)) }));
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, 'rgba(255,34,68,0.2)');
  grad.addColorStop(1, 'rgba(255,34,68,0)');
  ctx.beginPath();
  pts.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
  ctx.lineTo(pts[pts.length-1].x, H); ctx.lineTo(pad, H); ctx.closePath();
  ctx.fillStyle = grad; ctx.fill();
  ctx.beginPath();
  pts.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
  ctx.strokeStyle = '#ff2244'; ctx.lineWidth = 2; ctx.lineJoin = 'round'; ctx.stroke();
  const last = pts[pts.length-1];
  ctx.beginPath(); ctx.arc(last.x, last.y, 4, 0, Math.PI*2);
  ctx.fillStyle = '#ff2244'; ctx.fill();
}

/* ===== HISTORY ===== */
function updateHistory() {
  const list = $('results-list'), empty = $('results-empty');
  if (!history.length) { empty.style.display = 'block'; list.innerHTML = ''; list.appendChild(empty); return; }
  empty.style.display = 'none';
  const wpms = history.map(h => h.wpm), accs = history.map(h => h.acc);
  $('pb-wpm').textContent      = Math.max(...wpms) + ' WPM';
  $('pb-accuracy').textContent = Math.max(...accs) + '%';
  $('pb-tests').textContent    = history.length;
  $('pb-avg').textContent      = Math.round(wpms.reduce((a,b)=>a+b,0)/wpms.length) + ' WPM';
  setTimeout(() => drawChartOn($('history-chart'), wpms.slice(0,20).reverse()), 50);
  const medals = ['🥇','🥈','🥉'];
  list.innerHTML = '';
  history.slice(0,20).forEach((h, i) => {
    const d = new Date(h.date), div = document.createElement('div');
    div.className = 'result-item';
    div.innerHTML = `<div class="result-rank">${medals[i]||'#'+(i+1)}</div><div class="result-info"><div class="result-stat"><div class="result-stat-val">${h.wpm}</div><div class="result-stat-key">WPM</div></div><div class="result-stat"><div class="result-stat-val">${h.raw}</div><div class="result-stat-key">Raw</div></div><div class="result-stat"><div class="result-stat-val">${h.acc}%</div><div class="result-stat-key">Acc</div></div><div class="result-stat"><div class="result-stat-val">${h.chars}</div><div class="result-stat-key">Chars</div></div><div class="result-stat"><div class="result-stat-val">${h.time}s</div><div class="result-stat-key">Time</div></div><div class="result-stat"><div class="result-stat-val">${h.mode}</div><div class="result-stat-key">Mode</div></div></div><div class="result-date">${d.toLocaleDateString()}<br>${d.toLocaleTimeString()}</div>`;
    list.appendChild(div);
  });
}

/* ===== TABS ===== */
document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');
    $('tab-' + btn.dataset.tab).classList.add('active');
    if (btn.dataset.tab === 'results') updateHistory();
  });
});

/* ===== MODES ===== */
document.querySelectorAll('[data-time]').forEach(btn => {
  btn.addEventListener('click', () => { document.querySelectorAll('[data-time]').forEach(b => b.classList.remove('active')); btn.classList.add('active'); state.timeLimit = +btn.dataset.time; reset(); inputEl.focus(); });
});
document.querySelectorAll('[data-mode]').forEach(btn => {
  btn.addEventListener('click', () => { document.querySelectorAll('[data-mode]').forEach(b => b.classList.remove('active')); btn.classList.add('active'); state.mode = btn.dataset.mode; reset(); inputEl.focus(); });
});
document.querySelectorAll('[data-diff]').forEach(btn => {
  btn.addEventListener('click', () => { document.querySelectorAll('[data-diff]').forEach(b => b.classList.remove('active')); btn.classList.add('active'); state.difficulty = btn.dataset.diff; reset(); inputEl.focus(); });
});

/* ===== CONTROLS ===== */
$('refresh-btn').addEventListener('click', () => { reset(); inputEl.focus(); });
$('restart-btn').addEventListener('click', () => { reset(); inputEl.focus(); });
document.addEventListener('keydown', e => {
  if (e.key === 'Tab')    { e.preventDefault(); reset(); inputEl.focus(); }
  if (e.key === 'Escape') { reset(); inputEl.focus(); }
});
document.querySelector('.typing-container').addEventListener('click', () => inputEl.focus());

/* ===== MODAL ACTIONS ===== */
$('modal-close').addEventListener('click', () => $('result-modal').classList.remove('open'));
$('modal-restart').addEventListener('click', () => { $('result-modal').classList.remove('open'); reset(); inputEl.focus(); });
$('modal-history').addEventListener('click', () => { $('result-modal').classList.remove('open'); document.querySelector('[data-tab="results"]').click(); });
$('result-modal').addEventListener('click', e => { if (e.target === $('result-modal')) $('result-modal').classList.remove('open'); });
$('clear-history-btn').addEventListener('click', () => { if (confirm('Clear all history?')) { history = []; localStorage.removeItem('tv_history'); updateHistory(); } });

/* ===== SETTINGS ===== */
$('theme-select').addEventListener('change',  e => document.documentElement.setAttribute('data-theme', e.target.value));
$('font-select').addEventListener('change',   e => { wordsEl.style.fontFamily = `'${e.target.value}',monospace`; });
$('font-size').addEventListener('input',      e => { $('font-size-desc').textContent = e.target.value+'px'; wordsEl.style.fontSize = e.target.value+'px'; });
$('sound-toggle').addEventListener('change',  e => { state.settings.sound = e.target.checked; });
$('chart-toggle').addEventListener('change',  e => { document.querySelector('.live-chart-container').style.display = e.target.checked ? 'block' : 'none'; });
$('caret-toggle').addEventListener('change',  e => { state.settings.caret = e.target.checked; });
$('reset-settings-btn').addEventListener('click', () => {
  $('theme-select').value = 'dark'; $('font-select').value = 'JetBrains Mono';
  $('font-size').value = 20; $('font-size-desc').textContent = '20px';
  $('sound-toggle').checked = false; $('chart-toggle').checked = true; $('caret-toggle').checked = true;
  document.documentElement.removeAttribute('data-theme');
  wordsEl.style.fontFamily = ''; wordsEl.style.fontSize = '';
});

/* ===== INIT ===== */
reset();
updateHistory();
inputEl.focus();
