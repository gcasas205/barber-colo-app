"""Pruebas de punta a punta de la spec 004 (reservar, cancelar y reprogramar). Uso: python3 -I tests/e2e/turnos.py [URL]
Sin URL usa la app local en :3100. En producción no crea invitados (D-12: nada de clientes reales de prueba) y
deja cancelado todo lo que reserva. Velocidad (RNF-1, 4G lento): reservar < 1 s; ingreso < 1,5 s."""
import os, statistics, sys, time
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo
from playwright.sync_api import sync_playwright

B = (sys.argv[1] if len(sys.argv) > 1 else "http://localhost:3100").rstrip("/")
PROD = not B.startswith("http://localhost")
SHOTS = "/tmp/shots"; os.makedirs(SHOTS, exist_ok=True)
BA = ZoneInfo("America/Argentina/Buenos_Aires")
DIAS = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"]
MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"]
fails = []

def ok(c, m):
    print(("✓ " if c else "✗ ") + m)
    if not c: fails.append(m)

def target_day(offset):
    """Un día de lunes a sábado, `offset` días o más adelante (fuera del plazo de 4 h)."""
    d = datetime.now(BA).date() + timedelta(days=offset)
    while d.weekday() == 6: d += timedelta(days=1)
    return d

def day_label(d): return f"{DIAS[d.weekday()]} {d.day} de {MESES[d.month - 1]}"

def login(b, account, viewport=(390, 844)):
    ctx = b.new_context(viewport={"width": viewport[0], "height": viewport[1]})
    pg = ctx.new_page()
    pg.goto(B + "/", wait_until="networkidle")
    pg.click(f"button:has-text('{account}')"); pg.click("button[type=submit]:has-text('Ingresar')")
    pg.wait_for_url(lambda u: "/turnos" in u or "/colo" in u, timeout=15000); pg.wait_for_load_state("networkidle")
    return ctx, pg

def cancel_existing(pg):
    """Deja al cliente sin turno (de una corrida anterior). Inicio (004c): una chapa por turno."""
    if "/turnos" not in pg.url: pg.goto(B + "/turnos", wait_until="networkidle")
    main = pg.locator("main:visible")
    while main.locator("button:has-text('Cancelar turno')").count():
        main.locator("button:has-text('Cancelar turno')").first.click()
        main.locator("button:has-text('Sí, cancelar')").click()
        main.locator("text=Cancelaste").wait_for(timeout=10000)
        pg.goto(B + "/turnos", wait_until="networkidle")

def pick(pg, d, nth=0):
    """En Reservar (004c), elige el día `d` (pasando de semana si hace falta) y el horario número `nth`."""
    if "/reservar" not in pg.url:
        pg.locator("nav[aria-label=Secciones]:visible a:has-text('Reservar')").click(); pg.wait_for_url("**/reservar*")
        pg.locator("main:visible #titulo-reservar").wait_for()
    main = pg.locator("main:visible")
    for _ in range(3):
        btn = main.locator(f"button[aria-label^='{day_label(d)},']")
        if btn.count(): break
        main.locator("button[aria-label='Semana siguiente']").click()
    btn.click()
    starts = main.locator("button[aria-label$='elegir este horario']")
    label = starts.nth(nth).inner_text().strip()
    starts.nth(nth).click()
    main.locator(f"aside:has-text('{label}')").wait_for()
    return label

def reserve(pg, name=None, phone=None, expect_home=True):
    """Toca "Reservar" en el resumen; si pide nombre y celular (RF-11 de la 004c), los carga y vuelve a tocar."""
    aside = pg.locator("main:visible aside")
    aside.locator("button:has-text('Reservar')").click()
    if name and aside.locator("label:has-text('Tu nombre') input").count():
        aside.locator("label:has-text('Tu nombre') input").fill(name)
        aside.locator("label:has-text('Tu celular') input").fill(phone)
        aside.locator("button:has-text('Reservar')").click()
    if expect_home:
        pg.wait_for_url("**/turnos*", timeout=15000); pg.locator("main:visible [role=status]").wait_for(timeout=10000)

