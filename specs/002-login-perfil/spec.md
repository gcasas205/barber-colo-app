# Spec 002 — Login y perfil

Estado: aprobada (2026-11-21), con las resoluciones de `clarificacion.md` y el **cambio 01** (sin Google por ahora: ver al final)

Origen: `docs/analisis.md` (RF-01 a RF-03, actores, D-11 a D-15) y las respuestas de Gonzalo del
2026-11-21. La spec anterior (001) dejó la página pública de horarios en producción.

## Contexto y objetivo

Hasta ahora la app es una página pública sin sesión. Esta spec agrega **quién es quién**: los clientes
entran con Google o como invitados, Colo entra con su cuenta y la app lo reconoce como barbero, y hay
**usuarios de prueba** para que Gonzalo y Colo puedan probar la app a fondo antes de usarla de verdad.
No se puede reservar todavía (spec 004): esta spec deja listas las identidades sobre las que se apoyan
la reserva, la política de faltas y los descuentos.

## Usuarios

- **Visitante:** cualquiera que abre la app sin sesión.
- **Cliente con cuenta:** entra con Google. Acumula visitas para los descuentos.
- **Invitado:** entra con nombre y teléfono, sin Google. No acumula visitas para los descuentos; se lo
  reconoce por el teléfono para la política de faltas.
- **Colo (barbero):** entra con su cuenta de Google, configurada fuera del código.
- **Usuarios de prueba:** Colo (demo) y dos clientes de prueba, temporales (D-11). Quedan activos hasta
  que Gonzalo decida publicar la app real (D-11 actualizada).

## Historias de usuario

- HU-1. Como cliente, quiero entrar con mi cuenta de Google y cargar mi teléfono una sola vez, para que
  Colo me reconozca y acumular visitas para los descuentos.
- HU-2. Como cliente que no quiere usar Google, quiero entrar con mi nombre y mi teléfono, sabiendo que
  así no acumulo visitas para los descuentos.
- HU-3. Como Colo, quiero entrar con mi cuenta y que la app sepa que soy el barbero, para ver a mis
  clientes, sin que ningún cliente pueda hacer lo mismo.
- HU-4. Como Colo, quiero ponerle un sobrenombre a cada cliente, que solo vea yo, para reconocerlos como
  los conozco.
- HU-5. Como Gonzalo o Colo, quiero entrar con un toque como Colo o como cliente de prueba, para probar
  la app a fondo antes de usarla con clientes reales.
- HU-6. Como cliente, quiero corregir mi nombre, mi teléfono o mi cumpleaños, y cerrar la sesión.

## Definiciones

- **Teléfono:** número de celular argentino: 10 dígitos contando el código de área (11 3816-3491),
  con o sin 0, 15, +54 o 9 adelante. Se acepta como lo escribe una persona ("11 3816-3491",
  "011 15 3816-3491", "+54 9 11 3816-3491") y se guarda en formato internacional (+5491138163491).
  Identifica al cliente, pero el historial es de la persona: cambiar el número no borra faltas ni visitas.
- **Nombre:** de 2 a 40 caracteres, sin espacios al principio, al final ni repetidos; se aceptan tildes
  y emojis.
- **Perfil completo:** nombre y teléfono cargados. El cumpleaños es opcional.
- **Cumpleaños:** día y mes, sin año (es lo único que hace falta para el descuento de P-15).
- **Sobrenombre:** cómo llama Colo a un cliente ("el pelado de la moto"). Solo lo ve el barbero.
- **Usuarios de prueba activos:** activados por configuración. Se desactivan a mano, cuando Gonzalo
  decida publicar la app real; no se apagan solos.

## Requisitos funcionales

> **Cambio 01 (2026-11-21):** por ahora no se usa Google. Los requisitos marcados con *(Google)* pasan a
> la spec de publicación. Mientras tanto, se entra con correo y contraseña (solo usuarios de prueba) o
> como invitado, igual que la pantalla de ingreso de Corralap (RF-1, RF-22).

**Ingreso**
- RF-1. EL SISTEMA ofrece una pantalla "Ingresar" con un formulario de **Correo** y **Contraseña**
  (obligatorios, con un botón para mostrar u ocultar la contraseña) y el botón "Ingresar"; debajo,
  "Entrar como invitado". La página pública de horarios tiene el enlace "Ingresar" en la chapa
  superior, al lado del tema. *(Google: se suma "Entrar con Google" en la spec de publicación.)*
- RF-1b. SI el correo o la contraseña no son correctos, ENTONCES EL SISTEMA muestra "No pudimos ingresar.
  Revisá el correo y la contraseña", sin decir cuál de los dos falló.
