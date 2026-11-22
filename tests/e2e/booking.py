"""Pruebas de punta a punta de la página de horarios (cambio 01; desde la spec 004c, en /reservar). Uso: python3 -I tests/e2e/booking.py [URL]"""
import sys
from playwright.sync_api import sync_playwright

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:3100/"
ok = True
def check(cond, msg):
    global ok
    print(("✓ " if cond else "✗ ") + msg)
    ok = ok and cond


def enter(pg, base):
    """Spec 004c: los horarios están en Reservar, con sesión. Entra con el cliente de prueba 1 (sin turno)."""
    pg.goto(base.rstrip("/") + "/", wait_until="networkidle")
    pg.click("button:has-text('Cliente de prueba 1')"); pg.click("button[type=submit]:has-text('Ingresar')")
    pg.wait_for_url("**/turnos", wait_until="commit"); pg.goto(base.rstrip("/") + "/reservar", wait_until="commit"); pg.wait_for_selector("#titulo-horarios")

with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page(viewport={"width": 390, "height": 844})
    pg.clock.install()  # controla Date, performance.now y setInterval
    enter(pg, BASE); pg.wait_for_load_state("networkidle")
    url = pg.url
    requests = []
    pg.on("request", lambda r: requests.append(r.url))

    pg.click("button:has-text('Claritos')")
    check("claritos de 2 h" in pg.inner_text("main"), "RF-15: elegir servicio actualiza los horarios")
    day = pg.locator("ul button[aria-label*='libres']").last
    label = day.get_attribute("aria-label")
    day.click()
    check(label.split(",")[0].split(" ")[1] in pg.inner_text("#titulo-horarios"), f"RF-15: elegir día ({label.split(',')[0]})")
    if pg.locator("button[aria-label='Semana siguiente']").count():
        pg.click("button[aria-label='Semana siguiente']")
    check(pg.url == url, "RF-15: la dirección no cambió")
    data = [r for r in requests if "/_next/static" not in r and "_rsc=" not in r]  # _rsc = precarga de enlaces de la cabecera
    check(not data, f"RF-15: ningún pedido de datos al elegir ({len(requests)} pedidos: {[r[-40:] for r in requests]})")
    check(pg.locator("span[role='img'][aria-label*='sin lugar']").count() >= 1, "RF-5: los días sin lugar no son botones")

    # RF-16: con la página abierta, al pasar 40 minutos desaparecen los primeros horarios de hoy.
    pg2 = b.new_page(viewport={"width": 390, "height": 844})
    pg2.clock.install()
    enter(pg2, BASE); pg2.wait_for_load_state("networkidle")
    first_before = pg2.locator("#titulo-horarios ~ div li").first.inner_text()
    heading = pg2.inner_text("#titulo-horarios")
    pg2.clock.run_for(40 * 60 * 1000)
    first_after = pg2.locator("#titulo-horarios ~ div li").first.inner_text() if pg2.locator("#titulo-horarios ~ div li").count() else "(ninguno)"
    check(not heading.startswith("Hoy") or first_after != first_before, f"RF-16: {heading.split('·')[0].strip()}: primer horario {first_before} → {first_after} tras 40 min")
    b.close()
sys.exit(0 if ok else 1)
