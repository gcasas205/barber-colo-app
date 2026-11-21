-- Base del esquema (spec 001, docs/diseno/02-base-de-datos.md §1 y §5).
-- Ningún esquema de negocio se publica en la Data API: el navegador nunca habla con la base (ADR-02).

create extension if not exists btree_gist with schema extensions;
create extension if not exists pg_trgm with schema extensions;

create schema if not exists app;
create schema if not exists stats;

-- Rol con el que se conecta Next.js por el pooler. Sin contraseña acá: la pone una persona
-- en cada entorno (plan, sección 11). Permisos mínimos: cada spec agrega los que necesita (S-3).
do $$
begin
  if not exists (select from pg_roles where rolname = 'app_server') then
    create role app_server login noinherit;
  end if;
end
$$;

revoke all on schema app, stats from public, anon, authenticated;
grant usage on schema app, stats to app_server;

-- Lo que se cree más adelante en estos esquemas tampoco queda visible para la Data API (S-4).
alter default privileges in schema app revoke all on tables from public, anon, authenticated;
alter default privileges in schema app revoke all on sequences from public, anon, authenticated;
alter default privileges in schema app revoke all on functions from public, anon, authenticated;
alter default privileges in schema stats revoke all on tables from public, anon, authenticated;
alter default privileges in schema stats revoke all on sequences from public, anon, authenticated;
alter default privileges in schema stats revoke all on functions from public, anon, authenticated;
