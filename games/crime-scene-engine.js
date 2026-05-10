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
  }, 1000);
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
  
  if (elapsed >= 0) {
    startBtn.classList.add('started');
    startIcon.textContent = '✓';
    startText.textContent = '게임 진행 중';
    timerDisp.textContent = `경과: ${fmtTime(elapsed)}`;
  } else {
    startBtn.classList.remove('started');
    startIcon.textContent = '▶';
    startText.textContent = '게임 시작 (GM이 누르세요)';
    timerDisp.textContent = '';
  }

  // Role grid rendering
  const grid = document.getElementById('role-grid');
  grid.innerHTML = s.roles.map(r => `
    <div class="role-btn" onclick="openRole('${r.id}')">
      <div class="rb-icon">${r.emoji}</div>
      <div class="rb-type">${r.isGM ? 'Game Master' : '참여자'}</div>
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
  document.getElementById('rv-content').innerHTML = r.isGM ? buildGMContent(s) : buildPlayerContent(r, s);

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
}

// Init
window.addEventListener('DOMContentLoaded', () => {
  renderLobby();
});
