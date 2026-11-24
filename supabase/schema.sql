-- Jalankan SQL ini di Supabase -> SQL Editor -> New Query -> Run

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

-- Index untuk query leaderboard super cepat
create index if not exists idx_leaderboard_total_score
  on public.leaderboard_players (total_score desc, wins desc);

-- Aktifkan RLS + izinkan akses API dari Vercel
alter table public.leaderboard_players enable row level security;
alter table public.recent_matches enable row level security;

drop policy if exists "Public read leaderboard" on public.leaderboard_players;
create policy "Public read leaderboard" on public.leaderboard_players
  for select to anon, authenticated using (true);

drop policy if exists "Public upsert leaderboard" on public.leaderboard_players;
create policy "Public upsert leaderboard" on public.leaderboard_players
  for insert to anon, authenticated with check (true);

drop policy if exists "Public update leaderboard" on public.leaderboard_players;
create policy "Public update leaderboard" on public.leaderboard_players
  for update to anon, authenticated using (true) with check (true);

drop policy if exists "Public read recent matches" on public.recent_matches;
create policy "Public read recent matches" on public.recent_matches
  for select to anon, authenticated using (true);

drop policy if exists "Public insert recent matches" on public.recent_matches;
create policy "Public insert recent matches" on public.recent_matches
  for insert to anon, authenticated with check (true);
