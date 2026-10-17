-- Schema scaffold only: RLS enabled, no policies; all client access denied.
-- Implement policies and RPCs in a later migration before integrating UI.
create table public.sessions (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references auth.users(id),
 title text not null,
 join_code text not null unique,
 pdf_path text not null,
 page_count integer not null check (page_count > 0),
 current_slide integer not null default 1 check (current_slide > 0),
 phase text not null default 'presenting' check (phase in ('presenting','reviewing','ended')),
 revision integer not null default 0,
 created_at timestamptz not null default now(),
 check (current_slide <= page_count)
);
create table public.memberships (
 session_id uuid not null references public.sessions(id) on delete cascade,
 user_id uuid not null references auth.users(id),
 joined_at timestamptz not null default now(),
 primary key (session_id,user_id)
);
create table public.slides (
 session_id uuid not null references public.sessions(id) on delete cascade,
 slide_number integer not null check (slide_number > 0),
 extracted_text text not null default '',
 primary key(session_id,slide_number)
);
create table public.signals (
 id uuid primary key default gen_random_uuid(),
 session_id uuid not null,
 slide_number integer not null,
 user_id uuid not null references auth.users(id),
 kind text not null check(kind in ('lost','region')),
 categories text[] not null default '{}',
 x double precision, y double precision, width double precision, height double precision,
 idempotency_key uuid not null,
 created_at timestamptz not null default now(),
 foreign key(session_id,slide_number) references public.slides(session_id,slide_number) on delete cascade,
 foreign key(session_id,user_id) references public.memberships(session_id,user_id),
 unique(user_id,idempotency_key),
 check(categories <@ array['I don’t understand','Need an example','Why does this work?','Other']::text[]),
 check((kind='lost' and x is null and y is null and width is null and height is null and cardinality(categories)=0)
 or (kind='region' and x is not null and y is not null and width is not null and height is not null
 and x>=0 and y>=0 and width>0 and height>0 and x+width<=1 and y+height<=1 and cardinality(categories)>0))
);
create unique index one_lost_per_student_slide on public.signals(session_id,slide_number,user_id) where kind='lost';
create index signals_slide on public.signals(session_id,slide_number);
create table public.saved_items (
 signal_id uuid primary key references public.signals(id) on delete cascade,
 user_id uuid not null references auth.users(id),
 explanation text,
 created_at timestamptz not null default now()
);
-- Service transaction must derive saved_items.user_id from signal owner.
create table public.transcript_segments (
 id uuid primary key default gen_random_uuid(),
 session_id uuid not null,
 slide_number integer not null,
 started_at timestamptz not null,
 ended_at timestamptz not null,
 text text not null,
 check(ended_at >= started_at),
 foreign key(session_id,slide_number) references public.slides(session_id,slide_number) on delete cascade
);
alter table public.sessions enable row level security;
alter table public.memberships enable row level security;
alter table public.slides enable row level security;
alter table public.signals enable row level security;
alter table public.saved_items enable row level security;
alter table public.transcript_segments enable row level security;
-- Enable Realtime for sessions only after member SELECT policies exist.
-- Keep raw signals private; professor summary should use a controlled aggregate endpoint.
