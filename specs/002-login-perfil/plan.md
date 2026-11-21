# Plan — Spec 002: Login y perfil

Estado: aprobado (2026-11-21), con el cambio 01 (sin Google: sección 0)
Spec: [`spec.md`](spec.md) (aprobada) · Diseño: ADR-07, `docs/diseno/03-backend.md` §9, `02-base-de-datos.md` §3.2

## 0. Cambio 01: sin Google por ahora

- La pantalla de ingreso es como la de Corralap: correo y contraseña, y la lista de cuentas de prueba
  (rol + correo) que completa el formulario al tocarla.
- Las tres cuentas de prueba son usuarios de **correo y contraseña** de Supabase Auth:
  `colo@example.com`, `cliente1@example.com` y `cliente2@example.com` (dominio reservado para ejemplos:
  nunca es de nadie). Sus contraseñas viven en el código de la pantalla, como en Corralap: son públicas a
  propósito y solo sirven mientras `DEMO_ENABLED` esté activo.
- `getActor()` reconoce a esas cuentas por su correo **y** por estar en `app.demo_accounts`; cualquier
  otra cuenta de correo y contraseña no tiene acceso (RF-1c). El rol por `BARBER_EMAIL` y el ingreso
  con Google se implementan en la spec de publicación.
- En producción, las tres cuentas las crea una persona desde el panel de Supabase (T1). En la base local
  las crea `supabase/seed.sql`, que solo corre en local.
- El invitado sigue con el ingreso anónimo de Supabase.

## 1. Resumen

Todas las sesiones, de Google, de invitado y de prueba, son **sesiones de Supabase Auth en una cookie
httpOnly**. Así, `getActor()` es el único lugar que decide quién es quién. Los invitados y los usuarios
de prueba usan el **ingreso anónimo** de Supabase: cada dispositivo recibe un usuario anónimo, que el
servidor asocia a un cliente invitado (por teléfono) o a un usuario de prueba. Nadie escribe claves y
no hace falta la clave secreta de Supabase.

## 2. Ajustes al diseño (se registran en los ADR)

| Diseño | Ahora | Por qué |
|---|---|---|
| ADR-07: rol de barbero en `app_metadata`, asignado una vez con `SUPABASE_SECRET_KEY` | El rol se **calcula en cada pedido**: barbero si el email **verificado** del token coincide con `BARBER_EMAIL`, o si es Colo (demo) con la demo activa | Cumple RF-7b y RF-7c (cambiar el email quita el rol en el próximo pedido) y **elimina la clave secreta** del servidor: una credencial menos que se pueda filtrar |
| Invitado solo por enlace secreto a un turno (`/t/token`) | Invitado con **sesión anónima por dispositivo** (`guest_devices`); el enlace secreto sigue existiendo para los turnos manuales (spec 005) | RF-15 a RF-18: el invitado entra solo y se lo recuerda en el dispositivo; RF-17 necesita saber desde qué dispositivo se sacó cada turno |
| `customer_role`: `holder`, `dependent`, `manual` | `holder`, `dependent`, `guest` + `registered_by` (`self` o `barber`) | El invitado y el cliente que carga Colo a mano son la misma figura: un cliente sin cuenta. Lo único que cambia es quién lo registró |
| CSP fija para todo el sitio (spec 001) | Pantallas con sesión: CSP **con nonce** generado en `proxy.ts`, rutas **bloqueantes** (`export const instant = false`) y el script del tema autorizado por su **hash**; página pública: la CSP fija de la 001 sin cambios | RNF-4. La página pública sigue prerenderizada (RNF-3 de la 001). *(Implementación: en la página pública no se puede sumar el hash, porque con un hash el navegador ignora `'unsafe-inline'`, que ahí hace falta para los scripts prerenderizados de Next.)* |

## 3. Dependencias nuevas

| Paquete | Para qué | Nota |
|---|---|---|
| `@supabase/ssr` | Sesión en cookies con Next 16 (`createServerClient`, refresco en `proxy.ts`) | Previsto en ADR-07 |
| `@supabase/supabase-js` | Cliente de Auth (Google, anónimo, `getClaims`, `signOut`) | Previsto en ADR-07 |

Las versiones exactas se fijan al instalar, con `npm view`. No hay otras dependencias: el límite de
intentos y la normalización de teléfonos se escriben en el proyecto.

## 4. Base de datos (migraciones)

