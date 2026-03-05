alter table if exists public.foundathon_event_settings
add column if not exists review_admin_emails text[] not null default '{}'::text[];

update public.foundathon_event_settings
set review_admin_emails = '{}'::text[]
where review_admin_emails is null;
