-- 다녀간 발자국 (#102): 친구가 트리를 구경하고 "다녀갔어요"를 누르면 하루 한 번 남는다.
-- vkey는 방문자 기기의 무작위 아이디(없으면 IP)를 해시한 값이라 누가 누군지 서버도 알 수 없다.
CREATE TABLE visits (
    tree_id    TEXT    NOT NULL,
    day        TEXT    NOT NULL,              -- KST 날짜 YYYY-MM-DD
    vkey       TEXT    NOT NULL,
    nick       TEXT    NOT NULL DEFAULT '',
    created_at INTEGER NOT NULL,
    PRIMARY KEY (tree_id, day, vkey)
);
