-- Identidad (spec 002): dispositivos de invitados, cuentas de prueba, actividad, cambios de teléfono
-- e intentos de ingreso como invitado.

-- RF-17, RF-18: cada dispositivo invitado tiene una sesión anónima de Supabase asociada a un cliente.
create table app.guest_devices (
  auth_user_id uuid primary key references auth.users (id) on delete cascade,
  customer_id uuid not null references app.customers (id),
  created_at timestamptz not null default now()
);
create index guest_devices_customer_idx on app.guest_devices (customer_id);

-- RF-22, RF-23: las tres cuentas de prueba (correo y contraseña). Colo (demo) no es cliente.
create type app.demo_kind as enum ('barber', 'client_1', 'client_2');
create table app.demo_accounts (
  auth_user_id uuid primary key references auth.users (id) on delete cascade,
  kind app.demo_kind not null unique,
  customer_id uuid references app.customers (id),
  constraint demo_accounts_customer_by_kind check ((kind = 'barber') = (customer_id is null))
);
create index demo_accounts_customer_idx on app.demo_accounts (customer_id);

-- RF-4: vencimiento por inactividad (60 días clientes e invitados, 30 Colo).
create table app.user_activity (
  auth_user_id uuid primary key references auth.users (id) on delete cascade,
  last_seen_at timestamptz not null
);

-- RF-14: registro de cambios de teléfono (se borra a los 12 meses).
create table app.phone_changes (
  id bigint generated always as identity primary key,
  customer_id uuid not null references app.customers (id),
  old_phone text,
  new_phone text,
  changed_by uuid,
  changed_at timestamptz not null default now()
);
create index phone_changes_customer_idx on app.phone_changes (customer_id);
create index phone_changes_changed_at_idx on app.phone_changes (changed_at);

-- RF-18b: intentos de ingreso como invitado por conexión. Se guarda un hash de la IP, nunca la IP.
create table app.guest_attempts (
  id bigint generated always as identity primary key,
  ip_hash text not null,
  attempted_at timestamptz not null default now()
);
create index guest_attempts_ip_time_idx on app.guest_attempts (ip_hash, attempted_at);

alter table app.guest_devices enable row level security;
alter table app.demo_accounts enable row level security;
alter table app.user_activity enable row level security;
alter table app.phone_changes enable row level security;
alter table app.guest_attempts enable row level security;
create policy app_server_all on app.guest_devices for all to app_server using (true) with check (true);
create policy app_server_all on app.demo_accounts for all to app_server using (true) with check (true);
create policy app_server_all on app.user_activity for all to app_server using (true) with check (true);
create policy app_server_all on app.phone_changes for all to app_server using (true) with check (true);
create policy app_server_all on app.guest_attempts for all to app_server using (true) with check (true);

grant select, insert, update on app.guest_devices, app.demo_accounts, app.user_activity to app_server;
grant select, insert on app.phone_changes, app.guest_attempts to app_server;
