"""Pruebas de punta a punta de la spec 004b (personas a cargo). Uso: python3 -I tests/e2e/a_cargo.py [URL]
Sin URL usa la app local en :3100. Usa la cuenta "Cliente de prueba 1" (lo que crea lleva "(demo)") y deja todo
como estaba: cancela los turnos y quita a la persona a cargo."""
import os, sys
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo
from playwright.sync_api import sync_playwright

B = (sys.argv[1] if len(sys.argv) > 1 else "http://localhost:3100").rstrip("/")
SHOTS = "/tmp/shots"; os.makedirs(SHOTS, exist_ok=True)
BA = ZoneInfo("America/Argentina/Buenos_Aires")
DIAS = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"]
MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"]
HIJO = "Tomi Prueba"
fails = []

def ok(c, m):
    print(("✓ " if c else "✗ ") + m)
    if not c: fails.append(m)

def target_day(offset):
    d = datetime.now(BA).date() + timedelta(days=offset)
    while d.weekday() == 6: d += timedelta(days=1)
    return d

def day_label(d): return f"{DIAS[d.weekday()]} {d.day} de {MESES[d.month - 1]}"

def login(b, account):
    ctx = b.new_context(viewport={"width": 390, "height": 844}); pg = ctx.new_page()
    pg.goto(B + "/", wait_until="networkidle")
    pg.click(f"button:has-text('{account}')"); pg.click("button[type=submit]:has-text('Ingresar')")
    pg.wait_for_url(lambda u: "/turnos" in u or "/colo" in u, timeout=15000); pg.wait_for_load_state("networkidle")
    return ctx, pg

def main_(pg): return pg.locator("main:visible")

def cancel_all(pg):
    """Deja la cuenta sin turnos (de una corrida anterior)."""
    pg.goto(B + "/turnos", wait_until="networkidle")
    for _ in range(6):
        m = main_(pg)
        if not m.locator("button:has-text('Cancelar turno')").count(): return
        m.locator("button:has-text('Cancelar turno')").first.click()
        m.locator("button:has-text('Sí, cancelar')").click()
        m.locator("text=Cancelaste").wait_for(timeout=10000)
        pg.goto(B + "/turnos", wait_until="networkidle")

def remove_child(pg, name=HIJO):
    pg.goto(B + "/perfil", wait_until="networkidle")
    row = main_(pg).locator(f"li:has(p:text-is('{name}'))").first
    if not row.count(): return False
    row.locator("button:has-text('Quitar')").click()
    if row.locator("button:has-text('Sí, quitar')").count():
        row.locator("button:has-text('Sí, quitar')").click()
        main_(pg).locator(f"text=Quitaste a {name}").wait_for(timeout=10000)
        return True
    return False

def pick(pg, d, nth=0):
    m = main_(pg)
    for _ in range(3):
        btn = m.locator(f"button[aria-label^='{day_label(d)},']")
        if btn.count(): break
        m.locator("button[aria-label='Semana siguiente']").click()
    btn.click()
    starts = m.locator("button[aria-label$='elegir este horario']")
    label = starts.nth(nth).inner_text().strip()
    starts.nth(nth).click()
    m.locator(f"aside:has-text('{label}')").wait_for()
    return label

def who(pg, label):
    """El botón de "¿Para quién es?" (spec 004c: opciones lado a lado)."""
    return main_(pg).locator(f"[role=radiogroup] [role=radio]:has-text('{label}')")

def book(pg):
    """Reservar desde el resumen y volver a Inicio (spec 004c)."""
    main_(pg).locator("aside button:has-text('Reservar')").click()
    pg.wait_for_url("**/turnos*", timeout=15000); main_(pg).locator("[role=status]").wait_for(timeout=10000)

