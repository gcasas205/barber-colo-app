# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Clientes de la barbería de Colo** (cliente con cuenta de Google): de todas las edades. Hay jóvenes de 15 a 30 muy cómodos con el celular, adultos de 30 a 50 y mayores de 50, que pueden necesitar letra grande y pasos simples. También vienen chicos acompañados por sus padres. El trabajo que hacen: conseguir un turno sin escribir por WhatsApp, confirmarlo, cancelarlo o cambiarlo, y ver cuánto les falta para un descuento.
- **Colo, el barbero** (único administrador): usa la app en el **celular, entre corte y corte**, con poco tiempo y a veces con las manos ocupadas. Su trabajo: ver la agenda del día, decidir rápido (aprobar, mantener, liberar, marcar asistencia), cargar turnos de quien sigue escribiendo, y mirar cómo va el negocio (facturación, clientes, faltas).
- **Invitado**: persona sin cuenta que recibe por WhatsApp un enlace para ver, confirmar o cancelar un turno que le cargó el barbero.

## Product Purpose

Reemplazar la libreta y los mensajes de WhatsApp con los que Colo maneja sus turnos. El cliente reserva solo y recibe recordatorios en el celular; el barbero deja de perder horarios por clientes que faltan sin avisar y gana una vista de su negocio (CRM).

Éxito: menos del 20 % de los turnos coordinados por WhatsApp a los 2 meses, menos faltas sin aviso y una tasa alta de turnos confirmados dentro del plazo (`docs/analisis.md` §2).

## Positioning

Es la app de **una** barbería y de **un** barbero, no una plataforma de reservas genérica: las reglas son las de Colo (confirmación 1 h antes, faltas seguidas que piden aprobación, beneficios por frecuencia y por cumpleaños) y el barbero la maneja desde el celular en el momento.

## Operating Context

- PWA instalada en el celular; las notificaciones push son el canal principal (en iPhone, solo con la app agregada a la pantalla de inicio).
- El barbero contesta notificaciones con acciones (Confirmar, Mantener, Liberar) entre corte y corte.
- WhatsApp sigue existiendo: el barbero comparte enlaces de turno y escribe a los clientes que se enfrían con mensajes ya escritos.
- El cobro es en el local; la app muestra precio, descuento y precio final, pero no cobra (salvo la seña futura, spec 009).

## Capabilities and Constraints

- Funcionalidades: `docs/analisis.md`, `docs/casos-de-uso.md` (30 casos de uso) y `docs/estadisticas-crm.md`.
- Un solo barbero, un servicio con duración fija, turnos de bloque fijo.
- Interfaz en español rioplatense; fechas y horas en la hora de Buenos Aires.
- Stack fijo por la constitución: Next.js 16, Tailwind CSS v4, Supabase, Vercel.
- Un adulto (titular) puede cargar hasta [5] personas a cargo, por ejemplo sus hijos, y reservar para ellas (P-16 en `docs/dominio.md`).

## Brand Commitments

- Nombre: **Barbería y Peluquería El Colo** (`@elcolo.barbershop` en Instagram), "Salón masculino". Colo es el barbero.
- **Logo** (insignia circular tipo sello): "BARBERIA" en arco, "PELUQUERÍA", bigote de manubrio, cinta "★ EL COLO ★" y borde con rayas diagonales de poste de barbero. Dos versiones en uso: **clara** (fondo crema, azul marino y rojo) y **oscura** (fondo negro, bigote naranja). Redibujadas en vector en `public/brand/` a partir de la foto de perfil (150 px); la tipografía de la reproducción es aproximada.
- **Estética del local** (fotos públicas de Instagram): paredes blancas con cuadros de estilo vintage y tatuaje, mesada de madera clara, pared verde, sillones negros, capas negras a rayas y los colores del poste de barbero.
- **Horario publicado:** lunes a sábado de 10 a 20 h (dato para precargar la agenda; lo confirma el barbero).

## Evidence on Hand

- Logo redibujado: `public/brand/logo-el-colo.svg` (claro) y `public/brand/logo-el-colo-oscuro.svg` (oscuro), con sus PNG.
- Las fotos de Instagram muestran clientes reales: **no se usan en la app** sin permiso de cada persona. Sirven solo como referencia de estética.
- No hay testimonios ni precios reales cargados: no se fabrican.

## Product Principles

1. **Un toque para lo urgente.** Lo que el barbero hace entre cortes (confirmar, liberar, marcar asistencia) se resuelve desde la notificación o con un toque.
2. **Para todas las edades.** Un cliente de 60 años tiene que poder reservar sin ayuda; nada depende de gestos ocultos ni de letra chica.
3. **Las reglas a la vista.** Plazos, faltas y descuentos se explican en el momento en que afectan al cliente, nunca después.
4. **Es la barbería de Colo.** La identidad es la del local, no la de una app de reservas genérica.

## Accessibility & Inclusion

- Clientes mayores de 50: texto base grande, alto contraste (WCAG AA como mínimo), objetivos táctiles amplios y flujos cortos.
- Uso con una mano y en movimiento (barbero).
- `prefers-reduced-motion` respetado.