| Migración | Contenido | Cubre |
|---|---|---|
| `…_customers.sql` | `app.customer_role` (`holder`, `dependent`, `guest`); `app.customers` según el diseño, más `registered_by`, `nickname` (≤ 40), `is_demo boolean not null default false` y `birth_day`/`birth_month` (sin año); teléfono `^\+549[0-9]{10}$`; **único entre clientes activos no vinculados**; un titular por cuenta; titular ⇔ `account_user_id` presente; `linked_to` para las uniones | RF-9 a RF-12, RF-17, D-14 |
| `…_identity.sql` | `app.guest_devices(auth_user_id pk, customer_id, created_at)`; `app.demo_accounts(auth_user_id pk, kind in ('barber','client_1','client_2'))`; `app.user_activity(auth_user_id pk, last_seen_at)`; `app.phone_changes(customer_id, old_phone, changed_by, changed_at)`; `app.guest_attempts(ip_hash, attempted_at)` con índice | RF-4, RF-14, RF-17, RF-18b, RF-22 a RF-25 |
| `…_retention.sql` | Supabase Cron (pg_cron) diario: borra `phone_changes` de más de 12 meses y `guest_attempts` de más de 1 día | RF-14, RF-18b |
| Permisos | `app_server` suma `select, insert, update` sobre estas tablas, nunca `delete` (salvo `guest_attempts`, para la limpieza). RLS activado con política solo para `app_server`, como en la 001 | RNF-3 |

**La marca de los datos de prueba** (RF-25) es `is_demo = true`, con un `check` que obliga a que los
nombres de prueba terminen en "(demo)". Los datos reales no pueden llevar esa marca, porque solo el
caso de uso de demo la pone.

## 5. Dominio puro (con tests primero)

- `customers/domain/phone.ts`: `normalizeArPhone("011 15 3816-3491") → "+5491138163491"`. Acepta 0, 15,
  +54 y 9. Rechaza los fijos sin código de área y los que no tienen 10 dígitos. Distingue "parece del
  exterior" para el mensaje de RF-10.
- `customers/domain/name.ts`: la regla de 2 a 40 caracteres, con espacios normalizados.
- `customers/domain/birthday.ts`: día y mes válidos (el 29/2 se permite).
- `customers/domain/phone-claim.ts`: decide qué pasa con un teléfono según a quién pertenece, como
  función pura: `free`, `own`, `taken_by_account` (RF-11, RF-16), `guest_to_merge` (RF-12) o
  `same_guest` (RF-17).
- `identity/domain/actor.ts`: calcula el actor a partir de los claims, el email del barbero, la demo y
  la última actividad. Devuelve `barber`, `customer`, `guest`, `demo` o `none`; el vencimiento por
  inactividad sale de acá (RF-4, RF-7 a RF-7c, RF-24).

## 6. Casos de uso (aplicación)

| Caso de uso | Qué hace | Cubre |
|---|---|---|
| `registerAccountCustomer` | Al volver de Google: crea el titular si no existe y actualiza el email | RF-2 |
| `completeProfile` / `updateProfile` | Valida y guarda nombre, teléfono y cumpleaños. Con un teléfono de invitado, lo une (los turnos futuros pasan a la cuenta) y registra el cambio de teléfono, todo en una transacción con la fila del teléfono bloqueada | RF-9 a RF-14, caso 5 |
| `enterAsGuest` | Cuenta los intentos por IP (hash con pepper) y aplica `phone-claim`; crea o reconoce al invitado y asocia el dispositivo | RF-15 a RF-18b |
| `enterAsDemo` | Solo con `DEMO_ENABLED`: asocia la sesión anónima a Colo (demo) o a un cliente de prueba, creando los datos `(demo)` la primera vez | RF-22, RF-23, RF-25 |
| `listCustomers` | Solo para el barbero: de a 50, por cursor, del más reciente al más antiguo | RF-19 |
| `setNickname` | Solo para el barbero: pone, cambia o borra el sobrenombre | RF-20, RF-21 |
| `purgeDemoData` | Borra todo lo que tiene `is_demo` y sus usuarios anónimos. Corre desde un comando, nunca desde la web | RF-25 |

La autorización va dentro de cada caso de uso, con el actor que entrega `getActor()` (diseño §9).

## 7. Interfaz

| Ruta | Contenido |
|---|---|
| `/ingresar` | "Entrar con Google", "Entrar como invitado" (con el aviso de RF-15 y los campos nombre y teléfono), y los botones de prueba si la demo está activa |
| `/auth/callback` | Vuelta de Google: intercambia el código y deriva a `/perfil` (perfil incompleto), `/colo` (barbero) o `/` |
| `/perfil` | Cliente con cuenta: nombre, teléfono y cumpleaños (día y mes), con el aviso de RF-13. Invitado: su nombre, "Crear cuenta con Google" y "Salir" |
| `/colo` | Lista de clientes, sobrenombre en el lugar, "Salir" y "Salir de todos los dispositivos" |
| Página pública | "Ingresar" en la chapa (o el nombre y "Mi perfil" si hay sesión), en una isla dinámica chica detrás de `<Suspense>`: el resto de la página sigue prerenderizado |
| Todas las pantallas con sesión de prueba | Franja fija "Modo de prueba · Salir" (RF-22b) |

