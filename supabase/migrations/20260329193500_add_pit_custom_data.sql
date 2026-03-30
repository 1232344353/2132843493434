alter table public.pit_scout_entries
add column if not exists custom_data jsonb;
