-- Trade Info — AI analyst & autonomous news monitor. Run AFTER supabase/schema.sql (safe to re-run).
-- Shared tables (news_*, event_*, ai_event_analyses): readable by signed-in users, written ONLY by the server (service role).
-- Personal tables (preferences, notifications, briefings, conversations, messages): owner only (RLS).

create table if not exists public.news_events (
  id uuid primary key default gen_random_uuid(),
  key text,                                  -- in-run cluster hash (diagnostics only)
  title text not null,
  category text not null,
  country text,
  importance text not null check (importance in ('critical','high','medium','low')),
  status text not null check (status in ('confirmed','developing','unverified')),
  impact_score int not null default 0,
  assets text[] not null default '{}',
  source_count int not null default 1,
  first_seen timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  latest_published timestamptz,
  notified boolean not null default false,
  analyzed_at timestamptz,
  analysis_origin text check (analysis_origin in ('ai','rules'))
);
create index if not exists news_events_seen_idx on public.news_events(last_seen desc);
create index if not exists news_events_imp_idx on public.news_events(importance, last_seen desc);

create table if not exists public.news_articles (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references public.news_events(id) on delete set null,
  url text not null unique,
  title text not null,
  summary text,
  source text not null,
  published_at timestamptz not null,
  country text,
  category text,
  fetched_at timestamptz not null default now()
);
create index if not exists news_articles_event_idx on public.news_articles(event_id);
create index if not exists news_articles_pub_idx on public.news_articles(published_at desc);

create table if not exists public.event_sources (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.news_events(id) on delete cascade,
  source text not null,
  url text not null,
  title text,
  published_at timestamptz,
  unique (event_id, url)
);

create table if not exists public.event_asset_relationships (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.news_events(id) on delete cascade,
  asset_id text not null check (char_length(asset_id) <= 20),
  directness text not null check (directness in ('direct','indirect')),
  impact text not null check (impact in ('positive','negative','mixed','uncertain','none')),
  reasoning text not null,
  evidence jsonb not null default '[]',
  confidence numeric(3,2) not null check (confidence between 0 and 1),
  origin text not null default 'rules' check (origin in ('ai','rules')),
  created_at timestamptz not null default now(),
  unique (event_id, asset_id)
);
create index if not exists ear_asset_idx on public.event_asset_relationships(asset_id, created_at desc);

create table if not exists public.ai_event_analyses (
  event_id uuid primary key references public.news_events(id) on delete cascade,
  model text not null,
  analysis jsonb not null check (pg_column_size(analysis) < 100000),
  created_at timestamptz not null default now()
);

create table if not exists public.monitoring_jobs (
  id uuid primary key default gen_random_uuid(),
  job text not null,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null default 'running' check (status in ('running','ok','error')),
  stats jsonb not null default '{}',
  error text
);
create index if not exists monitoring_jobs_idx on public.monitoring_jobs(job, started_at desc);

create table if not exists public.user_monitoring_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  enabled boolean not null default true,
  in_app boolean not null default true,
  email boolean not null default false,
  briefing boolean not null default true,
  min_importance text not null default 'high' check (min_importance in ('critical','high','medium','low')),
  assets text[] not null default '{}' check (cardinality(assets) <= 60),
  categories text[] not null default '{}' check (cardinality(categories) <= 20),
  countries text[] not null default '{}' check (cardinality(countries) <= 60),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_id uuid not null references public.news_events(id) on delete cascade,
  title text not null,
  body text,
  importance text not null,
  assets text[] not null default '{}',
  created_at timestamptz not null default now(),
  read_at timestamptz,
  unique (user_id, event_id)                 -- one notification per event per user: no repeats
);
create index if not exists user_notifications_idx on public.user_notifications(user_id, created_at desc);

create table if not exists public.daily_briefings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null,
  content jsonb not null check (pg_column_size(content) < 200000),
  created_at timestamptz not null default now(),
  unique (user_id, day)
);

create table if not exists public.ai_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'New chat' check (char_length(title) <= 120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists ai_conversations_idx on public.ai_conversations(user_id, updated_at desc);

create table if not exists public.ai_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.ai_conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user','assistant')),
  content text not null check (char_length(content) <= 20000),
  sources jsonb not null default '[]',
  meta jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index if not exists ai_messages_idx on public.ai_messages(conversation_id, created_at);
create index if not exists ai_messages_user_idx on public.ai_messages(user_id, created_at desc);

-- ---------- RLS ----------
do $$
declare t text;
begin
  foreach t in array array['news_events','news_articles','event_sources','event_asset_relationships','ai_event_analyses','monitoring_jobs','user_monitoring_preferences','user_notifications','daily_briefings','ai_conversations','ai_messages']
  loop execute format('alter table public.%I enable row level security', t); end loop;
  foreach t in array array['user_monitoring_preferences','user_notifications','daily_briefings','ai_conversations','ai_messages']
  loop
    execute format('drop policy if exists %I on public.%I', t || ': own rows', t);
    execute format('create policy %I on public.%I for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid())', t || ': own rows', t);
  end loop;
  foreach t in array array['news_events','news_articles','event_sources','event_asset_relationships','ai_event_analyses']
  loop
    execute format('drop policy if exists %I on public.%I', t || ': read', t);
    execute format('create policy %I on public.%I for select to authenticated using (true)', t || ': read', t);
  end loop;
end $$;

-- A message may only be added to the user's own conversation.
drop policy if exists "ai_messages: own conversation" on public.ai_messages;
create policy "ai_messages: own conversation" on public.ai_messages as restrictive for all to authenticated
  using (exists (select 1 from public.ai_conversations c where c.id = conversation_id and c.user_id = auth.uid()))
  with check (exists (select 1 from public.ai_conversations c where c.id = conversation_id and c.user_id = auth.uid()));

-- ---------- Privileges ----------
revoke all on public.news_events, public.news_articles, public.event_sources, public.event_asset_relationships, public.ai_event_analyses, public.monitoring_jobs,
  public.user_monitoring_preferences, public.user_notifications, public.daily_briefings, public.ai_conversations, public.ai_messages from anon;
-- shared data: read-only for users; monitoring_jobs: server only
revoke insert, update, delete on public.news_events, public.news_articles, public.event_sources, public.event_asset_relationships, public.ai_event_analyses from authenticated;
revoke all on public.monitoring_jobs from authenticated;
grant select on public.news_events, public.news_articles, public.event_sources, public.event_asset_relationships, public.ai_event_analyses to authenticated;
grant select, insert, update, delete on public.user_monitoring_preferences, public.user_notifications, public.daily_briefings, public.ai_conversations, public.ai_messages to authenticated;
-- the server (service role) bypasses RLS but still needs table privileges
grant all on all tables in schema public to service_role;

-- ---------- Defaults for new + existing users ----------
create or replace function public.handle_new_user_monitoring() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.user_monitoring_preferences(user_id) values (new.id) on conflict do nothing;
  return new;
end $$;
drop trigger if exists on_auth_user_monitoring on auth.users;
create trigger on_auth_user_monitoring after insert on auth.users for each row execute function public.handle_new_user_monitoring();
insert into public.user_monitoring_preferences(user_id) select id from auth.users on conflict do nothing;
