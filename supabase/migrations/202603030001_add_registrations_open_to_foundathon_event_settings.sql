alter table if exists public.foundathon_event_settings
add column if not exists registrations_open boolean not null default true;

update public.foundathon_event_settings
set registrations_open = true
where registrations_open is null;
