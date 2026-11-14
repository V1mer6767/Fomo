-- =====================================================================
-- Trade Info — Supabase schema (run once in the Supabase SQL Editor)
-- Every private table: user_id -> auth.users(id) ON DELETE CASCADE + Row Level Security.
-- =====================================================================

-- ---------- profiles ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '' check (char_length(display_name) <= 50),
  avatar_url text check (avatar_url is null or (avatar_url ~ '^data:image/(png|jpeg|webp);base64,' and char_length(avatar_url) < 60000)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- user_preferences ----------
create table if not exists public.user_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  theme text not null default 'dark' check (theme in ('dark','light')),
  default_asset text not null default 'BTC' check (char_length(default_asset) between 1 and 20),
  news_sort text not null default 'new' check (news_sort in ('new','impact')),
  extra jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- ---------- watchlists (kind: watch | favorite; crypto/forex split is derived from the asset) ----------
create table if not exists public.watchlists (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  asset_id text not null check (char_length(asset_id) between 1 and 20),
  kind text not null default 'watch' check (kind in ('watch','favorite')),
  position int not null default 0,
  created_at timestamptz not null default now(),
  unique (user_id, asset_id, kind)
);
create index if not exists watchlists_user_idx on public.watchlists(user_id, kind, position);

-- ---------- saved_news ----------
create table if not exists public.saved_news (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_id text not null check (char_length(event_id) <= 64),
  title text not null check (char_length(title) <= 500),
  url text check (url is null or char_length(url) <= 2000),
  source text check (source is null or char_length(source) <= 200),
  summary text check (summary is null or char_length(summary) <= 2000),
  category text check (category is null or char_length(category) <= 40),
  published_at timestamptz,
  saved_at timestamptz not null default now(),
  unique (user_id, event_id)
);
create index if not exists saved_news_user_idx on public.saved_news(user_id, saved_at desc);

-- ---------- saved_analyses ----------
create table if not exists public.saved_analyses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_id text not null check (char_length(event_id) <= 64),
  title text not null check (char_length(title) <= 500),
  analysis jsonb not null check (pg_column_size(analysis) < 100000),
  saved_at timestamptz not null default now(),
  unique (user_id, event_id)
);
create index if not exists saved_analyses_user_idx on public.saved_analyses(user_id, saved_at desc);

-- ---------- virtual portfolio (simulation only: virtual money) ----------
create table if not exists public.virtual_portfolios (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  cash numeric(20,2) not null default 100000 check (cash >= 0),
  start_cash numeric(20,2) not null default 100000 check (start_cash > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.portfolio_assets (
  id uuid primary key default gen_random_uuid(),
  portfolio_id uuid not null references public.virtual_portfolios(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  asset_id text not null check (char_length(asset_id) between 1 and 20),
  qty numeric(30,10) not null check (qty >= 0),
  avg_price numeric(30,10) not null check (avg_price >= 0),
  unique (portfolio_id, asset_id)
);
create table if not exists public.portfolio_trades (
  id uuid primary key default gen_random_uuid(),
  portfolio_id uuid not null references public.virtual_portfolios(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  asset_id text not null check (char_length(asset_id) between 1 and 20),
  side text not null check (side in ('buy','sell')),
  qty numeric(30,10) not null check (qty > 0),
  price numeric(30,10) not null check (price >= 0),
  executed_at timestamptz not null default now()
);
create index if not exists portfolio_trades_idx on public.portfolio_trades(portfolio_id, executed_at desc);
create table if not exists public.portfolio_history (
  portfolio_id uuid not null references public.virtual_portfolios(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  t timestamptz not null,
  value numeric(20,2) not null,
  primary key (portfolio_id, t)
);

-- ---------- user_alerts / alert_log ----------
create table if not exists public.user_alerts (
  id text not null check (char_length(id) <= 64),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('price-above','price-below','move-24h','news-keyword','high-importance')),
  asset_id text check (asset_id is null or char_length(asset_id) <= 20),
  value numeric(30,10),
  keyword text check (keyword is null or char_length(keyword) <= 100),
  enabled boolean not null default true,
  fired boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (user_id, id)
);
create table if not exists public.alert_log (
  id text not null check (char_length(id) <= 80),
  user_id uuid not null references auth.users(id) on delete cascade,
  text text not null check (char_length(text) <= 500),
  link text check (link is null or char_length(link) <= 300),
  at timestamptz not null default now(),
  primary key (user_id, id)
);

-- ---------- Row Level Security: users can only touch their own rows ----------
alter table public.profiles enable row level security;
create policy "profiles: own row" on public.profiles for all to authenticated using (id = auth.uid()) with check (id = auth.uid());

do $$
declare t text;
begin
  foreach t in array array['user_preferences','watchlists','saved_news','saved_analyses','virtual_portfolios','portfolio_assets','portfolio_trades','portfolio_history','user_alerts','alert_log']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy %I on public.%I for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid())', t || ': own rows', t);
  end loop;
end $$;

-- A user may only attach portfolio rows to their OWN portfolio.
create policy "portfolio_assets: own portfolio" on public.portfolio_assets as restrictive for all to authenticated
  using (exists (select 1 from public.virtual_portfolios p where p.id = portfolio_id and p.user_id = auth.uid()))
  with check (exists (select 1 from public.virtual_portfolios p where p.id = portfolio_id and p.user_id = auth.uid()));
create policy "portfolio_trades: own portfolio" on public.portfolio_trades as restrictive for all to authenticated
  using (exists (select 1 from public.virtual_portfolios p where p.id = portfolio_id and p.user_id = auth.uid()))
  with check (exists (select 1 from public.virtual_portfolios p where p.id = portfolio_id and p.user_id = auth.uid()));
create policy "portfolio_history: own portfolio" on public.portfolio_history as restrictive for all to authenticated
  using (exists (select 1 from public.virtual_portfolios p where p.id = portfolio_id and p.user_id = auth.uid()))
  with check (exists (select 1 from public.virtual_portfolios p where p.id = portfolio_id and p.user_id = auth.uid()));

-- Anonymous (not logged in) role gets nothing.
revoke all on all tables in schema public from anon;

-- ---------- New user bootstrap: profile, preferences, portfolio, default watchlist ----------
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
    values (new.id, left(coalesce(nullif(new.raw_user_meta_data->>'full_name',''), nullif(new.raw_user_meta_data->>'name',''), split_part(new.email,'@',1), ''), 50));
  insert into public.user_preferences (user_id) values (new.id);
  insert into public.virtual_portfolios (user_id) values (new.id);
  insert into public.watchlists (user_id, asset_id, kind, position)
    select new.id, a, 'watch', row_number() over () from unnest(array['BTC','ETH','SOL','EURUSD','GBPUSD','XAU','SPX']) as a;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- Keep updated_at fresh
create or replace function public.touch_updated_at() returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end $$;
drop trigger if exists profiles_touch on public.profiles; create trigger profiles_touch before update on public.profiles for each row execute function public.touch_updated_at();
drop trigger if exists prefs_touch on public.user_preferences; create trigger prefs_touch before update on public.user_preferences for each row execute function public.touch_updated_at();
drop trigger if exists portfolio_touch on public.virtual_portfolios; create trigger portfolio_touch before update on public.virtual_portfolios for each row execute function public.touch_updated_at();
