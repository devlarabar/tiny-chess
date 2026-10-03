create table games (
  id integer generated always as identity primary key,
  guild_id text not null,
  channel_id text not null,
  white_id text not null,
  black_id text not null,
  pgn text not null,
  status text not null default 'active' check (status in ('active', 'won', 'drawn')),
  winner_id text check ((status = 'won') = (winner_id is not null)),
  created_at timestamptz not null default now()
);

create unique index one_active_game_per_channel on games (channel_id) where status = 'active';
