-- LOST hackathon schema. DEMO SECURITY ONLY: no row-level security, anyone with the
-- public key can read/write. Do not reuse for a real product.
create table public.sessions (
  id uuid primary key,
  code text not null unique,
  title text not null,
  slide_count int not null check (slide_count > 0),
  current_slide int not null default 1,
  phase text not null default 'presenting' check (phase in ('presenting','reviewing','ended')),
  created_at timestamptz not null default now()
);

create table public.slides (
  session_id uuid not null references public.sessions(id) on delete cascade,
  slide_number int not null check (slide_number > 0),
  image_url text not null,
  extracted_text text not null default '',
  primary key (session_id, slide_number)
);

create table public.members (
  session_id uuid not null references public.sessions(id) on delete cascade,
  student_id text not null,
  name text not null default '',
  joined_at timestamptz not null default now(),
  primary key (session_id, student_id)
);

create table public.signals (
  id uuid primary key,                       -- created in the browser, so retries can't duplicate
  session_id uuid not null references public.sessions(id) on delete cascade,
  slide_number int not null,
  student_id text not null,
  kind text not null check (kind in ('lost','region')),
  categories text[] not null default '{}',
  x float8, y float8, width float8, height float8,
  explanation text,
  created_at timestamptz not null default now()
);

-- One "I'm Lost" per student per slide
create unique index one_lost_per_student_slide
  on public.signals (session_id, slide_number, student_id) where kind = 'lost';

-- Demo access: make sure the browser key can use these tables
alter table public.sessions disable row level security;
alter table public.slides   disable row level security;
alter table public.members  disable row level security;
alter table public.signals  disable row level security;
grant select, insert, update on public.sessions, public.slides, public.members, public.signals to anon, authenticated;

-- Live updates for these tables
alter publication supabase_realtime add table public.sessions, public.signals;

-- Public bucket for slide images, uploadable from the browser
insert into storage.buckets (id, name, public) values ('slides', 'slides', true);
create policy "demo: upload slide images" on storage.objects
  for insert to anon, authenticated with check (bucket_id = 'slides');
