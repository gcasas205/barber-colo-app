-- Agenda (spec 001; docs/diseno/02-base-de-datos.md §3.1). RF-12, RF-14, RNF-5.

create table app.schedule_settings (
  id smallint primary key default 1 check (id = 1),
  -- Pasos que dividen la hora en partes iguales (RF-12). Coincide con ALLOWED_STEPS del dominio.
  step_minutes smallint not null check (step_minutes in (5, 10, 15, 20, 30, 60)),
  min_notice_minutes integer not null check (min_notice_minutes >= 0),
  max_advance_days integer not null check (max_advance_days between 1 and 365),
  approval_min_notice_minutes integer not null check (approval_min_notice_minutes >= 0),
  -- Formato internacional sin espacios: +5491138163491.
  contact_whatsapp text not null check (contact_whatsapp ~ '^\+[0-9]{8,15}$'),
  updated_at timestamptz not null default now()
);
comment on table app.schedule_settings is 'Parámetros de la agenda. Una sola fila (id = 1).';

create table app.weekly_ranges (
  id bigint generated always as identity primary key,
  weekday smallint not null check (weekday between 1 and 7), -- 1 = lunes … 7 = domingo
  opens_at time not null,
  closes_at time not null,
  constraint weekly_ranges_closes_after_opens check (closes_at > opens_at),
  -- RF-12 / I-8: dos franjas del mismo día no se superponen (tocarse en el borde sí está permitido).
  -- Las horas se llevan a una fecha fija para usar tsrange, que es de Postgres y no necesita un
  -- tipo propio (un tipo de rango propio crea funciones que el revisor de Supabase marca).
  constraint weekly_ranges_no_overlap
    exclude using gist (weekday with =, tsrange(date '2000-01-01' + opens_at, date '2000-01-01' + closes_at) with &&)
);
comment on table app.weekly_ranges is 'Franjas de atención por día de la semana, en hora de Buenos Aires.';

create table app.schedule_blocks (
  id bigint generated always as identity primary key,
  -- Lapso bloqueado, [inicio, fin). RF-14: no vacío y con los dos extremos definidos.
  -- created_by (quién lo cargó) se agrega en la spec 002, cuando existan los usuarios.
  period tstzrange not null check (
    not isempty(period) and not lower_inf(period) and not upper_inf(period)
    and lower_inc(period) and not upper_inc(period)
  ),
  reason text check (char_length(reason) <= 200),
  created_at timestamptz not null default now()
);
create index schedule_blocks_period_idx on app.schedule_blocks using gist (period);
comment on table app.schedule_blocks is 'Bloqueos de la agenda (feriados, vacaciones, trámites).';

alter table app.schedule_settings enable row level security;
alter table app.weekly_ranges enable row level security;
alter table app.schedule_blocks enable row level security;

create policy app_server_all on app.schedule_settings for all to app_server using (true) with check (true);
create policy app_server_all on app.weekly_ranges for all to app_server using (true) with check (true);
create policy app_server_all on app.schedule_blocks for all to app_server using (true) with check (true);

-- Spec 001: la app solo lee. La spec 002 (Ajustes) agrega la escritura.
grant select on app.schedule_settings, app.weekly_ranges, app.schedule_blocks to app_server;
