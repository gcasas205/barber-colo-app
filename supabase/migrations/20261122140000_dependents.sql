-- Spec 004b: personas a cargo. Índice para contar y listar las personas de una cuenta por rol
-- (el límite de 5 y la lista de "Personas a cargo"). Sin tablas ni columnas nuevas.
create index if not exists customers_account_role_idx
  on app.customers (account_user_id, role)
  where account_user_id is not null;
