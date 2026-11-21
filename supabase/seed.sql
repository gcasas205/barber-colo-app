-- Solo para la base LOCAL (supabase db reset). Nunca corre en producción: ahí las cuentas de prueba
-- las crea una persona desde el panel (spec 002, T1). Mismas cuentas que muestra la pantalla de ingreso.
with demo(email, password) as (
  values ('colo@example.com', 'colo1234'),
         ('cliente1@example.com', 'cliente1234'),
         ('cliente2@example.com', 'cliente1234')
), created as (
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, email_change, email_change_token_new, recovery_token
  )
  select '00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
         email, extensions.crypt(password, extensions.gen_salt('bf')), now(),
         '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', ''
  from demo
  returning id, email
)
insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
select gen_random_uuid(), id, id::text,
       jsonb_build_object('sub', id::text, 'email', email, 'email_verified', true),
       'email', now(), now(), now()
from created;
