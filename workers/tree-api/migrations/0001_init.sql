-- 어드벤트 트리 서버판 (#72 확장 ④)
-- 메시지는 gifts.message에만 있고, 공개 조회에는 절대 나가지 않는다.

CREATE TABLE trees (
    id             TEXT PRIMARY KEY,
    token_hash     TEXT    NOT NULL,              -- 주인 토큰의 SHA-256 (원문은 저장하지 않음)
    owner          TEXT    NOT NULL,
    mode           TEXT    NOT NULL CHECK (mode IN ('solo', 'couple', 'forest')),
    year           INTEGER NOT NULL,
    state          TEXT    NOT NULL,              -- 주인 기기의 트리 상태 JSON (16KB 이하)
    rev            INTEGER NOT NULL DEFAULT 1,
    partner_id     TEXT,
    forest_id      TEXT,
    pair_code_hash TEXT,
    pair_code_exp  INTEGER,
    created_at     INTEGER NOT NULL,
    updated_at     INTEGER NOT NULL
);
CREATE INDEX trees_forest ON trees (forest_id);
CREATE INDEX trees_year ON trees (year);

CREATE TABLE gifts (
    id         TEXT PRIMARY KEY,
    tree_id    TEXT    NOT NULL,
    type       TEXT    NOT NULL,
    sender     TEXT    NOT NULL,
    message    TEXT    NOT NULL DEFAULT '',
    created_at INTEGER NOT NULL
);
CREATE INDEX gifts_tree ON gifts (tree_id, created_at);

CREATE TABLE forests (
    id         TEXT PRIMARY KEY,
    name       TEXT    NOT NULL,
    year       INTEGER NOT NULL,
    created_at INTEGER NOT NULL
);

-- 하루 횟수 제한. key = 종류:IP해시:날짜(KST)
CREATE TABLE limits (
    key   TEXT PRIMARY KEY,
    day   TEXT    NOT NULL,
    count INTEGER NOT NULL
);
CREATE INDEX limits_day ON limits (day);
