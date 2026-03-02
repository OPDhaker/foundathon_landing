create table if not exists public.foundathon_event_settings (
  event_id uuid primary key,
  problem_statement_cap integer not null check (problem_statement_cap > 0),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.foundathon_event_settings enable row level security;

insert into public.foundathon_event_settings (
  event_id,
  problem_statement_cap
)
values (
  '325b1472-4ce9-412f-8a5e-e4b7153064fa',
  15
)
on conflict (event_id) do nothing;