Los formularios son Server Actions validadas con Zod. Los errores se muestran junto a cada campo y se
anuncian con `aria-live` (RNF-5). Todo sigue `DESIGN.md`, en claro y en oscuro.

## 8. Seguridad

| # | Riesgo | Medida | Se verifica con |
|---|---|---|---|
| S-1 | Alguien se hace pasar por Colo | Rol solo con email **verificado** igual a `BARBER_EMAIL`, en cada pedido. Identidad siempre con `getClaims()` (firma verificada), nunca con `getSession()` | Tests de `actor.ts` con email no verificado, mayúsculas y email cambiado |
| S-2 | Robo de sesión | Cookie httpOnly, `Secure`, `SameSite=Lax`; vencimiento por inactividad (60/30 días); "Salir de todos los dispositivos" (`signOut` global) | Test e2e: la cookie no es accesible desde `document.cookie` |
| S-3 | Un cliente ve datos de otro | Cada caso de uso filtra por el actor; `/colo` y sus acciones exigen el rol de barbero | Tests de integración con dos clientes y con un invitado |
| S-4 | Bots y averiguar teléfonos | 5 intentos por hora por IP, guardados como hash con pepper (no se guarda la IP); además, el límite propio del ingreso anónimo de Supabase | Test del caso de uso; e2e del sexto intento |
| S-5 | Scripts inyectados en pantallas con datos personales | CSP con nonce por pedido en `/ingresar`, `/perfil`, `/colo` y `/auth/*`; sin `'unsafe-inline'` | Test de cabeceras por ruta; e2e sin errores de CSP en la consola |
| S-6 | La demo toca datos reales | `is_demo` + `check` de nombres "(demo)"; `purgeDemoData` solo borra filas marcadas | Test de integración: con datos reales y de prueba mezclados, borra solo los de prueba |
| S-7 | Datos personales en logs o en la URL | Los errores muestran códigos, nunca valores; no se usan parámetros de URL para datos personales | Revisión y test sobre los mensajes de error |
| S-8 | CSRF en las acciones | Las Server Actions de Next comparan el origen; las cookies son `SameSite=Lax` | Documentación de Next 16 + test e2e desde otro origen |

## 9. Tests

- **Unidad:** teléfono (más de 20 formatos), nombre, cumpleaños, `phone-claim`, `actor` y los casos
  de uso con repositorios en memoria. Todo en las tres zonas horarias, como en la 001.
- **Integración** (Supabase local con Auth): migraciones, restricciones (teléfono único, titular único,
  "(demo)"), permisos de `app_server`, unión invitado → cuenta, límite de intentos y borrado de la demo.
  Los usuarios de Auth se crean con la clave de servicio de la base **local**, que solo existe en los
  tests.
- **Punta a punta** (Playwright, `tests/e2e/login.py`): invitado (incluido el sexto intento), las tres
  demos con su franja, el cliente que intenta abrir `/colo`, el tema en las pantallas nuevas y la
  cookie no legible. Google no se puede automatizar: se verifica a mano en T10.
- **Velocidad:** `tests/e2e/speed.py` (página pública, RNF-3 de la 001) y la medición de `/ingresar`
  (RNF-6).

## 10. Pasos de una persona

| Paso | Cómo se verifica | Cómo se vuelve atrás |
|---|---|---|
| En Supabase → Authentication: activar el ingreso anónimo y crear los 3 usuarios de prueba (correo, contraseña y *Auto Confirm User*) | Aparecen en la lista de usuarios | Borrar los usuarios y desactivar el ingreso anónimo |
| En Vercel → Production: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `DEMO_ENABLED=true` e `IP_HASH_PEPPER` (al azar) | `/ingresar` muestra la lista de cuentas de prueba | Borrar las variables |
| *(Spec de publicación)* Cliente OAuth de Google, proveedor Google en Supabase y `BARBER_EMAIL` | — | — |

## 11. Cobertura

| Requisito | Dónde |
|---|---|
| RF-1 a RF-5b | `/ingresar`, `/auth/callback`, `actor.ts`, `proxy.ts` |
| RF-6 a RF-8 | `actor.ts`, guardas de `/colo` |
| RF-9 a RF-14 | dominio de clientes, `completeProfile`/`updateProfile`, `/perfil` |
| RF-15 a RF-18b | `enterAsGuest`, `guest_devices`, `guest_attempts` |
| RF-19 a RF-21 | `listCustomers`, `setNickname`, `/colo` |
| RF-22 a RF-25 | `enterAsDemo`, `demo_accounts`, franja de prueba, `purgeDemoData` |
| RNF-1 a RNF-7 | sección 8, tests de cabeceras, e2e y velocidad; RNF-7 porque solo se usa Next y Supabase |
