// Game state variables
let currentScenario = null;
let timerInterval = null;

// The clue unlock schedule (in minutes) for 10 clues
const CLUE_UNLOCK = [0, 5, 5, 15, 15, 25, 25, 35, 45, 45];

// Helper to manage timer keys in localStorage
function getTimerKey(sId) { return `cs_timer_s${sId}`; }

function getElapsed(sId) {
  const v = localStorage.getItem(getTimerKey(sId));
  if(!v) return -1;
  return Math.floor((Date.now() - parseInt(v)) / 1000);
}

function startGameTimer(sId) {
  if(localStorage.getItem(getTimerKey(sId))) return;
  localStorage.setItem(getTimerKey(sId), Date.now().toString());
}

function resetGameTimer(sId) {
  localStorage.removeItem(getTimerKey(sId));
}

function fmtTime(sec) {
  if(sec < 0) return '--:--';
  const m = Math.floor(sec/60), s = sec%60;
  return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

function getPhaseLabel(sec) {
  const m = Math.floor(sec/60);
  if(m < 5)  return '자기소개 단계';
  if(m < 15) return '1라운드 심문';
  if(m < 25) return '중간 투표';
  if(m < 35) return '2라운드 심문';
  if(m < 45) return '최후 변론 준비';
  return '최후 변론';
}

function startTimerLoop() {
  if(timerInterval) clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    if(!currentScenario) return;
    const el = getElapsed(currentScenario.id);
    const display = document.getElementById('rv-timer-display');
    const phase = document.getElementById('rv-timer-phase');
    if(display) display.textContent = el >= 0 ? fmtTime(el) : '--:--';
    if(phase) phase.textContent = el >= 0 ? getPhaseLabel(el) : '게임 미시작';
    refreshClues(currentScenario.id);
    if (document.getElementById('director-view').classList.contains('active')) renderDirector();
  }, 1000);
}

// ══════════════════════════════════════
// 자동 진행 (GM 없이)
// ══════════════════════════════════════
// GM은 정해진 시점에 정해진 글을 읽는 역할뿐이라 앱이 대신할 수 있다.
// 자동 모드에서는 GM 역할 카드를 감추고, 이 화면이 순서를 안내한다.
// 사람 하나가 진행에 묶이지 않으므로 5명만 모여도 플레이할 수 있다.

const AUTO_KEY = 'cs_auto_mode';
let revealed = false;   // 진상 공개 후에는 진행 화면을 다시 그리지 않는다

function isAutoMode() {
  try { return localStorage.getItem(AUTO_KEY) !== 'off'; } catch { return true; }
}

function setAutoMode(on) {
  try { localStorage.setItem(AUTO_KEY, on ? 'on' : 'off'); } catch { /* 무시 */ }
  if (currentScenario) openScenario(currentScenario.id);
}

// 각 단계의 시작 분과 길이. getPhaseLabel의 구간과 맞춰 두었다.
function buildPhases(s) {
  const gd = s.gmData || {};
  return [
    { at: 0,  min: 5,  title: '오프닝',
      script: gd.openingScript ? gd.openingScript.replace(/^"|"$/g, '') : s.overview,
      hint: '한 사람이 소리 내어 읽어 주세요. 다 읽으면 각자 역할 카드를 확인합니다.' },
    { at: 5,  min: 10, title: '1라운드 심문',
      script: '자유롭게 서로를 심문하세요.\n알리바이의 시각과 장소가 어긋나는 곳을 찾습니다.',
      hint: gd.round1Note, hintAt: 10 },
    { at: 15, min: 5,  title: '중간 투표',
      script: '지금까지 가장 의심스러운 사람을 한 명씩 지목해 보세요.\n아직 확정이 아닙니다.',
      hint: gd.voteNote },
    { at: 20, min: 15, title: '2라운드 심문',
      script: '본격적으로 알리바이를 깨 보세요.\n숨겨둔 비밀을 흘려도 좋은 시점입니다.',
      hint: gd.round2Note, hintAt: 28 },
    { at: 35, min: 10, title: '최후 변론',
      script: '한 사람씩 돌아가며 자신이 범인이 아닌 이유를 말합니다.\n끝나면 최종 투표를 합니다.',
      hint: '변론은 1인당 1분 정도가 적당합니다.' },
    { at: 45, min: 0,  title: '진실 공개',
      script: '최종 투표를 마쳤다면 아래 버튼으로 진상을 확인하세요.',
      hint: null }
  ];
}

