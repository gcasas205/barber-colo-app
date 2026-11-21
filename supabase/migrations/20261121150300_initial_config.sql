-- Configuración inicial de la spec 001 (sección "Definiciones"). Es una migración y no seed.sql
-- porque tiene que existir también en producción. Las franjas son provisorias: Colo las ajusta
-- desde Ajustes (spec 002).

insert into app.schedule_settings
  (id, step_minutes, min_notice_minutes, max_advance_days, approval_min_notice_minutes, contact_whatsapp)
values (1, 15, 30, 30, 120, '+5491138163491')
on conflict (id) do nothing;

insert into app.weekly_ranges (weekday, opens_at, closes_at)
select d, r.opens_at, r.closes_at
from generate_series(1, 6) as d
cross join (values (time '10:00', time '13:00'), (time '14:00', time '20:00')) as r(opens_at, closes_at)
where not exists (select 1 from app.weekly_ranges);

insert into app.services (name, description, duration_minutes, price_cents, counts_for_benefits, position)
select * from (values
  ('Corte', 'Corte de pelo', 30, 1800000, true, 1),
  ('Completo', 'Corte, barba y cejas', 30, 2000000, true, 2),
  ('Claritos', 'Reflejos', 120, 7000000, false, 3)
) as s(name, description, duration_minutes, price_cents, counts_for_benefits, position)
where not exists (select 1 from app.services);
