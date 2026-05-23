// Script to add data-players and data-time attributes to game cards in index.html
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'index.html');
let html = fs.readFileSync(filePath, 'utf-8');

// Map: href -> { players, time }
const meta = {
  'games/solitary-memory.html': { p: '1', t: '15' },
  'games/chrono-lock.html': { p: '1', t: '15' },
  'games/nonogram.html': { p: '1', t: '10' },
  'games/pitch-perfect.html': { p: '1', t: '5' },
  'games/omok.html': { p: '2', t: '10' },
  'games/ladder.html': { p: '2+', t: '1' },
  'games/roulette.html': { p: '2+', t: '1' },
  'games/menu.html': { p: '1+', t: '1' },
  'games/lucky-draw.html': { p: '2+', t: '1' },
  'games/todo.html': { p: '1+', t: '1' },
  'games/color-matcher.html': { p: '2+', t: '5' },
  'games/pulse-tap.html': { p: '2+', t: '5' },
  'games/photo-hunter.html': { p: '2+', t: '5' },
  'games/shake-it.html': { p: '2+', t: '1' },
  'games/bingo-host.html': { p: '2+', t: '10' },
  'games/card-battle.html': { p: '2', t: '5' },
  'games/orchestra.html': { p: '2+', t: '5' },
  'games/qr-garden.html': { p: '2+', t: '5' },
  'games/royal-secret-letter.html': { p: '2', t: '15' },
  'games/neon-dual.html': { p: '2', t: '5' },
  'games/critical-flight.html': { p: '2', t: '15' },
  'games/luminous-lines.html': { p: '2', t: '15' },
  'games/pocket-quilt.html': { p: '2', t: '20' },
  'games/bomb-defusal.html': { p: '2', t: '10' },
  'games/arena-of-legends.html': { p: '2', t: '20' },
  'games/tower-of-gods.html': { p: '2', t: '15' },
  'games/agent-codebreaker.html': { p: '2', t: '15' },
  'games/project-lethe.html': { p: '2', t: '15' },
  'games/shadow-syndicate.html': { p: '2', t: '20' },
  'games/starlight-tuners.html': { p: '2', t: '15' },
  'games/blackjack-duel.html': { p: '2', t: '10' },
  'games/reaction.html': { p: '1', t: '1' },
  'games/whack.html': { p: '1', t: '3' },
  'games/duo-reaction.html': { p: '2', t: '3' },
  'games/gyro-balance.html': { p: '1', t: '5' },
  'games/breakout.html': { p: '1', t: '5' },
  'games/2048.html': { p: '1', t: '10' },
  'games/minesweeper.html': { p: '1', t: '10' },
  'games/sudoku.html': { p: '1', t: '15' },
  'games/memory.html': { p: '1', t: '5' },
  'games/snake.html': { p: '1', t: '5' },
  'games/stroop.html': { p: '1', t: '3' },
  'games/sequence.html': { p: '1', t: '5' },
  'games/math.html': { p: '1', t: '1' },
  'games/sliding-puzzle.html': { p: '1', t: '5' },
  'games/solar.html': { p: '1', t: '5' },
  'games/neon.html': { p: '1', t: '5' },
  'games/plasma.html': { p: '1', t: '5' },
  'games/stack3d.html': { p: '1', t: '5' },
  'games/particle-sim.html': { p: '1', t: '5' },
  'games/fluid-art.html': { p: '2+', t: '5' },
  'games/fireworks.html': { p: '1', t: '5' },
  'games/ecosystem-sim.html': { p: '1', t: '10' },
  'games/relics-of-greed.html': { p: '3', t: '15' },
  'games/sketch-relay.html': { p: '3+', t: '10' },
  'games/two-truths.html': { p: '3+', t: '15' },
  'games/fermi-estimation.html': { p: '2+', t: '15' },
  'games/crime-scene.html': { p: '4+', t: '60' },
  'games/relay-drawing.html': { p: '3+', t: '5' },
  'games/fake-taste.html': { p: '4+', t: '15' },
  'games/silent-auction.html': { p: '3+', t: '15' },
  'games/letter-glitch.html': { p: '3+', t: '10' },
  'games/liar-amplifier.html': { p: '3+', t: '10' },
  'games/betrayal.html': { p: '3+', t: '15' },
  'games/hundred.html': { p: '3+', t: '10' },
  'games/bluff-hunt.html': { p: '3+', t: '15' },
  'games/memory-contam.html': { p: '3+', t: '10' },
  'games/imposter.html': { p: '4+', t: '10' },
  'games/blind-sketch.html': { p: '2+', t: '5' },
  'games/tick-tock.html': { p: '3+', t: '10' },
  'games/memory-block.html': { p: '2+', t: '5' },
  'games/champagne-pop.html': { p: '3+', t: '5' },
  'games/word-chain.html': { p: '3+', t: '5' },
  'games/face-mimic.html': { p: '2+', t: '5' },
  'games/maze-weaver.html': { p: '2+', t: '10' },
  'games/lucky-box.html': { p: '2+', t: '5' },
  'games/sky-dogfight.html': { p: '2', t: '5' },
};

let count = 0;
for (const [href, { p, t }] of Object.entries(meta)) {
  const pattern = `href="${href}" class="game-card"`;
  if (html.includes(pattern)) {
    html = html.replace(pattern, `href="${href}" class="game-card" data-players="${p}" data-time="${t}"`);
    count++;
  }
}

// Fix 탐욕의 유적 description: 2인 → 3인
html = html.replace(
  '한정된 자원을 두고 벌이는 2인 심리 블러핑 보드게임',
  '한정된 자원을 두고 벌이는 3인 심리 블러핑 보드게임'
);

fs.writeFileSync(filePath, html, 'utf-8');
console.log(`Updated ${count} game cards with data-players and data-time attributes.`);
console.log('Fixed 탐욕의 유적 description (2인→3인).');