with sync_playwright() as p:
    b = p.chromium.launch()
    day = target_day(3)

    # RF-1: la pantalla principal es el ingreso.
    ctx = b.new_context(viewport={"width": 360, "height": 800}); pg = ctx.new_page()
    pg.goto(B + "/", wait_until="networkidle")
    ok(pg.locator("main:visible button:has-text('Entrar como invitado')").count() == 1 and pg.locator("main:visible input[type=email]").count() == 1, "RF-1: la principal es el ingreso")
    pg.goto(B + "/turnos", wait_until="networkidle"); ok(pg.url.rstrip("/") == B, "RF-3: sin sesión, /turnos lleva al ingreso")
    pg.goto(B + "/ingresar", wait_until="networkidle"); ok(pg.url.rstrip("/") == B, "RF-3: /ingresar sigue andando (lleva a la principal)")
    ctx.close()

    # Cliente 1: reserva (con datos si faltan), ve "Tu turno", reprograma.
    ctx1, c1 = login(b, "Cliente de prueba 1", (360, 800))
    ok("/turnos" in c1.url, "RF-2, RF-5: el cliente entra directo a los turnos")
    account_phone = None  # el celular de esta cuenta, para probar el caso 12
    cancel_existing(c1)
    first = pick(c1, day, 1)
    reserve(c1, "Cliente Uno", "11 5555-0101")
    card = c1.inner_text("main:visible article[aria-label='Tu próximo turno']")
    ok(first in card and "Reservado" in card and "Reservaste tu turno" in c1.inner_text("main:visible"), f"RF-8: 'Tu próximo turno' con el horario {first} y estado Reservado")
    c1.screenshot(path=f"{SHOTS}/tu-turno-360.png", full_page=True)
    c1.goto(B + "/perfil", wait_until="networkidle"); account_phone = c1.input_value("input[name=phone]:visible")
    c1.goto(B + "/turnos", wait_until="networkidle")
    c1.locator("main:visible a:has-text('Cambiar horario')").click(); c1.wait_for_url("**/reservar?cambiar=*")
    c1.locator("main:visible h1:text-is('Elegí el horario nuevo')").wait_for()
    second = pick(c1, day, 3)
    c1.locator("main:visible aside button:has-text('Cambiar horario')").click()
    c1.wait_for_url("**/turnos*"); c1.locator("main:visible").locator("text=tu turno pasó").wait_for(timeout=10000)
    ok(second in c1.inner_text("main:visible"), f"RF-16: el turno pasó a las {second}")

    # Cliente 2: reserva otro horario del mismo día (para que Colo lo cancele).
    ctx2, c2 = login(b, "Cliente de prueba 2")
    cancel_existing(c2)
    taken = pick(c2, day, 5)
    reserve(c2, "Cliente Dos", "11 5555-0102")
    ok(True, f"cliente 2 reservó a las {taken}")
    # RF-10: con un turno, no se ofrece reservar otro.
    ok(c2.locator("main:visible a:has-text('Reservar turno')").count() == 0, "RF-10: con un turno futuro, Inicio no ofrece reservar")
    c2.goto(B + "/reservar", wait_until="networkidle")
    ok(c2.locator("main:visible button[aria-label$='elegir este horario']").count() == 0 and "Ya tenés un turno" in c2.inner_text("main:visible"), "RF-10: ni en Reservar")

    # Colo: agenda con "Nuevo", choque con Ajustes y cancelación con motivo.
    ctxc, colo = login(b, "Colo (barbero)", (360, 800))
    ok("/colo" in colo.url and colo.locator("nav[aria-label=Secciones]:visible").count() == 1, "RF-21: Colo entra a la agenda")
    colo.goto(f"{B}/colo?dia={day.isoformat()}", wait_until="networkidle")
    agenda = colo.inner_text("main:visible")
    ok(second in agenda and taken in agenda and "Nuevo" in agenda, "RF-22: la agenda del día muestra los dos turnos, marcados Nuevo")
    colo.screenshot(path=f"{SHOTS}/agenda-360.png", full_page=True)
    colo.goto(f"{B}/colo?dia={day.isoformat()}", wait_until="networkidle")
    ok("Nuevo" not in colo.inner_text("main:visible"), "RF-23: en la visita siguiente ya no son nuevos")
    # RF-27: un bloqueo sobre esos turnos no se guarda.
    colo.goto(B + "/colo/ajustes", wait_until="networkidle")
    nuevo = colo.locator("main:visible [aria-labelledby=titulo-nuevo-bloqueo]")
    nuevo.locator("input[type=date]").first.fill(day.isoformat()); nuevo.locator("input[type=date]").nth(1).fill(day.isoformat())
    nuevo.locator("button:has-text('Bloquear')").click()
    nuevo.locator("[aria-label='Turnos que quedarían afuera']").wait_for(timeout=10000)
    ok(nuevo.locator("[aria-label='Turnos que quedarían afuera'] a").count() >= 2, "RF-27: el bloqueo no se guarda y lista los turnos con enlace a la agenda")
    colo.goto(f"{B}/colo?dia={day.isoformat()}", wait_until="networkidle")
    item = colo.locator(f"main:visible li:has(p:has-text('{taken}'))").first
    item.locator("button:has-text('Cancelar')").click()
    item.locator("button:has-text('Cancelar el turno')").click()
    item.locator("text=Escribí el motivo").wait_for(timeout=8000); ok(True, "RF-24: sin motivo no cancela")
    item.locator("label:has-text('Motivo') input").fill("Prueba de la app")
    item.locator("button:has-text('Cancelar el turno')").click()
    colo.wait_for_timeout(1500)
    ok(taken not in colo.inner_text("main:visible ul[aria-label='Turnos del día']"), "RF-24: Colo canceló el turno con motivo")

    # RF-20: el cliente 2 ve el aviso con el motivo.
    c2.goto(B + "/turnos", wait_until="networkidle")
    aviso = c2.inner_text("main:visible")
    ok("Colo canceló tu turno" in aviso and "Prueba de la app" in aviso, "RF-20: el cliente ve que Colo canceló y el motivo")
    c2.locator("main:visible button:has-text('Entendido')").click(); c2.wait_for_timeout(1200)
    ok("Colo canceló" not in c2.inner_text("main:visible"), "RF-20: el aviso se cierra")
    ok(c2.locator("main:visible a:has-text('Reservar turno')").count() == 1, "el cliente 2 vuelve a poder reservar")

    # RF-14: el cliente 1 cancela a tiempo.
    c1.goto(B + "/turnos", wait_until="networkidle")
    cancel_existing(c1)
    ok(c1.locator("main:visible a:has-text('Reservar turno')").count() == 1 and c1.locator("main:visible article").count() == 0, "RF-14: cancelado; Inicio ofrece reservar")

    # Invitado (solo local: en producción no se crean invitados reales).
    if not PROD:
        g = b.new_context(viewport={"width": 360, "height": 800}).new_page()
        g.goto(B + "/", wait_until="networkidle"); g.click("button:has-text('Entrar como invitado')"); g.wait_for_url("**/turnos")
        ok(True, "RF-4: el invitado entra con un toque")
        pick(g, day, 0)
        reserve(g, "Invitado Prueba", account_phone, expect_home=False)
        g.locator("main:visible").locator("text=tiene una cuenta").wait_for(timeout=10000)
        ok(True, "RF-11, caso 12: con el celular de una cuenta no reserva")
        phone = f"11 6{int(time.time()) % 1000:03d}-{int(time.time() * 7) % 10000:04d}"
        g.locator("main:visible aside label:has-text('Tu celular') input").fill(phone)
        g.locator("main:visible aside button:has-text('Reservar')").click()
        g.wait_for_url("**/turnos*"); g.locator("main:visible article").first.wait_for(timeout=10000)
        ok(True, "RF-7: el invitado reserva cargando nombre y celular")
        cancel_existing(g)

    for ctx in (ctx1, ctx2, ctxc): ctx.close()

    # RNF-1: velocidad con 4G lento simulado (reservar y después cancelar, dentro del margen de 10 min).
    entries, books = [], []
    for i in range(3):
        ctx = b.new_context(viewport={"width": 390, "height": 844}); pg = ctx.new_page()
        cdp = ctx.new_cdp_session(pg)
        cdp.send("Network.enable")
        cdp.send("Network.emulateNetworkConditions", {"offline": False, "latency": 150, "downloadThroughput": 200_000, "uploadThroughput": 93_750})
        cdp.send("Emulation.setCPUThrottlingRate", {"rate": 4})
        t = time.perf_counter(); pg.goto(B + "/", wait_until="commit"); pg.wait_for_selector("main:visible button:has-text('Entrar como invitado')")
        entries.append(time.perf_counter() - t)
        pg.wait_for_load_state("networkidle")  # sin la página hidratada, el botón de la cuenta no completa el formulario
        pg.click("button:has-text('Cliente de prueba 1')"); pg.click("button[type=submit]:has-text('Ingresar')")
        pg.wait_for_url("**/turnos", timeout=30000, wait_until="commit"); pg.locator("main:visible h1").first.wait_for(timeout=30000)
        cancel_existing(pg)
        pick(pg, target_day(4), i)
        # El resumen está fijo abajo (004c): se mide del toque a Inicio con el turno.
        reservar = pg.locator("main:visible aside button:has-text('Reservar')")
        pg.wait_for_timeout(500)
        t = time.perf_counter(); reservar.click()
        pg.locator("main:visible article[aria-label='Tu próximo turno']").wait_for(timeout=20000); books.append(time.perf_counter() - t)
        cancel_existing(pg)
        ctx.close()
    e, k = statistics.median(entries), statistics.median(books)
    print(f"   ingreso: {e * 1000:.0f} ms · reservar: {k * 1000:.0f} ms (medianas)")
    ok(e < 1.5, "RNF-1: la pantalla de ingreso en menos de 1,5 s"); ok(k < 1.0, "RNF-1: reservar en menos de 1 s")
    b.close()

print("FALLARON:", fails) if fails else print("todo en verde")
sys.exit(1 if fails else 0)
