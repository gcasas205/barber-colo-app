-- Ajustes de Colo (spec 003; plan §1). RF-10, RF-14, RF-27, RNF-1.

-- El texto del bloqueo pasa a ser el aviso público para los clientes (clarificación 11): corto y opcional.
-- En producción no hay bloqueos cargados, así que no se pierde nada.
alter table app.schedule_blocks rename column reason to notice;
alter table app.schedule_blocks drop constraint if exists schedule_blocks_reason_check;
alter table app.schedule_blocks
  add constraint schedule_blocks_notice_check check (notice is null or char_length(notice) between 1 and 80);
alter table app.schedule_blocks add column created_by uuid references auth.users (id) on delete set null;
comment on column app.schedule_blocks.notice is 'Aviso público para los clientes (spec 003, RF-14). Null = sin aviso.';

-- RF-27: quién cambió qué y cuándo. No se muestra en la página pública.
create table app.settings_changes (
  id bigint generated always as identity primary key,
  changed_by uuid not null references auth.users (id) on delete cascade,
  changed_at timestamptz not null default now(),
  area text not null check (area in ('franjas', 'paso', 'bloqueos', 'servicios', 'reserva', 'contacto')),
  detail jsonb not null default '{}'::jsonb
);
create index settings_changes_changed_at_idx on app.settings_changes (changed_at desc);
-- El índice de la clave foránea evita recorrer la tabla al borrar un usuario (db advisors).
create index settings_changes_changed_by_idx on app.settings_changes (changed_by);
create index schedule_blocks_created_by_idx on app.schedule_blocks (created_by);
comment on table app.settings_changes is 'Auditoría de los cambios de Ajustes (spec 003, RF-27).';

alter table app.settings_changes enable row level security;
create policy app_server_all on app.settings_changes for all to app_server using (true) with check (true);

-- RNF-1: lo mínimo para escribir. Nada de delete en servicios (se sacan, no se borran: RF-19) ni en ajustes.
grant update on app.schedule_settings to app_server;
grant insert, delete on app.weekly_ranges, app.schedule_blocks to app_server;
grant insert, update on app.services to app_server;
grant select, insert on app.settings_changes to app_server;
