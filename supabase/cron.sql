-- Optional: run batch processing inside Supabase with pg_cron, independent of
-- the web host. Enable the pg_cron extension (Database → Extensions) first,
-- then run this in the SQL editor. Email delivery still happens through the
-- app's /api/cron/process-batches endpoint (or the next app-triggered flush).

select cron.schedule(
  'groupdrive-process-due-batches',
  '*/10 * * * *',
  $$ select public.process_due_batches(); $$
);

-- To remove: select cron.unschedule('groupdrive-process-due-batches');
