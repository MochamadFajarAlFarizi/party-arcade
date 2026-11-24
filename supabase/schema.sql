-- Jalankan SQL ini di Supabase -> SQL Editor -> New Query -> Run
-- Aman dijalankan ulang (tidak menghapus data skor yang sudah ada!)

create table if not exists public.leaderboard_players (
  player_key text primary key,
  name text not null,
  color text default '#FF5E7E',
  hat text default 'headset',
  total_score integer default 0,
  wins integer default 0,
  games_played integer default 0,
  current_streak integer default 0,
  best_streak integer default 0,
  per_game jsonb default '{}'::jsonb,
  last_played_at timestamptz default now()
);

create table if not exists public.recent_matches (
  id bigserial primary key,
  game_id text not null,
  room_code text,
  winner_name text,
  winner_color text,
  player_count integer,
  created_at timestamptz default now()
);

-- Tabel baru: Riwayat skor per ronde untuk filter Leaderboard HARI INI & MINGGU INI
create table if not exists public.match_scores (
  id bigserial primary key,
  player_key text not null,
  name text not null,
  color text default '#FF5E7E',
  hat text default 'headset',
  game_id text not null,
  score integer default 0,
  won boolean default false,
  played_at timestamptz default now()
);

-- Tabel baru: Akun PIN ringan (kunci nickname + sinkron Emot Custom & Avatar antar HP/PC)
create table if not exists public.player_accounts (
  player_key text primary key,
  name text not null,
  pin_hash text not null,
  color text default '#FF5E7E',
  hat text default 'headset',
  custom_emotes jsonb default '[]'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_leaderboard_total_score
  on public.leaderboard_players (total_score desc, wins desc);

create index if not exists idx_match_scores_played_at
  on public.match_scores (played_at desc);

alter table public.leaderboard_players enable row level security;
alter table public.recent_matches enable row level security;
alter table public.match_scores enable row level security;
alter table public.player_accounts enable row level security;

-- Policies
drop policy if exists "Public read leaderboard" on public.leaderboard_players;
create policy "Public read leaderboard" on public.leaderboard_players for select to anon, authenticated using (true);
drop policy if exists "Public upsert leaderboard" on public.leaderboard_players;
create policy "Public upsert leaderboard" on public.leaderboard_players for insert to anon, authenticated with check (true);
drop policy if exists "Public update leaderboard" on public.leaderboard_players;
create policy "Public update leaderboard" on public.leaderboard_players for update to anon, authenticated using (true) with check (true);

drop policy if exists "Public read recent matches" on public.recent_matches;
create policy "Public read recent matches" on public.recent_matches for select to anon, authenticated using (true);
drop policy if exists "Public insert recent matches" on public.recent_matches;
create policy "Public insert recent matches" on public.recent_matches for insert to anon, authenticated with check (true);

drop policy if exists "Public read match scores" on public.match_scores;
create policy "Public read match scores" on public.match_scores for select to anon, authenticated using (true);
drop policy if exists "Public insert match scores" on public.match_scores;
create policy "Public insert match scores" on public.match_scores for insert to anon, authenticated with check (true);

drop policy if exists "Public read accounts" on public.player_accounts;
create policy "Public read accounts" on public.player_accounts for select to anon, authenticated using (true);
drop policy if exists "Public insert accounts" on public.player_accounts;
create policy "Public insert accounts" on public.player_accounts for insert to anon, authenticated with check (true);
drop policy if exists "Public update accounts" on public.player_accounts;
create policy "Public update accounts" on public.player_accounts for update to anon, authenticated using (true) with check (true);
