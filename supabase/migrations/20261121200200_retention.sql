-- Retención (spec 002): limpieza diaria con Supabase Cron (pg_cron), a las 03:17 de Buenos Aires.
create extension if not exists pg_cron;

select cron.schedule(
  'retencion-diaria',
  '17 6 * * *', -- UTC
  $$
    delete from app.phone_changes where changed_at < now() - interval '12 months'; -- RF-14
    delete from app.guest_attempts where attempted_at < now() - interval '1 day';  -- RF-18b
  $$
);