function currentPhaseIndex(phases, min) {
  let idx = 0;
  phases.forEach((p, i) => { if (min >= p.at) idx = i; });
  return idx;
}

function renderDirector() {
  if (!currentScenario) return;
  // 시계와 단계 목록은 계속 갱신하되, 공개된 진상은 지우지 않는다.
  const s = currentScenario;
  const phases = buildPhases(s);
  const sec = getElapsed(s.id);
  const started = sec >= 0;
  const min = started ? Math.floor(sec / 60) : -1;

  document.getElementById('dr-time').textContent = started ? fmtTime(sec) : '00:00';

  const idx = started ? currentPhaseIndex(phases, min) : 0;
  const phase = phases[idx];

  document.getElementById('dr-phase').textContent = started ? phase.title : '시작 대기 중';
  if (revealed) { renderSteps(phases, idx, started); return; }
  document.getElementById('dr-title').textContent = started ? `${idx + 1}. ${phase.title}` : '준비';

  document.getElementById('dr-script').textContent = started
    ? phase.script
    : '역할 선택 화면에서 게임 시작을 누르면 진행이 시작됩니다.';

  // 힌트는 정해진 시각이 지나야 열린다. GM이 "막힐 때 던지던" 것을 대신한다.
  const hintEl = document.getElementById('dr-hint');
  const hintReady = started && phase.hint && (!phase.hintAt || min >= phase.hintAt);
  hintEl.style.display = hintReady ? '' : 'none';
  if (hintReady) hintEl.textContent = `💡 ${phase.hint}`;

  // 남은 시간과 진행 막대
  const remainEl = document.getElementById('dr-remain');
  const barEl = document.getElementById('dr-bar');
  if (started && phase.min > 0) {
    const into = sec - phase.at * 60;
    const total = phase.min * 60;
    const left = Math.max(0, total - into);
    remainEl.textContent = `이 단계 남은 시간 약 ${Math.ceil(left / 60)}분`;
    barEl.style.width = `${Math.min(100, (into / total) * 100)}%`;
  } else {
    remainEl.textContent = started ? '마무리 단계입니다' : '';
    barEl.style.width = started ? '100%' : '0%';
  }

  renderSteps(phases, idx, started);

  // 진실 공개는 최후 변론까지 간 뒤에만 열어 준다. 일찍 누르면 게임이 끝난다.
  const reveal = document.getElementById('dr-reveal');
  reveal.disabled = !started || min < 35;
  reveal.textContent = reveal.disabled
    ? '🔒 최후 변론이 끝나면 열립니다'
    : '🔓 진실 공개하기';
}

function renderSteps(phases, idx, started) {
  const steps = document.getElementById('dr-steps');
  steps.innerHTML = '';
  phases.forEach((p, i) => {
    const row = document.createElement('div');
    row.className = 'dr-step' + (started && i < idx ? ' done' : started && i === idx ? ' now' : '');
    const num = document.createElement('span');
    num.className = 'num';
    num.textContent = i + 1;
    const label = document.createElement('span');
    label.textContent = p.title;
    const dur = document.createElement('span');
    dur.className = 'dur';
    dur.textContent = p.min > 0 ? `${p.at}~${p.at + p.min}분` : `${p.at}분~`;
    row.append(num, label, dur);
    steps.appendChild(row);
  });
}

