// Public clues SVG generator
function makeClueSVG(idx, scenarioId = 1) {
  if (scenarioId === 2) {
    return `<svg viewBox="0 0 120 100" xmlns="http://www.w3.org/2000/svg"><rect width="120" height="100" fill="#12100c"/><text x="60" y="55" font-size="8" fill="#3a2a18" text-anchor="middle">#${idx}</text></svg>`;
  }
  const svgs = [
    // 1: 위스키 잔
    `<svg viewBox="0 0 120 100" xmlns="http://www.w3.org/2000/svg">
      <rect width="120" height="100" fill="#0e1116"/>
      <circle cx="60" cy="50" r="45" fill="#151a25" stroke="#2a3545" stroke-width="1.5"/>
      <rect x="35" y="30" width="20" height="40" rx="2" fill="#251a1a" stroke="#3a2525" stroke-width="1"/>
      <rect x="65" y="30" width="20" height="40" rx="2" fill="#252a35" stroke="#354050" stroke-width="1"/>
      <ellipse cx="45" cy="65" rx="8" ry="3" fill="#150f0f"/>
      <ellipse cx="75" cy="65" rx="8" ry="3" fill="#151a25"/>
      <text x="45" y="22" font-size="4" fill="#c44820" text-anchor="middle">Victim's</text>
      <text x="75" y="22" font-size="4" fill="#5a7a9a" text-anchor="middle">Guest's</text>
      <circle cx="45" cy="45" r="3" fill="#c44820" opacity="0.6"/>
      <circle cx="42" cy="50" r="2" fill="#c44820" opacity="0.4"/>
      <path d="M 45 40 L 48 35 L 50 38" stroke="#c44820" fill="none" opacity="0.8" stroke-width="1"/>
      <text x="60" y="85" font-size="3" fill="#8a9ab0" text-anchor="middle">수면제 검출 (피해자 잔에서만)</text>
    </svg>`,
    // 2: CCTV 리셋 로그
    `<svg viewBox="0 0 120 100" xmlns="http://www.w3.org/2000/svg">
      <rect width="120" height="100" fill="#0c0f14"/>
      <rect x="15" y="15" width="90" height="70" rx="2" fill="#10151f" stroke="#1a2535" stroke-width="1"/>
      <text x="25" y="30" font-size="4" fill="#4a6a8a" font-family="monospace">SYSTEM LOG</text>
      <line x1="25" y1="35" x2="95" y2="35" stroke="#1a2535" stroke-width="1"/>
      <text x="25" y="45" font-size="3" fill="#3a5060" font-family="monospace">01:45:12 [REC] CH 14_CORRIDOR</text>
      <text x="25" y="52" font-size="3" fill="#c44820" font-family="monospace">01:47:00 [SYS] MANUAL RESET INIT</text>
      <rect x="23" y="56" width="70" height="6" fill="#c44820" opacity="0.1"/>
      <text x="25" y="60" font-size="3" fill="#c44820" font-weight="bold" font-family="monospace">01:47:22 [ERR] SIGNAL LOST (CH 14)</text>
      <text x="25" y="68" font-size="3" fill="#3a5060" font-family="monospace">02:27:15 [SYS] REBOOT COMPLETE</text>
      <text x="25" y="75" font-size="3" fill="#3a5060" font-family="monospace">02:27:18 [REC] CH 14_CORRIDOR</text>
    </svg>`,
    // 3: 합의서 초안
    `<svg viewBox="0 0 120 100" xmlns="http://www.w3.org/2000/svg">
      <rect width="120" height="100" fill="#100e0a"/>
      <path d="M25 15 Q35 12 45 15 T65 12 T85 18 T95 15 L90 85 Q80 88 70 85 T50 88 T30 85 Z" fill="#f5f0e8" stroke="#d0c8b0" stroke-width="1"/>
      <path d="M35 15 Q45 20 40 40 Q45 60 30 80" stroke="#e0d8c0" fill="none" stroke-width="0.5"/>
      <path d="M85 20 Q70 40 80 60 Q70 70 85 80" stroke="#e0d8c0" fill="none" stroke-width="0.5"/>
      <text x="60" y="30" font-size="5" fill="#3a2a1a" font-weight="bold" text-anchor="middle">합 의 서</text>
      <line x1="40" y1="35" x2="80" y2="35" stroke="#8a7a6a" stroke-width="0.5"/>
      <text x="35" y="45" font-size="3" fill="#5a4a3a">갑: 한진테크 대표 오혜란</text>
      <text x="35" y="52" font-size="3" fill="#5a4a3a">을: 한태준 그룹 회장 한태준</text>
      <rect x="35" y="65" width="20" height="10" stroke="#a09080" fill="none" stroke-dasharray="2,2"/>
      <rect x="65" y="65" width="20" height="10" stroke="#a09080" fill="none" stroke-dasharray="2,2"/>
      <text x="45" y="71" font-size="2.5" fill="#a09080" text-anchor="middle">(서명)</text>
      <text x="75" y="71" font-size="2.5" fill="#a09080" text-anchor="middle">(서명)</text>
      <text x="60" y="95" font-size="3" fill="#8a7a60" text-anchor="middle">쓰레기통에서 발견 (구겨짐)</text>
    </svg>`,
    // 4: 처방전
    `<svg viewBox="0 0 120 100" xmlns="http://www.w3.org/2000/svg">
      <rect width="120" height="100" fill="#0e1116"/>
      <rect x="25" y="10" width="70" height="80" rx="2" fill="#f0f8ff" stroke="#b0c4de" stroke-width="1"/>
      <rect x="25" y="10" width="70" height="15" fill="#d0e0f0"/>
      <text x="60" y="20" font-size="4" fill="#2a4a6a" font-weight="bold" text-anchor="middle">처 방 전</text>
      <text x="32" y="35" font-size="3.5" fill="#3a4a5a">환자명: 강 민 혁</text>
      <text x="32" y="45" font-size="3.5" fill="#3a4a5a">처방약: 수면유도제 (Zolpidem)</text>
      <text x="32" y="55" font-size="3.5" fill="#3a4a5a">용량: 10mg / 14일분</text>
      <line x1="30" y1="65" x2="90" y2="65" stroke="#b0c4de" stroke-width="0.8"/>
      <text x="32" y="75" font-size="3" fill="#5a6a7a">발급일: 2024.11.14 23:30</text>
      <circle cx="75" cy="80" r="8" fill="none" stroke="#c44820" stroke-width="1.5" opacity="0.6"/>
      <path d="M70 80 L80 80 M75 75 L75 85" stroke="#c44820" stroke-width="1" opacity="0.6"/>
      <text x="75" y="81" font-size="2" fill="#c44820" text-anchor="middle" font-weight="bold" transform="rotate(-15 75 80)">약국필</text>
    </svg>`,
    // 5: 문자 내역
    `<svg viewBox="0 0 120 100" xmlns="http://www.w3.org/2000/svg">
      <rect width="120" height="100" fill="#0a0c10"/>
      <rect x="30" y="10" width="60" height="80" rx="8" fill="#1a1e25" stroke="#2a3545" stroke-width="2"/>
      <rect x="30" y="10" width="60" height="12" rx="8" fill="#202530"/>
      <rect x="30" y="18" width="60" height="4" fill="#202530"/>
      <text x="60" y="18" font-size="3" fill="#f0f0f0" text-anchor="middle">최수현 전무</text>
      <rect x="40" y="30" width="45" height="12" rx="4" fill="#3a4a60"/>
      <text x="62" y="38" font-size="3" fill="#f0f0f0" text-anchor="middle">다 알고 있어</text>
      <text x="35" y="40" font-size="2" fill="#8a9ab0">00:58</text>
      <circle cx="60" cy="85" r="3" fill="#2a3545"/>
    </svg>`,
    // 6: 마스터키 기록
    `<svg viewBox="0 0 120 100" xmlns="http://www.w3.org/2000/svg">
      <rect width="120" height="100" fill="#0c0f14"/>
      <rect x="10" y="20" width="100" height="60" rx="3" fill="#10151f" stroke="#2a3545" stroke-width="1"/>
      <text x="60" y="32" font-size="4" fill="#5a7a9a" font-weight="bold" text-anchor="middle">RM 1408 DOOR LOCK LOG</text>
      <line x1="15" y1="38" x2="105" y2="38" stroke="#2a3545" stroke-width="0.8"/>
      <text x="20" y="48" font-size="3" fill="#3a5060" font-family="monospace">22:00:15 - KEY #1408_01</text>
      <text x="20" y="55" font-size="3" fill="#3a5060" font-family="monospace">00:10:42 - INSIDE OPEN</text>
      <rect x="18" y="59" width="84" height="7" fill="#c44820" opacity="0.1"/>
      <text x="20" y="64" font-size="3" fill="#c44820" font-weight="bold" font-family="monospace">02:03:11 - VIP MASTER KEY (#04)</text>
      <text x="20" y="71" font-size="3" fill="#3a5060" font-family="monospace">07:10:22 - STAFF KEY (#02)</text>
    </svg>`,
    // 7: 빈 포장지
    `<svg viewBox="0 0 120 100" xmlns="http://www.w3.org/2000/svg">
      <rect width="120" height="100" fill="#100e0a"/>
      <path d="M30 40 Q40 35 50 38 L80 30 Q90 35 85 45 L90 70 Q80 80 70 75 L40 85 Q30 80 25 70 Z" fill="#2a1f25" stroke="#3a2a35" stroke-width="1.5"/>
      <rect x="40" y="45" width="40" height="25" rx="2" fill="#dcd0c0" transform="rotate(-5 60 55)"/>
      <text x="60" y="55" font-size="3.5" fill="#4a3a3a" font-weight="bold" text-anchor="middle" transform="rotate(-5 60 55)">수면유도제</text>
      <text x="60" y="63" font-size="2.5" fill="#6a5a5a" text-anchor="middle" transform="rotate(-5 60 55)">EMPTY</text>
      <text x="60" y="95" font-size="3" fill="#8a7a60" text-anchor="middle">서유진 핸드백에서 발견</text>
    </svg>`,
    // 8: 명함
    `<svg viewBox="0 0 120 100" xmlns="http://www.w3.org/2000/svg">
      <rect width="120" height="100" fill="#100e0a"/>
      <rect x="25" y="25" width="70" height="45" rx="2" fill="#f0ebd8" stroke="#d0c8b0" stroke-width="1" transform="rotate(-5 60 45)"/>
      <text x="60" y="45" font-size="4" fill="#3a4a5a" font-family="sans-serif" text-anchor="middle" transform="rotate(-5 60 45)">(주) 그랜드 아스토리아</text>
      <text x="60" y="55" font-size="5" fill="#1a2a3a" font-weight="bold" text-anchor="middle" transform="rotate(-5 60 45)">박 도 현</text>
      <text x="60" y="62" font-size="2.5" fill="#5a6a7a" text-anchor="middle" transform="rotate(-5 60 45)">객실지원팀 / 010-XXXX-XXXX</text>
      
      <g transform="translate(15, 65) rotate(-15)">
        <path d="M0 0 Q20 -5 40 5 L35 20 Q15 10 -5 15 Z" fill="#fffae6" stroke="#e0d8b0" stroke-width="0.5"/>
        <text x="15" y="10" font-size="3" fill="#2a1a4a" font-family="cursive">14층 야간 화/금</text>
      </g>
    </svg>`,
    // 9: 새 유언장
    `<svg viewBox="0 0 120 100" xmlns="http://www.w3.org/2000/svg">
      <rect width="120" height="100" fill="#0e1116"/>
      <rect x="25" y="10" width="70" height="80" rx="1" fill="#f5f0e8" stroke="#d0c8b0" stroke-width="1"/>
      <text x="60" y="25" font-size="5" fill="#1a1a1a" font-weight="bold" text-anchor="middle">유 언 장</text>
      <line x1="35" y1="30" x2="85" y2="30" stroke="#1a1a1a" stroke-width="1"/>
      <text x="35" y="45" font-size="3" fill="#3a3a3a">1. 전 재산의 30%를</text>
      <text x="40" y="52" font-size="3.5" fill="#c44820" font-weight="bold">한재윤에게 상속한다.</text>
      <text x="35" y="62" font-size="3" fill="#3a3a3a">2. 최수현 전무의 상속분은</text>
      <text x="40" y="69" font-size="3.5" fill="#c44820" font-weight="bold">전면 취소한다.</text>
      <path d="M30 40 L90 75 M30 75 L90 40" stroke="#c44820" stroke-width="1.5" opacity="0.3"/>
      <text x="60" y="85" font-size="3" fill="#a05050" font-weight="bold" text-anchor="middle">초안 (서명 없음)</text>
    </svg>`,
    // 10: 로비 목격 진술
    `<svg viewBox="0 0 120 100" xmlns="http://www.w3.org/2000/svg">
      <rect width="120" height="100" fill="#0a0c10"/>
      <rect x="15" y="15" width="90" height="70" rx="4" fill="#151a25" stroke="#2a3545" stroke-width="1.5"/>
      <text x="60" y="28" font-size="4.5" fill="#7ab8e0" font-weight="bold" text-anchor="middle">목 격 진 술 서</text>
      <line x1="20" y1="35" x2="100" y2="35" stroke="#2a3545" stroke-width="1"/>
      <text x="25" y="48" font-size="3" fill="#8a9ab0">"새벽 2시쯤이었습니다.</text>
      <text x="25" y="58" font-size="3" fill="#8a9ab0">로비 소파에 한진테크 오혜란 대표가</text>
      <text x="25" y="68" font-size="3" fill="#8a9ab0">앉아있는 걸 확실히 봤습니다."</text>
      <text x="95" y="78" font-size="2.5" fill="#5a7a9a" text-anchor="end">- 야간 로비 데스크 직원</text>
    </svg>`
  ];
  return svgs[idx - 1] || `<svg viewBox="0 0 120 100" xmlns="http://www.w3.org/2000/svg"><rect width="120" height="100" fill="#111"/><text x="60" y="50" fill="#555" font-size="5" text-anchor="middle">IMAGE</text></svg>`;
}

