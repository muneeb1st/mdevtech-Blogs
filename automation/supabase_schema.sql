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
  payload jsonb not null,
  created_at timestamptz default now()
);

create table if not exists publish_events (
  id uuid primary key default gen_random_uuid(),
  post_id uuid references posts(id) on delete cascade,
  event_type text not null,
  details jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger posts_updated_at
before update on posts
for each row execute function set_updated_at();

-- RLS
alter table posts enable row level security;
alter table seo_keywords enable row level security;
alter table content_versions enable row level security;
alter table publish_events enable row level security;

create policy "Published posts are readable by everyone"
on posts for select
using (status = 'published');

create policy "Service role can manage posts"
on posts for all
using (true)
with check (true);

create policy "Service role can manage keywords"
on seo_keywords for all
using (true)
with check (true);

create policy "Service role can manage versions"
on content_versions for all
using (true)
with check (true);

create policy "Service role can manage publish events"
on publish_events for all
using (true)
with check (true);