function askReveal() {
  if (!currentScenario) return;
  const ok = confirm('진상을 공개하면 게임이 끝납니다.\n최종 투표를 모두 마쳤나요?');
  if (!ok) return;

  const gd = currentScenario.gmData || {};
  revealed = true;   // 이후 renderDirector가 이 내용을 덮어쓰지 않게 한다

  document.getElementById('dr-title').textContent = `진범은 ${gd.culpritName} 였습니다`;
  document.getElementById('dr-script').textContent =
    (gd.closingScript || '').replace(/^"|"$/g, '');

  const hint = document.getElementById('dr-hint');
  hint.style.display = '';
  hint.innerHTML = (gd.truth || '').replace(/\n/g, '<br>');

  const btn = document.getElementById('dr-reveal');
  btn.disabled = true;
  btn.textContent = '진상이 공개되었습니다';
}

// ══════════════════════════════════════
// LOBBY
// ══════════════════════════════════════
function renderLobby() {
  const list = document.getElementById('scenario-list');
  list.innerHTML = SCENARIOS.map(s => `
    <div class="scenario-item" onclick="openScenario(${s.id})">
      <div class="s-num">${String(s.id).padStart(2,'0')}</div>
      <div class="s-info">
        <div class="s-tag">${s.catEmoji} ${s.tag || s.cat}</div>
        <div class="s-title">${s.title}</div>
        <div class="s-desc">${s.desc}</div>
        <div class="s-desc" style="opacity:.75;">👥 ${s.players}명 (자동 진행) · GM을 두면 ${s.players + 1}명</div>
      </div>
      <div>
        <span style="font-size: 0.8rem; background: ${s.status === 'done' ? 'var(--success)' : 'var(--text-sub)'}; color: #000; padding: 2px 8px; border-radius: 10px; font-weight: bold;">
          ${s.status === 'done' ? 'PLAY' : 'WIP'}
        </span>
      </div>
    </div>`).join('');
}

// ══════════════════════════════════════
// SCENARIO VIEW
// ══════════════════════════════════════
function openScenario(id) {
  const s = SCENARIOS.find(x => x.id === id);
  if(!s || !s.roles) return;
  currentScenario = s;

  document.getElementById('sv-title').textContent = s.title;
  document.getElementById('sv-tag').textContent = `${s.catEmoji} ${s.tag}`;
  document.getElementById('sv-htitle').textContent = s.title;
  document.getElementById('sv-overview').textContent = s.overview || s.desc;
  
  if (s.meta) {
    document.getElementById('sv-meta').innerHTML = s.meta.map(m => `
      <div style="display: flex; justify-content: space-between; border-bottom: 1px solid rgba(255,255,255,0.1); padding: 5px 0;">
        <span style="color: var(--text-sub);">${m.label}</span>
        <span>${m.value}</span>
      </div>
    `).join('');
  }

  // Timer update
  const elapsed = getElapsed(s.id);
  const startBtn = document.getElementById('game-start-btn');
  const startIcon = document.getElementById('start-btn-icon');
  const startText = document.getElementById('start-btn-text');
  const timerDisp = document.getElementById('game-timer-display');
  
  const auto = isAutoMode();
  document.getElementById('mode-auto').classList.toggle('active', auto);
  document.getElementById('mode-gm').classList.toggle('active', !auto);
  document.getElementById('mode-auto-count').textContent = `${s.players}명`;
  document.getElementById('mode-gm-count').textContent = `${s.players + 1}명`;
  document.getElementById('director-link').style.display = auto ? '' : 'none';

  if (elapsed >= 0) {
    startBtn.classList.add('started');
    startIcon.textContent = '✓';
    startText.textContent = '게임 진행 중';
    timerDisp.textContent = `경과: ${fmtTime(elapsed)}`;
  } else {
    startBtn.classList.remove('started');
    startIcon.textContent = '▶';
    startText.textContent = auto ? '게임 시작' : '게임 시작 (GM이 누르세요)';
    timerDisp.textContent = '';
  }

  // Role grid rendering
  const grid = document.getElementById('role-grid');
  // 자동 모드에서는 GM 카드를 내보내지 않는다. 진행은 앱이 맡는다.
  const visibleRoles = isAutoMode() ? s.roles.filter(r => !r.isGM) : s.roles;
  grid.innerHTML = visibleRoles.map(r => `
    <div class="role-btn" onclick="openRole('${r.id}')">
      <div class="rb-icon">${r.emoji}</div>
      <div class="rb-type">${r.isGM ? 'Game Master · ⚠️ 스포일러' : '참여자'}</div>
      <div class="rb-name">${r.name} <span style="font-size: 0.8rem; font-weight: normal; color: var(--text-sub);">${r.age || ''}</span></div>
      <div class="rb-job">${r.job}</div>
    </div>`).join('');

  goTo('scenario-view');
}