- RF-1c. SI una cuenta de correo y contraseña no es de prueba, o la demo está desactivada, ENTONCES EL
  SISTEMA no la deja entrar.
- RF-2. CUANDO un visitante vuelve de Google *(Google: spec de publicación.)* con la identidad confirmada, EL SISTEMA crea su cuenta si
  no existe e inicia la sesión.
- RF-3. SI el ingreso con Google falla *(Google: spec de publicación.)* o la persona lo cancela, ENTONCES EL SISTEMA vuelve a la pantalla
  de ingreso con el mensaje "No pudimos entrar con Google. Probá de nuevo", sin crear nada.
- RF-4. EL SISTEMA mantiene la sesión en ese dispositivo hasta que la persona sale o pasa un tiempo sin
  usar la app: **60 días** para clientes e invitados, **30 días** para Colo.
- RF-5. CUANDO la persona elige "Salir", EL SISTEMA cierra la sesión en ese dispositivo y vuelve a la
  página pública.
- RF-5b. CUANDO Colo elige "Salir de todos los dispositivos", EL SISTEMA cierra todas sus sesiones (por
  ejemplo, si pierde el celular).

**Rol de barbero**
- RF-6. CUANDO entra con Google la cuenta *(Google: spec de publicación.)* cuyo email coincide (sin importar mayúsculas) con el email de
  Colo configurado fuera del código, EL SISTEMA le da el rol de barbero. Cualquier otra cuenta es cliente.
- RF-7. SI el email de Colo no está configurado *(Google: spec de publicación.)*, ENTONCES nadie tiene el rol de barbero (salvo Colo
  (demo) mientras los usuarios de prueba estén activos).
- RF-7b. SI Google no confirma *(Google: spec de publicación.)* que el email está verificado, ENTONCES esa cuenta nunca tiene el rol de
  barbero.
- RF-7c. CUANDO cambia el email de Colo *(Google: spec de publicación.)* configurado, la cuenta anterior pierde el rol de barbero en su
  próximo pedido, aunque tenga una sesión abierta.
- RF-8. SI alguien sin rol de barbero intenta abrir una pantalla de Colo, ENTONCES EL SISTEMA muestra
  "No tenés acceso a esta pantalla", sin mostrar ningún dato.

**Perfil del cliente con cuenta**
- RF-9. MIENTRAS el perfil de un cliente con cuenta está incompleto, EL SISTEMA le pide completarlo antes
  de mostrarle cualquier otra pantalla de cliente: nombre (precargado desde Google y editable), teléfono
  (obligatorio) y cumpleaños (opcional). A Colo no se le pide perfil de cliente.
- RF-10. SI el teléfono no es un celular argentino válido, ENTONCES EL SISTEMA lo rechaza con "Revisá el
  número: tiene que ser un celular, con código de área". Si parece del exterior, agrega "Si tu número no
  es de Argentina, escribile a Colo".
- RF-10b. SI el nombre no cumple la definición, ENTONCES EL SISTEMA lo rechaza con "El nombre tiene que
  tener entre 2 y 40 letras".
- RF-11. SI el teléfono ya pertenece a otra cuenta, ENTONCES EL SISTEMA lo rechaza con "Ese teléfono ya
  está registrado. Si es tuyo, escribile a Colo", con el enlace a WhatsApp.
- RF-12. SI el teléfono pertenece a un invitado, ENTONCES EL SISTEMA une al invitado con la cuenta: las
  faltas del invitado pasan a la cuenta, lo que hizo como invitado no suma para los descuentos, los
  turnos **futuros** del invitado pasan a verse y manejarse desde la cuenta, y los **pasados** no los ve
  el cliente (Colo sí). Si la unión fue un error, la deshace Colo (spec de clientes).
- RF-13. MIENTRAS el cumpleaños está vacío, EL SISTEMA muestra en el perfil "Si no cargás tu
  cumpleaños, no vas a tener el descuento de cumpleaños".
- RF-14. CUANDO un cliente con cuenta cambia su nombre, teléfono o cumpleaños desde su perfil, EL
  SISTEMA aplica las mismas reglas (RF-10 a RF-12) y registra cada cambio de teléfono con el número
  anterior, quién lo cambió y cuándo. El registro se borra a los 12 meses.

**Invitado**
- RF-15. CUANDO un visitante elige "Entrar como invitado", EL SISTEMA muestra "Como invitado no acumulás
  visitas para los descuentos. Podés crear tu cuenta con Google cuando quieras" y le pide nombre y
  teléfono.
