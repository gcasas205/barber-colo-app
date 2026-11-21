# Clarificación — Spec 002: Login y perfil

Revisión como QA del borrador (2026-11-21). Solo se detecta: las resoluciones se anexan al final.

## 1. Ambigüedades (no se pueden verificar tal como están)

1. **RF-4, duración de la sesión.** "Hasta que la persona sale" no tiene límite: un celular perdido o
   prestado queda con la sesión abierta para siempre, incluida la de Colo, que ve los datos de todos.
2. **RF-10, "celular argentino válido".** No dice qué largo ni qué prefijos se aceptan, ni qué pasa con un
   número del exterior (un turista o un cliente con línea uruguaya).
3. **Nombre (RF-9, RF-15).** No hay reglas: largo mínimo y máximo, solo espacios, emojis.
4. **RF-1, "un enlace desde la página pública".** No dice dónde ni con qué texto.
5. **RF-19, lista de clientes.** No tiene límite ni búsqueda: con cientos de clientes es inmanejable y
   pesada. La búsqueda está fuera de alcance, pero el tamaño no está acotado.
6. **RF-22, "Modo de prueba".** No dice si una sesión de prueba se distingue mientras se usa. Alguien
   puede olvidar que está en la demo y creer que está usando la app real (o al revés).
7. **RF-25, borrar los datos de prueba.** No dice quién lo hace, cuándo ni cómo.

## 2. Contradicciones

8. **RF-24 contra los criterios de finalización.** Los criterios piden que Gonzalo entre con Google y
   como invitado; según la definición, eso crea el **primer cliente real** y apaga los usuarios de
   prueba en el mismo momento. Lo mismo pasa con cualquier prueba real antes del lanzamiento.
9. **RF-12 contra RF-17 y la reserva.** Si un invitado con un turno **futuro** crea su cuenta con el
   mismo teléfono, RF-12 dice que el cliente no ve los turnos de invitado: no podría cancelar ni
   reprogramar su próximo turno desde la cuenta.

## 3. Casos límite no cubiertos

10. **Colo y el perfil.** No se dice si a Colo (con cuenta de Google) también se le pide teléfono y
    cumpleaños (RF-9 habla de "cliente con cuenta"), ni si Colo cuenta como "cliente real" para RF-24.
11. **Unión equivocada (RF-12, RF-14).** Un cliente con cuenta que tipea mal su teléfono y pone el de un
    invitado se une con otra persona. No hay forma de deshacerlo.
12. **Abuso del ingreso como invitado.** Nada limita cuántos invitados se crean ni cuántos teléfonos se
    prueban: un bot puede llenar la lista de clientes de Colo, y el mensaje de RF-16 deja averiguar qué
    teléfonos tienen cuenta.
13. **Cambio de email de Colo (RF-6).** Si la variable cambia mientras la cuenta anterior tiene una
    sesión abierta, no se dice si esa sesión pierde el rol en el momento o en el próximo ingreso.
14. **Cuenta de Google sin email verificado.** No se dice qué pasa si Google devuelve un email no
    verificado: con RF-6, alguien podría intentar presentarse con el email de Colo.

## 4. Conflictos con la constitución

15. **Principio 8 (nada sensible en logs) y RF-14.** El registro de cambios de teléfono guarda números
    anteriores: es un dato personal más que se conserva sin plazo.
16. Ninguno otro: se usan las piezas del stack aprobado (Supabase Auth con Google, sesión en cookie).

## 5. Impacto en lo que ya está en producción

17. **Página pública.** RF-1 agrega un enlace en la página de la 001; RNF-4 cambia la CSP solo para las
    pantallas con sesión, pero no dice cómo se comprueba que la página pública siga igual de rápida
    (RNF-3 de la 001, hoy con margen).
18. **Datos de prueba en producción.** Los usuarios de prueba viven en la base real: un error en RF-25
    podría borrar datos reales si no hay una marca imposible de confundir.

## Resoluciones (aprobadas por Gonzalo, 2026-11-21)

- **8:** los usuarios de prueba **no se apagan solos**: se desactivan a mano cuando Gonzalo decida
  publicar la app real (D-11 actualizada). Con eso, las pruebas con cuentas reales no los apagan.
- **1:** sesión de 60 días sin uso para clientes e invitados y de 30 para Colo, más "Salir de todos los
  dispositivos" para Colo (RF-4, RF-5b).
- **2, 3:** reglas de teléfono y de nombre en Definiciones, RF-10 y RF-10b.
- **4:** "Ingresar" en la chapa superior de la página pública (RF-1).
- **5:** lista de a 50 con "Ver más" (RF-19).
- **6:** franja fija "Modo de prueba · Salir" (RF-22b).
- **7, 18:** marca imposible de confundir y comando que corre una persona (RF-25).
- **9:** los turnos futuros del invitado pasan a la cuenta; los pasados no se ven (RF-12).
- **10:** a Colo no se le pide perfil de cliente (RF-9).
- **11:** la unión equivocada la deshace Colo en la spec de clientes (RF-12).
- **12:** máximo 5 ingresos como invitado por hora desde una misma conexión (RF-18b).
- **13, 14:** RF-7c y RF-7b.
- **15:** el registro de cambios de teléfono se borra a los 12 meses (RF-14).
- **17:** se vuelve a medir la velocidad de la página pública (RNF-6).
- Además: D-16, el hosting definitivo se elige al publicar; nada de esta spec depende de Vercel (RNF-7).