function handleGameStart() {
  if(!currentScenario) return;
  const elapsed = getElapsed(currentScenario.id);
  if(elapsed >= 0) return;
  
  startGameTimer(currentScenario.id);
  
  const startBtn = document.getElementById('game-start-btn');
  document.getElementById('start-btn-icon').textContent = '✓';
  document.getElementById('start-btn-text').textContent = '게임 진행 중';
  startBtn.classList.add('started');
  document.getElementById('game-timer-display').textContent = '경과: 00:00';
  if (isAutoMode()) {
    document.getElementById('director-link').style.display = '';
    renderDirector();
  }
}

// ══════════════════════════════════════
// ROLE VIEW
// ══════════════════════════════════════
function openRole(roleId) {
  if(!currentScenario) return;
  const s = currentScenario;
  const r = s.roles.find(x => x.id === roleId);
  if(!r) return;

  _clueReg.length = 0; // Reset clue registry

  document.getElementById('rv-top-title').textContent = r.isGM ? '📋 GM 패키지' : `${r.emoji} ${r.name}`;
  // GM 패키지에는 진범과 진상이 그대로 들어 있다. 참여자가 무심코 열어
  // 게임을 통째로 날리는 일이 없도록 한 번 더 확인을 받는다.
  document.getElementById('rv-content').innerHTML = r.isGM ? buildGMGate() : buildPlayerContent(r, s);

  goTo('role-view');
  startTimerLoop();
  
  const el = getElapsed(s.id);
  const td = document.getElementById('rv-timer-display');
  if(td) td.textContent = el >= 0 ? fmtTime(el) : '--:--';
  const tp = document.getElementById('rv-timer-phase');
  if(tp) tp.textContent = el >= 0 ? getPhaseLabel(el) : '게임 미시작';
}

function buildPlayerContent(r, s) {
  let html = '';

  // Hero section
  html += `<div class="rv-hero">
    <div class="rv-emoji">${r.emoji}</div>
    <div class="rv-status" style="background: ${r.statusColor || 'var(--accent)'}">${r.statusLabel || '참여자'}</div>
    <div class="rv-name">${r.name} <span class="rv-age">${r.age || ''}</span></div>
    <div class="rv-job">${r.job}</div>
  </div>`;

  // Intro
  html += `<div class="rv-block">
    <div class="rv-block-title">캐릭터 소개</div>
    <div class="rv-intro">${r.intro}</div>
  </div>`;

  // Timeline
  if(r.timeline) {
    html += `<div class="rv-block">
      <div class="rv-block-title">⏱ 타임라인</div>
      <div class="rv-tl">`;
    r.timeline.forEach(t => {
      html += `<div class="rv-tl-row ${t.secret ? 'secret' : ''}">
        <div class="rv-tl-time">${t.time}</div>
        <div class="rv-tl-spine">
          <div class="rv-tl-dot"></div>
          <div class="rv-tl-line"></div>
        </div>
        <div class="rv-tl-text">${t.text} ${t.secret ? '<span class="rv-tl-secret-mark">★ 비밀</span>' : ''}</div>
      </div>`;
    });
    html += `</div></div>`;
  }

  // Secrets
  if(r.secrets) {
    html += `<div class="rv-block">
      <div class="rv-block-title">🔐 나만 아는 비밀</div>
      <div class="rv-secrets">`;
    r.secrets.forEach(sc => {
      html += `<div class="rv-secret ${sc.type}">
        <div class="rv-secret-star">${sc.type === 'info' ? '💡' : '★'}</div>
        <div>
          <strong>${sc.title}</strong><br>
          <div style="margin-top: 5px; color: #ddd; white-space: pre-line;">${sc.text}</div>
        </div>
      </div>`;
    });
    html += `</div></div>`;
  }

  // Clues
  html += buildClueSection(s, r);

  return html;
}

