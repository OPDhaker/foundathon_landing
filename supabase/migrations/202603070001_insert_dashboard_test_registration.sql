-- Seeds a fake accepted registration for the maintainer account so the
-- dashboard can be exercised end-to-end in local/dev environments.
--
-- Assumption: the target auth account uses opdhaker2007@gmail.com.
-- If your local Supabase auth user uses a different email, update the value
-- below before applying this migration.
do $$
declare
  v_target_email constant text := 'opdhaker2007@gmail.com';
  v_target_user_id uuid;
begin
  select users.id
  into v_target_user_id
  from auth.users as users
  where lower(users.email) = lower(v_target_email)
  order by users.created_at desc
  limit 1;

  if v_target_user_id is null then
    raise notice
      'Skipping dashboard test registration seed because no auth.users row exists for %.',
      v_target_email;
  else
    delete from public.eventsregistrations
    where event_id = '325b1472-4ce9-412f-8a5e-e4b7153064fa'::uuid
      and application_id = v_target_user_id
      and coalesce(details ->> 'isTestEntry', 'false') = 'true';

    insert into public.eventsregistrations (
      event_id,
      event_title,
      application_id,
      details,
      registration_email,
      is_team_entry,
      is_approved
    )
    values (
      '325b1472-4ce9-412f-8a5e-e4b7153064fa'::uuid,
      'Foundathon 3.0',
      v_target_user_id,
      jsonb_build_object(
        'teamType', 'non_srm',
        'teamName', 'Dashboard Demo Team',
        'collegeName', 'Foundathon Test University',
        'isClub', true,
        'clubName', 'Founders Club QA',
        'lead', jsonb_build_object(
          'name', 'Uttam Demo',
          'collegeId', 'FTU-LEAD-001',
          'collegeEmail', v_target_email,
          'contact', 9876543210
        ),
        'members', jsonb_build_array(
          jsonb_build_object(
            'name', 'Demo Member One',
            'collegeId', 'FTU-MEM-002',
            'collegeEmail', 'member.one@example.com',
            'contact', 9876543211
          ),
          jsonb_build_object(
            'name', 'Demo Member Two',
            'collegeId', 'FTU-MEM-003',
            'collegeEmail', 'member.two@example.com',
            'contact', 9876543212
          )
        ),
        'problemStatementCap', 15,
        'problemStatementId', 'ps-03',
        'problemStatementLockedAt', '2026-03-07T00:00:00.000Z',
        'problemStatementTitle', 'Localized AI Skills Training Platform',
        'presentationFileName', 'dashboard-demo-submission.pptx',
        'presentationFileSizeBytes', 1048576,
        'presentationMimeType', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'presentationPublicUrl', 'https://example.com/foundathon/dashboard-demo-submission.pptx',
        'presentationStoragePath', 'registrations/dashboard-demo/submission.pptx',
        'presentationUploadedAt', '2026-03-07T00:00:00.000Z',
        'isTestEntry', true,
        'testEntryLabel', 'dashboard-demo'
      ),
      v_target_email,
      true,
      'ACCEPTED'
    );
  end if;
end;
$$;
