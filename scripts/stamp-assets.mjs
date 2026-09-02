#!/usr/bin/env node
// 공용 자산(main.js, game-common.js, CSS)의 내용 해시를 HTML의 ?v= 쿼리에 새긴다.
//
// index.html의 카드 속성과 main.js의 필터 로직처럼, 공용 자산과 HTML은 서로 짝이
// 맞아야 동작한다. 버전을 손으로 올리다 보면 자산만 바뀌고 쿼리는 그대로 남아
// 브라우저가 옛 자산을 캐시에서 꺼내 쓰고 기능이 통째로 죽는다.
// 공용 자산을 수정한 뒤에는 반드시 이 스크립트를 실행할 것.
//
//   node scripts/stamp-assets.mjs          변경 사항 적용
//   node scripts/stamp-assets.mjs --check  CI용. 갱신이 필요하면 종료 코드 1

import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const checkOnly = process.argv.includes('--check');

const ASSETS = [
    'scripts/main.js',
    'scripts/game-common.js',
    'styles/main.css',
    'styles/game-common.css',
    // 크라임씬 전용 자산. 같은 폴더에서 상대경로로 불러 쓰는데,
    // 버전이 없어 데이터를 고쳐도 브라우저가 옛 파일을 계속 쓰는 일이 있었다.
    'games/crime-scene-data.js',
    'games/crime-scene-engine.js',
    'games/crime-scene-svgs.js',
    'games/crime-scene-styles.css',
];

const hashes = new Map(
    ASSETS.map((rel) => [
        rel.split('/').pop(),
        createHash('sha1').update(readFileSync(join(root, rel))).digest('hex').slice(0, 8),
    ])
);

const pages = [
    'index.html',
    ...readdirSync(join(root, 'games')).filter((f) => f.endsWith('.html')).map((f) => `games/${f}`),
];

let changed = [];
for (const page of pages) {
    const path = join(root, page);
    const before = readFileSync(path, 'utf8');
    let after = before;
    for (const [file, hash] of hashes) {
        // ?v=... 가 이미 있든 없든 현재 해시로 맞춘다
        const pattern = new RegExp(`((?:src|href)="[^"]*${file.replace('.', '\\.')})(\\?v=[^"]*)?"`, 'g');
        after = after.replace(pattern, `$1?v=${hash}"`);
    }
    if (after !== before) {
        changed.push(page);
        if (!checkOnly) writeFileSync(path, after);
    }
}

for (const [file, hash] of hashes) console.log(`  ${file.padEnd(20)} v=${hash}`);

if (checkOnly) {
    if (changed.length) {
        console.error(`\n✗ 버전 스탬프가 오래되었습니다 (${changed.length}개 파일). node scripts/stamp-assets.mjs 를 실행하세요.`);
        process.exit(1);
    }
    console.log('\n✓ 버전 스탬프 최신');
} else {
    console.log(changed.length ? `\n✓ ${changed.length}개 페이지 갱신` : '\n✓ 이미 최신');
}