- RF-16. SI el teléfono pertenece a una cuenta con Google, ENTONCES EL SISTEMA no lo deja entrar como
  invitado y le dice "Ese teléfono tiene una cuenta. Entrá con Google". *(Protege al titular: nadie
  puede sacar turnos a su nombre poniendo su número.)*
- RF-17. SI el teléfono ya pertenece a un invitado, ENTONCES EL SISTEMA lo reconoce como el mismo
  cliente para la política de faltas y no cambia el nombre guardado. En ese dispositivo, el invitado
  solo ve y maneja los turnos que sacó desde ese mismo dispositivo. *(El teléfono no se verifica:
  así, quien pone el número de otro invitado no ve ni cancela sus turnos. Lo que sí puede es sacar
  turnos nuevos que cuentan para las faltas de ese teléfono; Colo puede anular faltas que no
  correspondan, en la spec de asistencia y faltas. Quien quiera protección total, crea su cuenta: RF-16.)*
- RF-18. EL SISTEMA recuerda al invitado en ese dispositivo hasta que sale (RF-4, RF-5).
- RF-18b. SI desde una misma conexión se intenta entrar como invitado más de 5 veces en una hora,
  ENTONCES EL SISTEMA lo rechaza con "Esperá un rato y probá de nuevo" (contra bots y contra probar
  teléfonos para averiguar cuáles tienen cuenta).

**Pantalla de Colo**
- RF-19. CUANDO Colo entra, EL SISTEMA le muestra su inicio con la lista de clientes registrados, del más
  reciente al más antiguo, de a 50 con "Ver más": sobrenombre (si tiene) y nombre, teléfono y si es
  cuenta o invitado. *(Desde la spec de reserva, los invitados sin ningún turno no aparecen.)*
- RF-20. EL SISTEMA permite a Colo poner, cambiar o borrar el sobrenombre de un cliente desde esa lista.
  Donde Colo ve a un cliente, se muestra el sobrenombre primero y el nombre al lado.
- RF-21. EL SISTEMA nunca muestra el sobrenombre al cliente ni a nadie sin rol de barbero.

**Usuarios de prueba (D-11)**
- RF-22. MIENTRAS los usuarios de prueba están activos, EL SISTEMA muestra al final de la pantalla de
  ingreso la lista de cuentas de prueba, cada una con su rol y su correo: **Colo (barbero)**, **Cliente
  de prueba 1** y **Cliente de prueba 2**. CUANDO se toca una, EL SISTEMA completa el correo y la
  contraseña en el formulario, sin mostrar la contraseña. *(Igual que Corralap.)*
- RF-22b. MIENTRAS una sesión es de prueba, EL SISTEMA muestra arriba de todo una franja fija "Modo de
  prueba · Salir", para que nunca se confunda con la app real.
- RF-23. EL SISTEMA trata a Colo (demo) como barbero, con permiso para cambiar todo (D-15).
- RF-24. CUANDO se desactivan los usuarios de prueba en la configuración, EL SISTEMA deja de mostrar los
  botones de prueba, rechaza cualquier ingreso de prueba aunque alguien tenga la dirección, y cierra las
  sesiones de prueba abiertas en su próximo pedido. Mientras tanto, siguen activos sin importar cuántos
  clientes se registren.
- RF-25. *(Al editar el perfil, un cliente de prueba conserva " (demo)" al final del nombre.)*
  EL SISTEMA marca todos los datos de prueba (usuarios, clientes y lo que generen) con una marca
  que ningún dato real puede tener, y ofrece un comando para que una persona los borre juntos antes de
  publicar, sin tocar datos reales.

## Requisitos no funcionales

- RNF-1. **Seguridad de la sesión:** la sesión viaja en una cookie que el código del navegador no puede
  leer; nunca en la dirección ni en el almacenamiento del navegador.
- RNF-2. **Datos personales:** nombre, teléfono, email, cumpleaños y sobrenombre nunca aparecen en la
  dirección, en los logs ni en mensajes de error. El email de Colo no está en el repositorio.
- RNF-3. **Base de datos:** cada cliente solo puede leer y cambiar sus propios datos, y solo el barbero
  ve los de todos; lo garantiza el servidor y lo comprueban tests contra la base.
- RNF-4. **Scripts:** las pantallas con sesión no permiten scripts en línea sin autorizar (se cierra la
  concesión de la CSP de la spec 001 para estas pantallas).
