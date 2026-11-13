-- Optional: sync user data (watchlist, alerts, portfolio) with Supabase. The app works without it (localStorage).
create table if not exists user_state (
  user_id uuid references auth.users on delete cascade,
  key text not null,
  value jsonb not null,
  updated_at timestamptz default now(),
  primary key (user_id, key)
);
alter table user_state enable row level security;
create policy "own rows" on user_state for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
