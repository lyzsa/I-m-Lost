-- Students who pick "Other" type a short reason (contract change: Signal.otherText).
-- Run once in Supabase (Dashboard, SQL Editor, Run) BEFORE deploying code that reads other_text.
-- Safe to run twice. Same 200-character limit as OTHER_TEXT_MAX in src/lib/backend/rules.ts.
alter table public.signals
  add column if not exists other_text text
  check (other_text is null or char_length(other_text) between 1 and 200);