// ══════════════════════════════════════
// CLUES
// ══════════════════════════════════════
function buildClueSection(s, r) {
  if(!s.clues) return '';
  const elapsed = currentScenario ? getElapsed(currentScenario.id) : -1;
  const gameStarted = elapsed >= 0;

  let html = `<div class="rv-block clue-section" id="clue-section">
    <div class="rv-block-title">🔍 단서 카드</div>`;

  // Personal clues
  if(r && r.personalClues && r.personalClues.length) {
    html += `<div style="color: var(--accent); font-weight: bold; margin-bottom: 15px;">나만 아는 증거</div>
    <div class="clue-grid-wrapper" style="margin-bottom: 30px;">`;
    
    r.personalClues.forEach((c, i) => {
      let regAttr = '';
      if(gameStarted) {
        const regIdx = _regClue('개인 증거 · ' + c.tag, c.name, c.desc, () => makePersonalSVG(r.id, i, s.id));
        regAttr = `data-clue-reg="${regIdx}"`;
      }

      html += `<div class="clue-card personal-clue-card ${gameStarted ? 'unlocked' : ''}" ${regAttr}>
        <div class="clue-inner">
          <div class="clue-img-wrap">
            ${makePersonalSVG(r.id, i, s.id)}
            ${!gameStarted ? `<div class="clue-locked-overlay">
              <div class="lock-icon">🔒</div>
              <div class="lock-countdown">게임 시작 후<br>공개</div>
            </div>` : ''}
          </div>
          <div class="clue-content ${!gameStarted ? 'clue-locked' : ''}">
            <div class="clue-num-tag">개인 증거 · ${c.tag}</div>
            <div class="clue-name">${gameStarted ? c.name : '???'}</div>
            <div class="clue-meaning">${c.desc}</div>
            ${gameStarted ? '<div class="clue-reveal-badge">🔎 탭하여 크게 보기</div>' : ''}
          </div>
        </div>
      </div>`;
    });
    html += `</div>`;
  }

  // Public clues
  html += `<div style="color: var(--text-sub); font-weight: bold; margin-bottom: 15px;">공개 단서 (타이머 연동)</div>
  <div class="clue-grid-wrapper" id="clue-grid-wrapper">`;

  s.clues.forEach((c, i) => {
    html += buildClueCard(c, i, elapsed, s.id);
  });

  html += `</div></div>`;
  return html;
}

function buildClueCard(c, idx, elapsedSec, sId) {
  const unlockMin = CLUE_UNLOCK[idx];
  const elapsedMin = elapsedSec < 0 ? -1 : Math.floor(elapsedSec / 60);
  const unlocked = elapsedSec >= 0 && elapsedMin >= unlockMin;
  const remainMin = Math.max(0, unlockMin - (elapsedMin < 0 ? 0 : elapsedMin));
  
  let regAttr = '';
  if(unlocked) {
    const desc = c.meaning + (c.where ? '\n\n📍 ' + c.where : '');
    const regIdx = _regClue('#' + c.num + ' ' + c.tag, c.name, desc, () => makeClueSVG(idx + 1, sId));
    regAttr = `data-clue-reg="${regIdx}"`;
  }

  return `<div class="clue-card ${unlocked ? 'unlocked' : ''}" data-clue-idx="${idx}" ${regAttr}>
    <div class="clue-inner">
      <div class="clue-img-wrap">
        ${makeClueSVG(idx + 1, sId)}
        ${!unlocked ? `<div class="clue-locked-overlay">
          <div class="lock-icon">🔒</div>
          <div class="lock-countdown">${elapsedSec < 0 ? '게임 시작 후\n공개' : remainMin + '분 후\n공개'}</div>
        </div>` : ''}
      </div>
      <div class="clue-content ${!unlocked ? 'clue-locked' : ''}">
        <div class="clue-num-tag">#${c.num} ${c.tag}</div>
        <div class="clue-name">${unlocked ? c.name : '???'}</div>
        <div class="clue-where">${unlocked ? '📍 ' + c.where : '🔒 ' + unlockMin + '분 후 공개'}</div>
        <div class="clue-meaning">${c.meaning}</div>
        ${unlocked ? '<div class="clue-reveal-badge">🔎 탭하여 크게 보기</div>' : ''}
      </div>
    </div>
  </div>`;
}

