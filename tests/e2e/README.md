# Pruebas de punta a punta

Corren con Playwright (Python) contra la app levantada en `http://localhost:3100` y la base local:

```bash
npm run db:start
# Variables locales (no son secretos: son las del entorno local de Supabase)
export NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
export NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH
export DEMO_ENABLED=true IP_HASH_PEPPER=solo-para-pruebas-locales-0123456789abcdef
psql postgresql://postgres:postgres@127.0.0.1:54332/postgres -c "alter role app_server password 'local-test-only'"
export DATABASE_URL=postgresql://app_server:local-test-only@127.0.0.1:54332/postgres
npm run build && npx next start -p 3100
```

| Script | Qué prueba |
|---|---|
| `booking.py` | Página pública: cálculo en el dispositivo, días sin lugar, página abierta (spec 001) |
| `speed.py` | Velocidad de la página pública con 4G lento simulado (RNF-3 de la 001) |
| `login.py` | Ingreso, perfil, invitado, panel de Colo, sobrenombre y accesos (spec 002) |
| `csp.py` | CSP con nonce en las pantallas con sesión (RNF-4 de la 002) |
| `speed_login.py` | Velocidad del ingreso con 4G lento simulado (RNF-6 de la 002) |
| `turnos.py [URL]` | Spec 004: ingreso como principal, reservar, reprogramar, cancelar, agenda de Colo, choques con Ajustes, aviso al cliente y velocidad. En producción no crea invitados y deja todo cancelado |
| `a_cargo.py [URL]` | Spec 004b: personas a cargo en Mi perfil, reservar para otro, "Tus turnos", agenda con "A cargo de", aviso de Colo y quitar. Usa "Cliente de prueba 1" y deja todo como estaba |
| `pestanas.py [URL]` | Pestañas del panel de Colo: la marcada es siempre la de la pantalla, al ir y volver (celular simulado, con y sin 4G lento) |
| `speed_pestanas.py [URL] [--lento]` | Del toque a la pantalla nueva en las pestañas de Colo (primera visita y vueltas) |
| `speed_cliente.py [URL]` | Del toque a la pantalla nueva entre Turnos y Mi perfil, con 4G simulado |
| `agenda_fresca.py` | Solo local: la agenda guardada se pone al día al volver (entra un turno mientras Colo está en Clientes) |
| `ajustes.py [URL]` | Ajustes de Colo, avisos en la página pública y velocidad (spec 003). Con la URL de producción no crea servicios y deja todo como estaba |

`login.py`, `csp.py` y `speed_login.py` esperan la base sin clientes: antes de correrlos,
`delete from app.customers` y tablas relacionadas (ver `tests/integration/customers-use-cases.test.ts`).

Con Cache Components, Next deja **ocultas** en la página las pantallas anteriores: los selectores
tienen que usar `:visible` (por ejemplo `main:visible h1`).
