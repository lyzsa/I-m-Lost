-- Instructor pen strokes on the live slide (contract: Annotation in src/lib/types.ts).
-- Run once in Supabase (Dashboard, SQL Editor, Run) BEFORE deploying code that reads annotations.
-- DEMO SECURITY ONLY, like 0001: no row-level security.
create table public.annotations (
  id uuid primary key,                -- made in the browser, so a retried save can't duplicate
  session_id uuid not null references public.sessions(id) on delete cascade,
  slide_number int not null check (slide_number > 0),
  points jsonb not null,              -- [{"x":0.1,"y":0.2}, ...] fractions of the slide
  color text not null,
  width float8 not null,
  removed_at timestamptz,             -- soft delete: removals arrive as UPDATE events, which can be filtered by session
  created_at timestamptz not null default now()
);
create index annotations_slide on public.annotations (session_id, slide_number);

alter table public.annotations disable row level security;
grant select, insert, update on public.annotations to anon, authenticated;
alter publication supabase_realtime add table public.annotations;