function refreshClues(sId) {
  const wrapper = document.getElementById('clue-grid-wrapper');
  if(!wrapper || !currentScenario) return;
  const elapsed = getElapsed(sId);
  const clues = currentScenario.clues;
  
  if(!clues) return;

  clues.forEach((c, i) => {
    const card = wrapper.querySelector(`[data-clue-idx="${i}"]`);
    if(!card) return;
    const unlockMin = CLUE_UNLOCK[i];
    const elapsedMin = elapsed < 0 ? -1 : Math.floor(elapsed / 60);
    const wasUnlocked = card.classList.contains('unlocked');
    const nowUnlocked = elapsed >= 0 && elapsedMin >= unlockMin;
    
    if(nowUnlocked !== wasUnlocked) {
      card.outerHTML = buildClueCard(c, i, elapsed);
    } else if(!nowUnlocked) {
      const overlay = card.querySelector('.lock-countdown');
      if(overlay) {
        const remainMin = unlockMin - (elapsedMin < 0 ? 0 : elapsedMin);
        overlay.textContent = elapsed < 0 ? '게임 시작 후\n공개' : `${remainMin}분 후\n공개`;
      }
    }
  });

  if(elapsed >= 0) {
    document.querySelectorAll('.personal-clue-card:not(.unlocked)').forEach(card => {
      card.classList.add('unlocked');
      const overlay = card.querySelector('.clue-locked-overlay');
      if(overlay) overlay.remove();
      const content = card.querySelector('.clue-content');
      if(content) content.classList.remove('clue-locked');
      const name = card.querySelector('.clue-name');
      if(name) name.textContent = name.getAttribute('data-original-name') || name.textContent;
    });
  }
}

// ══════════════════════════════════════
// GM SPOILER GATE
// ══════════════════════════════════════
function buildGMGate() {
  return `
    <div class="rv-hero" style="text-align:center;">
      <div style="font-size:3rem; margin-bottom:12px;">⚠️</div>
      <div class="rv-name">GM 전용 · 스포일러 경고</div>
      <div class="rv-job" style="margin-top:12px; line-height:1.7;">
        이 화면에는 <strong>진범의 이름과 사건의 전말</strong>이 그대로 적혀 있습니다.<br>
        게임을 진행하는 GM만 열어 주세요.
      </div>
      <button class="game-start-btn" style="margin-top:24px;" onclick="revealGMContent()">
        나는 GM입니다 · 진행 자료 열기
      </button>
      <div style="margin-top:14px;">
        <button class="back-btn" onclick="goTo('scenario-view')">← 역할 선택으로 돌아가기</button>
      </div>
    </div>`;
}

function revealGMContent() {
  if(!currentScenario) return;
  document.getElementById('rv-content').innerHTML = buildGMContent(currentScenario);
}