- RNF-5. **Accesibilidad y diseño:** como en la 001 (`DESIGN.md`, 360 px, teclado, contraste AA, claro y
  oscuro), con los errores de cada campo anunciados y junto al campo.
- RNF-6. **Velocidad:** con el 4G lento simulado de la 001, la pantalla de ingreso aparece en menos de
  2 s y entrar como invitado o guardar el perfil responde en menos de 1 s. La página pública sigue
  cumpliendo el RNF-3 de la 001 (se vuelve a medir).
- RNF-7. **Portabilidad:** nada de esta spec depende de servicios propios de Vercel (D-16: el hosting
  definitivo se elige al publicar).

## Casos límite

1. *(Google)* La persona cancela en la pantalla de Google → vuelve al ingreso con el mensaje de RF-3.
2. *(Google)* La cuenta de Google no tiene nombre → el campo nombre aparece vacío y es obligatorio.
2b. Correo de prueba con la contraseña equivocada → RF-1b.
3. "11 3816-3491", "011 15 3816-3491" y "+54 9 11 3816-3491" son el mismo teléfono.
4. Un fijo ("4555-1234", sin código de área) se rechaza (RF-10).
5. Dos cuentas cargan el mismo teléfono al mismo tiempo → una lo consigue y la otra ve RF-11.
6. Un invitado vuelve otro día desde otro celular con el mismo teléfono → es el mismo cliente para las
   faltas, pero desde ese celular no ve los turnos que sacó desde el otro (RF-17).
6b. Alguien pone el teléfono de otro invitado → no ve ni cancela los turnos de esa persona; los turnos
   que saque sí cuentan para las faltas de ese teléfono (RF-17, riesgo aceptado en D-12).
7. Un invitado pone el teléfono de alguien con cuenta → RF-16.
8. El email de Colo está configurado en mayúsculas y la cuenta de Google en minúsculas → igual es Colo.
9. El email de Colo todavía no se configuró → Colo entra como cliente (RF-7). Al configurarlo, en su
   próximo ingreso es barbero.
10. Alguien guardó la dirección del ingreso de prueba y la usa después de desactivar la demo → se
    rechaza (RF-24).
11. Hay una sesión de Colo (demo) abierta cuando se desactiva la demo → en su próximo pedido se cierra
    (RF-24).
12. Un cliente borra las cookies → tiene que volver a entrar; si es invitado, con su teléfono vuelve a
    ser el mismo (RF-17).
13. Un cliente intenta abrir la lista de clientes de Colo → RF-8.
14. Un invitado con un turno para la semana que viene crea su cuenta con el mismo teléfono → ve ese turno
    desde la cuenta; no ve los que ya pasaron (RF-12).
15. Alguien prueba 6 teléfonos en una hora como invitado → el sexto se rechaza (RF-18b).
16. Una cuenta de Google con el email de Colo pero sin verificar → es cliente (RF-7b).

## Fuera de alcance

- **Ingreso con Google y cuenta real de Colo** (RF-2, RF-3, RF-6 a RF-7c): spec de publicación, junto
  con apagar la demo y el hosting definitivo (D-16).
- Reservar, cancelar y reprogramar (spec 004). Personas a cargo (spec 004: "¿para quién es el turno?").
- Ficha del cliente, edición del teléfono por Colo y búsqueda de clientes (spec de clientes).
- Ajustes de Colo: franjas, paso, bloqueos y servicios (spec 003).
- Permiso de notificaciones (spec de PWA y notificaciones).
- Verificar el teléfono por SMS (cuesta plata; riesgo aceptado en D-12).
- Eliminar la cuenta y los datos personales (pendiente; ver dudas).

## Criterios de finalización

- Todos los RF y RNF con tests o evidencia, incluidos tests contra la base de los permisos (RNF-3).
- En el entorno de Vercel: Gonzalo entra con las tres cuentas de prueba y como invitado; como Colo
  (barbero) ve la lista de clientes y pone un sobrenombre; como cliente de prueba completa su perfil.
- `MEMORY.md` actualizado.

## Dudas abiertas

- (Resuelto 2026-11-21) Un invitado con el teléfono de otro invitado: RF-17 limita lo que puede ver y
  hacer al dispositivo; el riesgo que queda (turnos nuevos que suman faltas) se acepta en D-12.
- [NECESITA ACLARACIÓN] ¿Hace falta, ya en la primera versión, que un cliente pueda pedir que se borren
  sus datos (Ley 25.326 de protección de datos personales)? Propuesta: por ahora lo pide por WhatsApp y
  Colo lo resuelve; la pantalla llega con la spec de clientes.
