-- Clientes (spec 002; docs/diseno/02-base-de-datos.md §3.2, con los ajustes del plan de la 002).

-- holder: titular con cuenta. dependent: persona a cargo de un titular (spec 004).
-- guest: cliente sin cuenta (invitado que se registra solo, o cargado por Colo en la spec 005).
create type app.customer_role as enum ('holder', 'dependent', 'guest');
create type app.registered_by as enum ('self', 'barber');

create table app.customers (
  id uuid primary key default gen_random_uuid(),
  role app.customer_role not null,
  registered_by app.registered_by not null default 'self',
  -- Cuenta de Auth del titular (y de sus personas a cargo). Los invitados no tienen cuenta.
  account_user_id uuid references auth.users (id) on delete restrict,
  full_name text not null check (char_length(btrim(full_name)) between 2 and 80),
  -- Celular argentino normalizado por el dominio (RF-10).
  phone_e164 text check (phone_e164 ~ '^\+549[0-9]{10}$'),
  email text check (char_length(email) <= 254),
  -- Solo lo ve Colo (RF-21, D-14).
  nickname text check (char_length(btrim(nickname)) between 1 and 40),
  birth_day smallint,
  birth_month smallint,
  -- Unión de un invitado con una cuenta (RF-12): el invitado apunta al titular.
  linked_to uuid references app.customers (id),
  -- Datos de prueba (RF-25): siempre con "(demo)" en el nombre, para que no se confundan con reales.
  is_demo boolean not null default false,
  anonymized_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint customers_account_by_role check ((role = 'guest') = (account_user_id is null)),
  constraint customers_guest_has_phone check (role <> 'guest' or phone_e164 is not null or anonymized_at is not null),
  constraint customers_dependent_no_contact check (role <> 'dependent' or (phone_e164 is null and email is null)),
  constraint customers_birthday check (
    (birth_day is null and birth_month is null)
    -- Los dos o ninguno: en un check, una comparación con null no falla, así que se exige explícitamente.
    or (birth_day is not null and birth_month is not null and birth_month between 1 and 12 and birth_day between 1 and
        case when birth_month = 2 then 29 when birth_month in (4, 6, 9, 11) then 30 else 31 end)
  ),
  constraint customers_not_linked_to_self check (linked_to <> id),
  constraint customers_demo_named check (not is_demo or full_name like '%(demo)')
);
comment on table app.customers is 'Personas que se atienden: titulares con cuenta, personas a cargo e invitados.';

-- Un titular por cuenta.
create unique index customers_one_holder_per_account on app.customers (account_user_id) where role = 'holder';
-- I-10: el teléfono identifica a un solo cliente activo y no vinculado (RF-11, RF-16, RF-17).
create unique index customers_phone_active on app.customers (phone_e164)
  where phone_e164 is not null and linked_to is null and anonymized_at is null;
-- Lista de Colo, del más reciente al más antiguo (RF-19), e índices de las claves foráneas.
create index customers_created_at_idx on app.customers (created_at desc, id desc);
create index customers_account_user_idx on app.customers (account_user_id);
create index customers_linked_to_idx on app.customers (linked_to);

alter table app.customers enable row level security;
create policy app_server_all on app.customers for all to app_server using (true) with check (true);
-- Nunca se borran clientes desde la app: se anonimizan (spec de clientes).
grant select, insert, update on app.customers to app_server;