// ══════════════════════════════════════
// GM CONTENT BUILDER
// ══════════════════════════════════════
function buildGMContent(s) {
  const gd = s.gmData;
  if(!gd) return `<div class="rv-hero">GM 데이터가 없습니다.</div>`;

  let html = `<div class="rv-hero">
    <div class="rv-status" style="background: var(--danger)">GAME MASTER ONLY</div>
    <div class="rv-name">GM 진행 패키지</div>
  </div>`;

  // GM Phases
  const phases = [
    {num: 1, title: '오프닝', time: '5분', script: gd.openingScript, note: '배경음을 틀고 낭독하세요.'},
    {num: 2, title: '1라운드 심문', time: '15분', script: '자유롭게 심문하세요. 모순을 찾으세요.', note: gd.round1Note},
    {num: 3, title: '중간 투표', time: '5분', script: '가장 의심가는 사람을 적어 내세요.', note: gd.voteNote},
    {num: 4, title: '2라운드 심문', time: '15분', script: '본격적으로 알리바이를 깨보세요.', note: gd.round2Note},
    {num: 5, title: '진실 공개', time: '5분', script: gd.closingScript, note: null}
  ];

  html += `<div class="rv-block"><div class="rv-block-title">📋 진행 스크립트</div>`;
  phases.forEach(p => {
    html += `<div class="gm-phase">
      <div class="gm-phase-num">${p.num}</div>
      <div>
        <div class="gm-phase-title">${p.title} <span class="gm-phase-time">${p.time}</span></div>
        ${p.script ? `<div class="gm-script"><div class="gm-script-label">🎙 낭독 스크립트</div>${p.script.replace(/\n/g, '<br>')}</div>` : ''}
        ${p.note ? `<div class="gm-note">💡 GM 팁: ${p.note}</div>` : ''}
      </div>
    </div>`;
  });
  html += `</div>`;

  // Truth
  html += `<div class="rv-block"><div class="rv-block-title">⚠ 진실 전문</div>
  <div class="truth-box">
    <div class="truth-title">진범: ${gd.culpritName}</div>
    <div class="truth-body">${gd.truth.replace(/\n/g, '<br>')}</div>
  </div></div>`;

  // Full Timeline
  html += `<div class="rv-block"><div class="rv-block-title">🕐 실제 타임라인</div>
  <div class="rv-tl">`;
  gd.timeline.forEach(t => {
    html += `<div class="rv-tl-row ${t.key ? 'secret' : ''}">
      <div class="rv-tl-time">${t.time}</div>
      <div class="rv-tl-spine">
        <div class="rv-tl-dot"></div>
        <div class="rv-tl-line"></div>
      </div>
      <div class="rv-tl-text" style="${t.key ? 'font-weight: bold; color: var(--danger);' : ''}">${t.text}</div>
    </div>`;
  });
  html += `</div></div>`;

  return html;
}

// ══════════════════════════════════════
// MODAL & REGISTRY
// ══════════════════════════════════════
const _clueReg = [];
function _regClue(tag, title, desc, svgFn) {
  const idx = _clueReg.length;
  _clueReg.push({tag, title, desc, svgFn});
  return idx;
}

function openImgModal(regIdx) {
  const c = _clueReg[regIdx];
  if(!c) return;
  document.getElementById('modal-tag').textContent = c.tag;
  document.getElementById('modal-title').textContent = c.title;
  document.getElementById('modal-desc').textContent = c.desc;
  document.getElementById('modal-svg').innerHTML = c.svgFn();
  document.getElementById('img-modal').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeImgModal() {
  document.getElementById('img-modal').classList.remove('open');
  document.body.style.overflow = '';
}

function closeModal(e) {
  if(e.target === document.getElementById('img-modal')) closeImgModal();
}

// Global click delegation for clues
document.addEventListener('click', function(e) {
  const card = e.target.closest('[data-clue-reg]');
  if(card) {
    const idx = parseInt(card.getAttribute('data-clue-reg'), 10);
    if(!isNaN(idx)) openImgModal(idx);
  }
});

// ══════════════════════════════════════
// NAVIGATION
// ══════════════════════════════════════
function goTo(viewId) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.getElementById(viewId).classList.add('active');
  window.scrollTo(0, 0);
  if (viewId === 'director-view') {
    renderDirector();
    startTimerLoop();
  }
}

// Init
window.addEventListener('DOMContentLoaded', () => {
  renderLobby();
  
  // Direct link support for scenarios
  const params = new URLSearchParams(window.location.search);
  const scenarioId = params.get('scenario');
  if (scenarioId) {
    const sId = parseInt(scenarioId, 10);
    if (!isNaN(sId)) {
      openScenario(sId);
    }
  }
});
