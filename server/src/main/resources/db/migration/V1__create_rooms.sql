create table rooms (
    id         varchar(22) primary key,
    game       varchar(40) not null,
    name       varchar(40) not null,
    created_at timestamptz not null,
    expires_at timestamptz not null
);

create index rooms_expires_at_idx on rooms (expires_at);

create table members (
    id         varchar(22) primary key,
    room_id    varchar(22) not null references rooms (id) on delete cascade,
    nickname   varchar(20) not null,
    token_hash varchar(64) not null unique,
    host       boolean     not null,
    joined_at  timestamptz not null,
    unique (room_id, nickname)
);
