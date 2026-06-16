-- Supabase schema for mdevtech Blogs
-- Run this in the Supabase SQL editor after creating the project.

create extension if not exists pgcrypto;

create table if not exists posts (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  body_markdown text not null,
  meta_title text,
  meta_description text,
  focus_keywords text[] default '{}',
  search_intent text,
  canonical_url text,
  json_ld jsonb default '{}'::jsonb,
  faq jsonb default '[]'::jsonb,
  status text not null default 'published' check (status in ('draft', 'published', 'archived')),
  published_at timestamptz default now(),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists posts_slug_idx on posts(slug);
create index if not exists posts_published_at_idx on posts(published_at desc);
create index if not exists posts_focus_keywords_idx on posts using gin(focus_keywords);

create table if not exists seo_keywords (
  id uuid primary key default gen_random_uuid(),
  cluster text not null,
  primary_keyword text not null,
  secondary_keywords text[] default '{}',
  search_intent text,
  audience text,
  difficulty text,
  article_angle text,
  slug text unique not null,
  created_at timestamptz default now()
);

create table if not exists content_versions (
  id uuid primary key default gen_random_uuid(),
  post_id uuid references posts(id) on delete cascade,
  version int not null,
  -- Full original post JSON. This is the durable restore source if GitHub/AWS is unavailable.
  payload jsonb not null,
  created_at timestamptz default now()
);

create index if not exists content_versions_post_id_idx on content_versions(post_id);
create index if not exists content_versions_post_version_idx on content_versions(post_id, version desc);

create table if not exists publish_events (
  id uuid primary key default gen_random_uuid(),
  post_id uuid references posts(id) on delete cascade,
  event_type text not null,
  details jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create index if not exists publish_events_post_id_idx on publish_events(post_id);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql set search_path = '';

drop trigger if exists posts_updated_at on posts;
create trigger posts_updated_at
before update on posts
for each row execute function set_updated_at();

-- Data API grants and RLS
alter default privileges for role postgres in schema public
  revoke select, insert, update, delete on tables from anon, authenticated;

revoke all privileges on table posts from anon, authenticated;
revoke all privileges on table seo_keywords from anon, authenticated;
revoke all privileges on table content_versions from anon, authenticated;
revoke all privileges on table publish_events from anon, authenticated;

grant select on table posts to anon, authenticated;
grant select, insert, update, delete on table posts to service_role;
grant select, insert, update, delete on table seo_keywords to service_role;
grant select, insert, update, delete on table content_versions to service_role;
grant select, insert, update, delete on table publish_events to service_role;

alter table posts enable row level security;
alter table seo_keywords enable row level security;
alter table content_versions enable row level security;
alter table publish_events enable row level security;

drop policy if exists "Published posts are readable by everyone" on posts;
drop policy if exists "Service role can manage posts" on posts;
drop policy if exists "Service role can manage keywords" on seo_keywords;
drop policy if exists "Service role can manage versions" on content_versions;
drop policy if exists "Service role can manage publish events" on publish_events;

create policy "Published posts are readable by everyone"
on posts for select
to anon, authenticated
using (status = 'published');

create policy "Service role can manage posts"
on posts for all
to service_role
using (true)
with check (true);

create policy "Service role can manage keywords"
on seo_keywords for all
to service_role
using (true)
with check (true);

create policy "Service role can manage versions"
on content_versions for all
to service_role
using (true)
with check (true);

create policy "Service role can manage publish events"
on publish_events for all
to service_role
using (true)
with check (true);