with sync_playwright() as p:
    b = p.chromium.launch()
    day = target_day(4)
    ctx, pg = login(b, "Cliente de prueba 1")
    pg.wait_for_timeout(800)
    cancel_all(pg)
    for name in (HIJO, "Tomi", "Tomi", "Tomi"): remove_child(pg, name)

    # RF-1 a RF-4: Mi perfil, agregar y editar.
    pg.goto(B + "/perfil", wait_until="networkidle")
    sec = main_(pg).locator("section[aria-labelledby=titulo-a-cargo]")
    ok(sec.count() == 1, "RF-1: Mi perfil muestra 'Personas a cargo'")
    sec.locator("button:has-text('Agregar persona')").click()
    form = sec.locator("form[aria-label='Agregar persona']")
    form.locator("button[type=submit]").click()
    form.locator("text=El nombre tiene que tener").wait_for(timeout=8000); ok(True, "RF-2: sin nombre no se agrega")
    form.locator("label:has-text('Nombre') input").fill("Tomi")
    form.locator("select[aria-label='Día']").select_option("12"); form.locator("select[aria-label='Mes']").select_option("3")
    form.locator("button[type=submit]").click()
    sec.locator("text=Agregaste a Tomi").wait_for(timeout=10000)
    ok("Cumple el 12 de marzo" in sec.inner_text(), "RF-2: se agrega con su cumpleaños")
    row = sec.locator("li:has(p:text-is('Tomi'))")
    row.locator("button[aria-label='Editar a Tomi']").click()
    edit = sec.locator("form[aria-label='Editar a Tomi']")
    edit.locator("label:has-text('Nombre') input").fill(HIJO)
    edit.locator("button[type=submit]").click()
    sec.locator(f"p:text-is('{HIJO}')").wait_for(timeout=10000); ok(True, "RF-4: se edita el nombre")
    pg.screenshot(path=f"{SHOTS}/a-cargo-perfil.png", full_page=True)
    pg.goto(B + "/perfil", wait_until="networkidle")
    ok(main_(pg).locator(f"p:text-is('{HIJO}')").count() == 1, "RF-4: lo editado queda guardado")

    # RF-8 a RF-13: reservar para el hijo y para el titular, seguidos (en Reservar; spec 004c).
    pg.goto(B + "/reservar", wait_until="networkidle")
    m = main_(pg)
    ok(m.locator("h2:text-is('¿Para quién es?')").count() == 1, "RF-8: pregunta para quién es el turno")
    who(pg, f"Para {HIJO}").click()
    pick(pg, day, 0)
    ok(f"para {HIJO}" in main_(pg).locator("aside").inner_text(), "RF-9: el resumen dice para quién")
    book(pg)
    ok(f"Reservaste el turno de {HIJO}" in main_(pg).inner_text(), "RF-9: reserva para la persona a cargo")
    ok(main_(pg).locator("a:has-text('Reservar turno')").count() == 1, "RF-13: sigue ofreciendo reservar")
    pg.goto(B + "/reservar", wait_until="networkidle")
    hijo_btn = who(pg, f"Para {HIJO}")
    ok(hijo_btn.is_disabled() and "Ya tiene turno" in hijo_btn.inner_text(), "RF-8: quien ya tiene turno no se puede elegir, con el motivo")
    who(pg, "Para mí").click()
    pick(pg, day, 1)
    book(pg)
    m = main_(pg)
    ok(m.locator("article").count() == 2, "RF-10, RF-12: dos turnos de la cuenta a la vez, seguidos")
    ok(m.locator(f"article[aria-label='Turno de {HIJO}']").count() == 1 and m.locator("article[aria-label='Tu próximo turno']").count() == 1, "RF-12: cada turno dice para quién es")
    # La cuenta puede tener otras personas a cargo (en producción las carga quien prueba): con alguien libre se
    # sigue ofreciendo reservar; si todos tienen, no.
    free = [x.strip() for x in m.locator("section[aria-label] h2").all_inner_texts()]
    if free:
        ok(m.locator("a:has-text('Reservar turno')").count() == 1 and "Vos" not in free and HIJO not in free,
           f"RF-13: con otras personas libres ({', '.join(free)}) se ofrece reservar")
    else:
        ok(m.locator("a:has-text('Reservar turno')").count() == 0, "RF-13: si todos tienen turno, no se ofrece reservar")
    pg.screenshot(path=f"{SHOTS}/a-cargo-turnos.png", full_page=True)

    # RF-6: no se quita a quien tiene un turno futuro.
    pg.goto(B + "/perfil", wait_until="networkidle")
    row = main_(pg).locator(f"li:has(p:text-is('{HIJO}'))")
    row.locator("button:has-text('Quitar')").click()
    ok(row.locator("text=primero cancelá ese turno").count() == 1 and row.locator("a:has-text('Ir a los turnos')").count() == 1, "RF-6: con turno futuro no se quita y se muestra el turno")

    # RF-16: la agenda muestra a cargo de quién. RF-14: Colo cancela y el titular ve el aviso con el nombre.
    ctxc, colo = login(b, "Colo (barbero)")
    colo.goto(f"{B}/colo?dia={day.isoformat()}", wait_until="networkidle")
    item = colo.locator(f"main:visible li:has(p:has-text('{HIJO}'))").first
    ok(item.count() == 1 and "A cargo de" in item.inner_text(), "RF-16: la agenda muestra 'A cargo de' el titular")
    ok(item.locator("a[href^='https://wa.me/']").count() == 1, "RF-16: con el WhatsApp del titular")
    item.locator("button:has-text('Cancelar')").click()
    item.locator("label:has-text('Motivo') input").fill("Prueba a cargo")
    item.locator("button:has-text('Cancelar el turno')").click()
    colo.wait_for_timeout(1500)
    ctxc.close()
    pg.goto(B + "/turnos", wait_until="networkidle")
    aviso = main_(pg).inner_text()
    ok(f"Colo canceló el turno de {HIJO}" in aviso and "Prueba a cargo" in aviso, "RF-14: el titular ve el aviso con el nombre de la persona")
    main_(pg).locator("button:has-text('Entendido')").click(); pg.wait_for_timeout(1000)

    # RF-5: sin turno futuro, se quita.
    ok(remove_child(pg), "RF-5: sin turno futuro, se quita")
    pg.goto(B + "/perfil", wait_until="networkidle")
    ok(main_(pg).locator(f"p:text-is('{HIJO}')").count() == 0, "RF-5: ya no aparece")

    # Deja todo como estaba.
    cancel_all(pg)
    b.close()

print("FALLARON:", fails) if fails else print("todo en verde")
sys.exit(1 if fails else 0)
