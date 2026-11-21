-- Servicios con turno (spec 001, D-10; docs/diseno/02-base-de-datos.md §3.5). RF-13.

create table app.services (
  id smallint generated always as identity primary key,
  name text not null check (char_length(btrim(name)) between 1 and 60),
  description text not null default '' check (char_length(description) <= 200),
  -- Que sea múltiplo del paso lo valida el dominio: el paso vive en otra tabla.
  duration_minutes smallint not null check (duration_minutes > 0 and duration_minutes <= 600),
  price_cents integer not null check (price_cents > 0),
  counts_for_benefits boolean not null,
  position smallint not null,
  deactivated_at timestamptz,
  created_at timestamptz not null default now()
);
comment on table app.services is 'Servicios con turno. Precio en centavos; se desactivan, no se borran.';

-- I-16: nombre único entre los activos, sin importar mayúsculas ni espacios de los extremos.
create unique index services_active_name_key on app.services (lower(btrim(name))) where deactivated_at is null;

alter table app.services enable row level security;
create policy app_server_all on app.services for all to app_server using (true) with check (true);

grant select on app.services to app_server;
