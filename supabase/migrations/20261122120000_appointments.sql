-- Turnos (spec 004; plan §1). RF-8, RF-12, RF-20, RF-22, RF-29, RF-31, RNF-2, RNF-3.

create type app.appointment_status as enum ('reserved', 'confirmed', 'cancelled', 'cancelled_late');

create table app.appointments (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references app.customers (id) on delete restrict,
  service_id smallint not null references app.services (id) on delete restrict,
  period tstzrange not null,
  status app.appointment_status not null,
  -- RN-06b: el precio del servicio al reservar; no cambia aunque Colo cambie el precio después.
  price_cents integer not null check (price_cents > 0),
  customer_reschedules smallint not null default 0 check (customer_reschedules between 0 and 2),
  booked_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint appointments_period_valid check (not isempty(period) and lower_inc(period) and not upper_inc(period)
    and lower(period) is not null and upper(period) is not null),
  -- RF-12, RNF-2: la base nunca deja dos turnos activos superpuestos, aunque reserven a la vez.
  constraint appointments_no_overlap exclude using gist (period with &&) where (status in ('reserved', 'confirmed'))
);
create index appointments_customer_idx on app.appointments (customer_id);
create index appointments_service_idx on app.appointments (service_id);
comment on table app.appointments is 'Turnos (spec 004). Activos: reserved y confirmed.';

create type app.appointment_event_kind as enum ('booked', 'cancelled', 'rescheduled');
create type app.actor_kind as enum ('customer', 'barber');

-- RF-29 (I-7): todo cambio deja un registro con actor y fecha. El aviso al cliente de lo que hizo Colo
-- (RF-20) sale de acá.
create table app.appointment_events (
  id bigint generated always as identity primary key,
  appointment_id uuid not null references app.appointments (id) on delete cascade,
  at timestamptz not null default now(),
  actor app.actor_kind not null,
  actor_user_id uuid references auth.users (id) on delete set null,
  kind app.appointment_event_kind not null,
  from_period tstzrange,
  to_period tstzrange,
  late boolean not null default false,
  reason text check (reason is null or char_length(reason) between 3 and 200),
  seen_by_customer_at timestamptz,
  constraint appointment_events_barber_reason check (actor <> 'barber' or kind = 'booked' or reason is not null)
);
create index appointment_events_appointment_idx on app.appointment_events (appointment_id, at);
create index appointment_events_actor_user_idx on app.appointment_events (actor_user_id);
create index appointment_events_at_idx on app.appointment_events (at desc);

-- RF-22, RF-23: hasta cuándo vio Colo la agenda (por cuenta, no por dispositivo: clarificación 6).
create table app.agenda_views (
  auth_user_id uuid primary key references auth.users (id) on delete cascade,
  seen_at timestamptz not null
);

alter table app.appointments enable row level security;
alter table app.appointment_events enable row level security;
alter table app.agenda_views enable row level security;
create policy app_server_all on app.appointments for all to app_server using (true) with check (true);
create policy app_server_all on app.appointment_events for all to app_server using (true) with check (true);
create policy app_server_all on app.agenda_views for all to app_server using (true) with check (true);

-- RNF-3: sin delete. Un turno se cancela, no se borra.
grant select, insert, update on app.appointments, app.appointment_events, app.agenda_views to app_server;

-- RF-31: sesiones de invitado abandonadas (más de 60 días sin uso y sin cliente). Corre como dueño de la
-- base; la app no tiene permisos sobre `auth`.
select cron.schedule(
  'invitados-abandonados',
  '27 6 * * *', -- 03:27 de Buenos Aires
  $$
    delete from auth.users u
    where u.is_anonymous
      and not exists (select 1 from app.guest_devices g where g.auth_user_id = u.id)
      and coalesce((select a.last_seen_at from app.user_activity a where a.auth_user_id = u.id), u.created_at)
          < now() - interval '60 days';
  $$
);