// Personal secrets SVG generator
function makePersonalSVG(roleId, clueIdx, scenarioId = 1) {
  if (scenarioId === 2) {
    const data2 = {
      ryumin: [
        `<svg viewBox="0 0 120 100" xmlns="http://www.w3.org/2000/svg">
          <rect width="120" height="100" fill="#0a0c10"/>
          <rect x="14" y="10" width="92" height="80" rx="3" fill="#1a2030" stroke="#2a3040" stroke-width="1.5"/>
          <text x="60" y="23" font-size="4" fill="#7ab8e0" text-anchor="middle">인터넷 주문 내역</text>
          <line x1="18" y1="27" x2="102" y2="27" stroke="#2a3040" stroke-width=".8"/>
          <text x="22" y="36" font-size="3" fill="#5a8ab0">주문자: 류민아</text>
          <text x="22" y="43" font-size="3" fill="#5a8ab0">품목: 시안화나트륨 (실험용)</text>
          <rect x="18" y="49" width="84" height="8" rx="1" fill="#2a1008" stroke="#c44820" stroke-width=".5"/>
          <text x="60" y="54.5" font-size="3.2" fill="#ff9a7a" text-anchor="middle">청산가리 계열 — 맹독성</text>
          <text x="22" y="66" font-size="3" fill="#5a8ab0">주문일: 사건 8일 전</text>
          <text x="22" y="73" font-size="3" fill="#5a8ab0">배송지: 자택</text>
          <text x="22" y="82" font-size="2.8" fill="#c44820">수령 서명: 류민아</text>
        </svg>`,
        `<svg viewBox="0 0 120 100" xmlns="http://www.w3.org/2000/svg">
          <rect width="120" height="100" fill="#100e0a"/>
          <rect x="14" y="8" width="92" height="84" rx="2" fill="#1e1a14" stroke="#2e2a18" stroke-width="1.5"/>
          <text x="60" y="21" font-size="4" fill="#c9a84c" text-anchor="middle">원고 6장 — 해당 챕터</text>
          <line x1="18" y1="25" x2="102" y2="25" stroke="#2e2a18" stroke-width=".8"/>
          <rect x="18" y="29" width="84" height="44" rx="2" fill="#f5f0e8" opacity=".08"/>
          <text x="22" y="38" font-size="2.8" fill="#a09070" font-style="italic">"출판계에서 그녀는</text>
          <text x="22" y="44" font-size="2.8" fill="#a09070" font-style="italic"> 타인의 원고를 자신의</text>
          <text x="22" y="50" font-size="2.8" fill="#a09070" font-style="italic"> 이름으로 발표하고</text>
          <text x="22" y="56" font-size="2.8" fill="#a09070" font-style="italic"> 데뷔한 편집자였다."</text>
          <rect x="18" y="62" width="84" height="8" rx="1" fill="#2a1808" stroke="#c44820" stroke-width=".5"/>
          <text x="60" y="67.5" font-size="3" fill="#c44820" text-anchor="middle">류민아 = 실제 모델 확정</text>
          <text x="60" y="83" font-size="2.8" fill="#5a4a30" text-anchor="middle">출간 시 명예훼손 초과 — 경력 파멸</text>
        </svg>`
      ],
      oseo: [
        `<svg viewBox="0 0 120 100" xmlns="http://www.w3.org/2000/svg">
          <rect width="120" height="100" fill="#100e0a"/>
          <rect x="16" y="8" width="88" height="84" rx="2" fill="#f5f0e8" stroke="#d0c8b0" stroke-width="1"/>
          <rect x="16" y="8" width="88" height="12" rx="2" fill="#1a130a"/>
          <text x="60" y="17.5" font-size="4" fill="#c44820" text-anchor="middle">위자료 이행촉구 공문</text>
          <text x="26" y="30" font-size="3.2" fill="#5a4a30">채권자: 오서진</text>
          <text x="26" y="38" font-size="3.2" fill="#5a4a30">채무자: 윤재혁</text>
          <rect x="20" y="44" width="80" height="8" rx="1" fill="#ffeaea"/>
          <text x="60" y="49.5" font-size="3.2" fill="#c44820" text-anchor="middle">미지급 위자료: 4억 2천만원</text>
          <line x1="20" y1="56" x2="100" y2="56" stroke="#d0c8b0" stroke-width=".6"/>
          <text x="26" y="65" font-size="3" fill="#8a7a60">발송일: 사건 2주 전</text>
          <text x="26" y="73" font-size="3" fill="#8a7a60">법원 강제집행 신청 예정</text>
          <text x="26" y="83" font-size="2.8" fill="#c44820">※ 윤재혁이 계속 미루고 있었음</text>
        </svg>`,
        `<svg viewBox="0 0 120 100" xmlns="http://www.w3.org/2000/svg">
          <rect width="120" height="100" fill="#100e0a"/>
          <rect x="16" y="8" width="88" height="84" rx="2" fill="#f5f0e8" stroke="#d0c8b0" stroke-width="1"/>
          <rect x="16" y="8" width="88" height="12" rx="2" fill="#2a1a30"/>
          <text x="60" y="17.5" font-size="4" fill="#c090e0" text-anchor="middle">수면제 처방전</text>
          <text x="26" y="30" font-size="3.2" fill="#5a4a30">환자명: 오서진</text>
          <text x="26" y="38" font-size="3.2" fill="#5a4a30">처방약: 졸피뎀 2mg×14</text>
          <text x="26" y="46" font-size="3.2" fill="#5a4a30">처방일: 사건 당일</text>
          <rect x="20" y="52" width="80" height="8" rx="1" fill="#fff0e0"/>
          <text x="60" y="57.5" font-size="3.2" fill="#8b3012" text-anchor="middle">처방 후 만찬 참석</text>
          <line x1="20" y1="64" x2="100" y2="64" stroke="#d0c8b0" stroke-width=".6"/>
          <text x="26" y="73" font-size="3" fill="#8a7a60">음주+수면제 병용 시</text>
          <text x="26" y="80" font-size="3" fill="#c44820">기억력 저하 가능성</text>
        </svg>`
      ],
      handong: [
        `<svg viewBox="0 0 120 100" xmlns="http://www.w3.org/2000/svg">
          <rect width="120" height="100" fill="#100e0a"/>
          <rect x="14" y="8" width="92" height="84" rx="2" fill="#1e1a14" stroke="#2e2a18" stroke-width="1.5"/>
          <text x="60" y="21" font-size="4" fill="#c9a84c" text-anchor="middle">원고 비교 분석</text>
          <line x1="18" y1="25" x2="102" y2="25" stroke="#2e2a18" stroke-width=".8"/>
          <rect x="18" y="29" width="40" height="44" rx="2" fill="#f5f0e8" opacity=".1"/>
          <rect x="62" y="29" width="40" height="44" rx="2" fill="#f5f0e8" opacity=".08"/>
          <text x="38" y="39" font-size="3" fill="#c9a84c" text-anchor="middle">스승 초고</text>
          <text x="38" y="45" font-size="2.5" fill="#8a7a50" text-anchor="middle">"그날 밤 창문에</text>
          <text x="38" y="50" font-size="2.5" fill="#8a7a50" text-anchor="middle">빗소리가 내렸다"</text>
          <text x="82" y="39" font-size="3" fill="#7ab8e0" text-anchor="middle">한동욱 원고</text>
          <text x="82" y="45" font-size="2.5" fill="#6a8ab0" text-anchor="middle">"그날 밤 창문에</text>
          <text x="82" y="50" font-size="2.5" fill="#6a8ab0" text-anchor="middle">빗소리가 울렸다"</text>
          <rect x="18" y="78" width="84" height="6" rx="1" fill="#2a1808" stroke="#c44820" stroke-width=".5"/>
          <text x="60" y="82.5" font-size="2.8" fill="#c44820" text-anchor="middle">핵심 구절 72% 일치 — 표절 의혹</text>
        </svg>`,
        `<svg viewBox="0 0 120 100" xmlns="http://www.w3.org/2000/svg">
          <rect width="120" height="100" fill="#0a0c10"/>
          <rect x="22" y="8" width="76" height="84" rx="10" fill="#1a1e2a" stroke="#2a3040" stroke-width="1.5"/>
          <rect x="26" y="14" width="68" height="70" rx="6" fill="#0e1018"/>
          <rect x="26" y="14" width="68" height="10" rx="6" fill="#1a2030"/>
          <text x="60" y="21" font-size="3.5" fill="#5a6a80" text-anchor="middle">윤재혁 (스승) ▾</text>
          <rect x="30" y="30" width="56" height="12" rx="5" fill="#1e2535"/>
          <text x="58" y="38" font-size="3" fill="#7ab8e0" text-anchor="middle">"네 원고 봤어.</text>
          <rect x="36" y="45" width="50" height="12" rx="5" fill="#1e2535"/>
          <text x="61" y="53" font-size="3" fill="#7ab8e0" text-anchor="middle">이건 내 글이야.</text>
          <rect x="36" y="60" width="50" height="12" rx="5" fill="#1e2535"/>
          <text x="61" y="68" font-size="3" fill="#7ab8e0" text-anchor="middle">더는 내 제자가 아니야."</text>
          <text x="60" y="83" font-size="3" fill="#c44820" text-anchor="middle">사건 3일 전 발송됨</text>
        </svg>`
      ],
      baekji: [
        `<svg viewBox="0 0 120 100" xmlns="http://www.w3.org/2000/svg">
          <rect width="120" height="100" fill="#100e0a"/>
          <rect x="14" y="8" width="92" height="84" rx="2" fill="#f5f0e8" stroke="#d0c8b0" stroke-width="1"/>
          <rect x="14" y="8" width="92" height="12" rx="2" fill="#1a130a"/>
          <text x="60" y="17.5" font-size="4" fill="#c44820" text-anchor="middle">내용증명: 저작권 계약 취소</text>
          <line x1="18" y1="24" x2="106" y2="24" stroke="#d0c8b0" stroke-width=".6"/>
          <text x="22" y="33" font-size="3.2" fill="#5a4a30">수신: 백지수</text>
          <text x="22" y="41" font-size="3.2" fill="#5a4a30">발신: 윤재혁 (법률대리인)</text>
          <rect x="18" y="47" width="84" height="22" rx="2" fill="#ffeaea"/>
          <text x="60" y="53" font-size="3" fill="#c44820" text-anchor="middle">단편 모음집 수익 무단 독점에 따른</text>
          <text x="60" y="60" font-size="3" fill="#c44820" text-anchor="middle">계약 취소 및 손해배상 청구</text>
          <text x="60" y="66" font-size="3.5" fill="#c44820" text-anchor="middle" font-weight="bold">청구액: 3억원</text>
          <line x1="18" y1="73" x2="106" y2="73" stroke="#d0c8b0" stroke-width=".6"/>
          <text x="22" y="82" font-size="2.8" fill="#8a7a60">1주 전 수신. 수락 또는 법적 소송.</text>
        </svg>`,
        `<svg viewBox="0 0 120 100" xmlns="http://www.w3.org/2000/svg">
          <rect width="120" height="100" fill="#0a0c10"/>
          <rect x="14" y="10" width="92" height="80" rx="3" fill="#1a2030" stroke="#2a3040" stroke-width="1.5"/>
          <text x="60" y="23" font-size="4" fill="#7ab8e0" text-anchor="middle">통화 기록 내역</text>
          <line x1="18" y1="27" x2="102" y2="27" stroke="#2a3040" stroke-width=".8"/>
          <text x="22" y="36" font-size="3" fill="#5a8ab0">대상자: 백지수 휴대폰</text>
          <rect x="18" y="42" width="84" height="8" rx="1" fill="#2a1008" stroke="#c44820" stroke-width=".5"/>
          <text x="22" y="47.5" font-size="3.2" fill="#ff9a7a">발신</text>
          <text x="45" y="47.5" font-size="3.2" fill="#ff9a7a">윤재혁 (수신)</text>
          <text x="95" y="47.5" font-size="3.2" fill="#ff9a7a" text-anchor="end">17:42</text>
          <text x="60" y="62" font-size="4" fill="#c44820" text-anchor="middle" font-weight="bold">통화 시간: 18분 23초</text>
          <text x="60" y="74" font-size="3" fill="#5a8ab0" text-anchor="middle">만찬 직전 긴 통화.</text>
          <text x="60" y="82" font-size="2.8" fill="#5a8ab0" text-anchor="middle">합의 요청 및 다툼이 있었을 것으로 추정.</text>
        </svg>`
      ],
      yuntae: [
        `<svg viewBox="0 0 120 100" xmlns="http://www.w3.org/2000/svg">
          <rect width="120" height="100" fill="#0e1116"/>
          <rect x="25" y="10" width="70" height="80" rx="1" fill="#f5f0e8" stroke="#d0c8b0" stroke-width="1"/>
          <text x="60" y="25" font-size="5" fill="#1a1a1a" font-weight="bold" text-anchor="middle">유 언 장</text>
          <line x1="35" y1="30" x2="85" y2="30" stroke="#1a1a1a" stroke-width="1"/>
          <text x="35" y="45" font-size="3" fill="#3a3a3a">1. 전 재산 및 저작권을</text>
          <text x="40" y="52" font-size="3.5" fill="#c44820" font-weight="bold">동생 윤태경에게 상속한다.</text>
          <text x="35" y="62" font-size="3" fill="#3a3a3a">2. 전처 오서진, 조수 한동욱에</text>
          <text x="40" y="69" font-size="3" fill="#3a3a3a">대한 상속 및 증여는 없다.</text>
          <text x="60" y="85" font-size="3" fill="#a05050" font-weight="bold" text-anchor="middle">작성일: 올해 1월</text>
        </svg>`,
        `<svg viewBox="0 0 120 100" xmlns="http://www.w3.org/2000/svg">
          <rect width="120" height="100" fill="#100e0a"/>
          <rect x="14" y="8" width="92" height="84" rx="2" fill="#1e1a14" stroke="#2e2a18" stroke-width="1.5"/>
          <text x="60" y="21" font-size="4" fill="#c9a84c" text-anchor="middle">아나필락시스 위험 고지</text>
          <line x1="18" y1="25" x2="102" y2="25" stroke="#2e2a18" stroke-width=".8"/>
          <rect x="18" y="29" width="84" height="44" rx="2" fill="#f5f0e8" opacity=".1"/>
          <text x="60" y="38" font-size="3.5" fill="#c44820" font-weight="bold" text-anchor="middle">★ 극도의 꿀벌 알레르기 ★</text>
          <text x="22" y="48" font-size="2.8" fill="#a09070">"환자는 꿀벌 자상 시 급성</text>
          <text x="22" y="54" font-size="2.8" fill="#a09070"> 아나필락시스 쇼크 발현됨.</text>
          <text x="22" y="60" font-size="2.8" fill="#a09070"> 에피네프린 즉시 투여 필요."</text>
          <rect x="18" y="76" width="84" height="8" rx="1" fill="#2a1808" stroke="#c44820" stroke-width=".5"/>
          <text x="60" y="81.5" font-size="3" fill="#c44820" text-anchor="middle">윤태경이 유일하게 아는 사실.</text>
          <text x="60" y="88" font-size="2.8" fill="#c44820" text-anchor="middle">장식 꿀병을 바꿔치기한 진짜 범인.</text>
        </svg>`
      ]
    };
    return data2[roleId] ? data2[roleId][clueIdx] || '' : '';
  }

  const data = {
    kang: [
      `<svg viewBox="0 0 120 100" xmlns="http://www.w3.org/2000/svg">
        <rect width="120" height="100" fill="#100e0a"/>
        <rect x="25" y="15" width="70" height="70" fill="#f5f0e8" stroke="#d0c8b0" stroke-width="1"/>
        <text x="60" y="30" font-size="4" fill="#1a1a1a" font-weight="bold" text-anchor="middle">해고 통보서</text>
        <line x1="35" y1="35" x2="85" y2="35" stroke="#1a1a1a" stroke-width="1"/>
        <text x="35" y="45" font-size="3" fill="#3a3a3a">대상자: 강민혁 비서실장</text>
        <text x="35" y="55" font-size="3" fill="#3a3a3a">사유: 기밀 누설 우려 ("네가</text>
        <text x="45" y="62" font-size="3" fill="#3a3a3a">너무 많이 알아서")</text>
        <text x="35" y="72" font-size="3" fill="#c44820" font-weight="bold">퇴직금: 0원 (즉시 해고)</text>
      </svg>`,
      `<svg viewBox="0 0 120 100" xmlns="http://www.w3.org/2000/svg">
        <rect width="120" height="100" fill="#0e1116"/>
        <text x="60" y="20" font-size="4" fill="#7ab8e0" text-anchor="middle">수면제 구입 이력</text>
        <rect x="20" y="30" width="80" height="15" rx="2" fill="#151a25" stroke="#2a3545" stroke-width="1"/>
        <text x="30" y="39" font-size="3" fill="#8a9ab0">09.15: 14일분 (지시)</text>
        <rect x="20" y="50" width="80" height="15" rx="2" fill="#151a25" stroke="#2a3545" stroke-width="1"/>
        <text x="30" y="59" font-size="3" fill="#8a9ab0">10.20: 14일분 (지시)</text>
        <rect x="20" y="70" width="80" height="15" rx="2" fill="#1a251a" stroke="#2a452a" stroke-width="1"/>
        <text x="30" y="79" font-size="3" fill="#8ab870">11.14: 14일분 (지시 - 오늘)</text>
      </svg>`
    ],
    seo: [
      `<svg viewBox="0 0 120 100" xmlns="http://www.w3.org/2000/svg">
        <rect width="120" height="100" fill="#080808"/>
        <path d="M 0 0 L 120 0 L 120 100 L 0 100 Z" fill="#111" />
        <rect x="40" y="30" width="40" height="60" rx="5" fill="#1a1a1a" />
        <circle cx="60" cy="20" r="10" fill="#1a1a1a" />
        <path d="M 60 10 Q 70 10 75 25" fill="none" stroke="#1a1a1a" stroke-width="4"/>
        <ellipse cx="50" cy="80" rx="15" ry="5" fill="#2a1a1a"/>
        <text x="60" y="90" font-size="3" fill="#555" text-anchor="middle">목격: 키 크고 머리 짧은 여자 (00:00)</text>
        <path d="M 10 50 Q 60 40 110 50" fill="none" stroke="#c44820" stroke-width="1" opacity="0.3"/>
      </svg>`,
      `<svg viewBox="0 0 120 100" xmlns="http://www.w3.org/2000/svg">
        <rect width="120" height="100" fill="#100e0a"/>
        <path d="M 20 40 L 100 40 L 90 90 L 30 90 Z" fill="#2a1a20" stroke="#3a2a30" stroke-width="2"/>
        <path d="M 40 40 Q 60 10 80 40" fill="none" stroke="#2a1a20" stroke-width="3"/>
        <rect x="45" y="60" width="30" height="15" rx="1" fill="#e0d0c0" transform="rotate(-10 60 65)"/>
        <text x="60" y="67" font-size="3" fill="#4a3a3a" font-weight="bold" text-anchor="middle" transform="rotate(-10 60 65)">수면유도제</text>
        <text x="60" y="95" font-size="3" fill="#8a7a60" text-anchor="middle">회장이 예전에 준 것 (동일 제품)</text>
      </svg>`
    ],
    han: [
      `<svg viewBox="0 0 120 100" xmlns="http://www.w3.org/2000/svg">
        <rect width="120" height="100" fill="#0a0c10"/>
        <rect x="25" y="10" width="70" height="80" rx="5" fill="#1a1e25" stroke="#2a3545" stroke-width="2"/>
        <text x="60" y="20" font-size="3" fill="#8a9ab0" text-anchor="middle">박도현</text>
        <rect x="35" y="30" width="50" height="12" rx="4" fill="#2a4a3a"/>
        <text x="60" y="38" font-size="3" fill="#a0c0a0" text-anchor="middle">지금 객실 비어있냐</text>
        <rect x="40" y="45" width="45" height="12" rx="4" fill="#3a4a60"/>
        <text x="62" y="53" font-size="3" fill="#a0b0c0" text-anchor="middle">손님 들어있음</text>
        <rect x="30" y="60" width="55" height="12" rx="4" fill="#2a4a3a"/>
        <text x="57" y="68" font-size="3" fill="#a0c0a0" text-anchor="middle">CCTV 잠깐 꺼줄 수 있어</text>
      </svg>`,
      `<svg viewBox="0 0 120 100" xmlns="http://www.w3.org/2000/svg">
        <rect width="120" height="100" fill="#100e0a"/>
        <rect x="20" y="15" width="80" height="70" fill="#f5f0e8" stroke="#d0c8b0" stroke-width="1"/>
        <text x="60" y="30" font-size="4" fill="#c44820" font-weight="bold" text-anchor="middle">유언장 사본 (현재 유효)</text>
        <line x1="30" y1="35" x2="90" y2="35" stroke="#1a1a1a" stroke-width="1"/>
        <text x="30" y="45" font-size="3" fill="#3a3a3a">한재윤에게 30억 배분</text>
        <text x="30" y="55" font-size="3" fill="#3a3a3a">최수현에게 50% 상속</text>
        <path d="M 25 35 L 95 65 M 25 65 L 95 35" stroke="#1a1a1a" stroke-width="1" opacity="0.1"/>
        <text x="60" y="80" font-size="3" fill="#8a7a60" text-anchor="middle">이게 바뀌면 안 된다</text>
      </svg>`
    ],
    oh: [
      `<svg viewBox="0 0 120 100" xmlns="http://www.w3.org/2000/svg">
        <rect width="120" height="100" fill="#0a0c10"/>
        <rect x="15" y="15" width="90" height="70" rx="2" fill="#10151f" stroke="#1a2535" stroke-width="1"/>
        <text x="60" y="25" font-size="4" fill="#5a7a9a" text-anchor="middle">14층 평면도 동선</text>
        <rect x="30" y="35" width="20" height="15" fill="#1a2535"/>
        <text x="40" y="44" font-size="3" fill="#8a9ab0" text-anchor="middle">1408</text>
        <rect x="70" y="35" width="20" height="15" fill="#1a2535"/>
        <text x="80" y="44" font-size="3" fill="#8a9ab0" text-anchor="middle">1412</text>
        <path d="M 40 60 L 80 60" stroke="#c44820" stroke-width="2" stroke-dasharray="4,2" fill="none"/>
        <circle cx="40" cy="60" r="3" fill="#c44820"/>
        <circle cx="80" cy="60" r="3" fill="#c44820"/>
        <text x="60" y="75" font-size="3" fill="#c44820" text-anchor="middle">01:00 ~ 02:00 복도 배회</text>
      </svg>`,
      `<svg viewBox="0 0 120 100" xmlns="http://www.w3.org/2000/svg">
        <rect width="120" height="100" fill="#100e0a"/>
        <rect x="20" y="15" width="80" height="70" fill="#f5f0e8" stroke="#d0c8b0" stroke-width="1"/>
        <text x="60" y="30" font-size="4" fill="#1a1a1a" font-weight="bold" text-anchor="middle">합의서 - 기밀 조항</text>
        <line x1="30" y1="35" x2="90" y2="35" stroke="#1a1a1a" stroke-width="1"/>
        <text x="30" y="45" font-size="3" fill="#3a3a3a">제 4조: 상호 민형사상 책임 불문</text>
        <rect x="25" y="50" width="70" height="15" fill="#ffcccc" opacity="0.5"/>
        <text x="30" y="56" font-size="3" fill="#c44820">※ 오혜란 1993년 탈세 3억 포함</text>
        <text x="30" y="62" font-size="3" fill="#c44820">서명 시 동반 소멸</text>
        <text x="60" y="80" font-size="3" fill="#8a7a60" text-anchor="middle">공개되면 나도 끝이다</text>
      </svg>`
    ],
    park: [
      `<svg viewBox="0 0 120 100" xmlns="http://www.w3.org/2000/svg">
        <rect width="120" height="100" fill="#0c0f14"/>
        <rect x="15" y="25" width="90" height="50" rx="3" fill="#10151f" stroke="#2a3545" stroke-width="1.5"/>
        <circle cx="60" cy="50" r="15" fill="#0a0c10" stroke="#3a5060" stroke-width="2"/>
        <line x1="60" y1="40" x2="60" y2="45" stroke="#c44820" stroke-width="2"/>
        <text x="60" y="85" font-size="4" fill="#c44820" font-weight="bold" text-anchor="middle">01:47 MANUAL RESET</text>
        <text x="60" y="95" font-size="3" fill="#8a9ab0" text-anchor="middle">한재윤 부탁으로 내가 눌렀다</text>
      </svg>`,
      `<svg viewBox="0 0 120 100" xmlns="http://www.w3.org/2000/svg">
        <rect width="120" height="100" fill="#100e0a"/>
        <rect x="20" y="30" width="80" height="40" fill="#2a1a1a" stroke="#3a2a2a" stroke-width="2"/>
        <text x="60" y="20" font-size="4" fill="#8a7a60" text-anchor="middle">프런트 카운터</text>
        <rect x="75" y="45" width="10" height="15" rx="1" fill="#a08040"/>
        <text x="80" y="55" font-size="3" fill="#3a2a1a" text-anchor="middle" font-weight="bold">KEY</text>
        <text x="60" y="85" font-size="3" fill="#c44820" text-anchor="middle">01:20경 카운터 방치 (절취 가능)</text>
      </svg>`
    ],
    choi: [
      `<svg viewBox="0 0 120 100" xmlns="http://www.w3.org/2000/svg">
        <rect width="120" height="100" fill="#100e0a"/>
        <rect x="20" y="15" width="80" height="70" fill="#f5f0e8" stroke="#d0c8b0" stroke-width="1"/>
        <text x="60" y="30" font-size="4" fill="#1a1a1a" font-weight="bold" text-anchor="middle">생명보험 증서</text>
        <line x1="30" y1="35" x2="90" y2="35" stroke="#1a1a1a" stroke-width="1"/>
        <text x="30" y="45" font-size="3" fill="#3a3a3a">피보험자: 한태준</text>
        <text x="30" y="55" font-size="3" fill="#3a3a3a">수혜자: 최수현 (변경됨)</text>
        <text x="30" y="65" font-size="3" fill="#c44820" font-weight="bold">보험금: 50억 원</text>
        <text x="60" y="80" font-size="3" fill="#8a7a60" text-anchor="middle">보험설계사 매수 (삼촌 모름)</text>
      </svg>`,
      `<svg viewBox="0 0 120 100" xmlns="http://www.w3.org/2000/svg">
        <rect width="120" height="100" fill="#080808"/>
        <rect x="20" y="25" width="80" height="50" rx="5" fill="#1a1a1a" stroke="#3a3a3a" stroke-width="2"/>
        <line x1="25" y1="35" x2="95" y2="35" stroke="#3a3a3a" stroke-width="1"/>
        <rect x="45" y="45" width="30" height="20" fill="#f5f0e8" transform="rotate(-5 60 55)"/>
        <text x="60" y="57" font-size="3" fill="#c44820" font-weight="bold" text-anchor="middle" transform="rotate(-5 60 55)">새 유언장 초안</text>
        <text x="60" y="85" font-size="3" fill="#8a9ab0" text-anchor="middle">서류가방 무단 접근 (내 이름 없음)</text>
      </svg>`,
      `<svg viewBox="0 0 120 100" xmlns="http://www.w3.org/2000/svg">
        <rect width="120" height="100" fill="#0c0f14"/>
        <circle cx="20" cy="50" r="10" fill="#1a2535"/>
        <text x="20" y="52" font-size="4" fill="#7ab8e0" text-anchor="middle">1</text>
        <circle cx="60" cy="50" r="10" fill="#1a2535"/>
        <text x="60" y="52" font-size="4" fill="#7ab8e0" text-anchor="middle">2</text>
        <circle cx="100" cy="50" r="10" fill="#1a2535"/>
        <text x="100" y="52" font-size="4" fill="#7ab8e0" text-anchor="middle">3</text>
        <path d="M 30 50 L 50 50 M 70 50 L 90 50" stroke="#7ab8e0" stroke-width="1" stroke-dasharray="2,2" fill="none"/>
        <text x="20" y="70" font-size="3" fill="#8a9ab0" text-anchor="middle">01:20</text>
        <text x="20" y="75" font-size="2.5" fill="#8a9ab0" text-anchor="middle">약 절취</text>
        <text x="60" y="70" font-size="3" fill="#8a9ab0" text-anchor="middle">02:03</text>
        <text x="60" y="75" font-size="2.5" fill="#8a9ab0" text-anchor="middle">재입실</text>
        <text x="100" y="70" font-size="3" fill="#c44820" text-anchor="middle">범행</text>
        <text x="100" y="75" font-size="2.5" fill="#c44820" text-anchor="middle">투입</text>
        <text x="60" y="25" font-size="4" fill="#c44820" font-weight="bold" text-anchor="middle">범행 과정</text>
      </svg>`
    ]
  };
  return data[roleId] ? data[roleId][clueIdx] || '' : '';
}
