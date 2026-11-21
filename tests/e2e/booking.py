"""Pruebas de punta a punta de la página de horarios (cambio 01). Uso: python3 -I tests/e2e/booking.py [URL]"""
import sys
from playwright.sync_api import sync_playwright

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:3100/"
ok = True
def check(cond, msg):
    global ok
    print(("✓ " if cond else "✗ ") + msg)
    ok = ok and cond

with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page(viewport={"width": 390, "height": 844})
    pg.clock.install()  # controla Date, performance.now y setInterval
    pg.goto(BASE, wait_until="networkidle")
    pg.wait_for_selector("text=Horarios libres")
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
    check(not [r for r in requests if "/_next/static" not in r], f"RF-15: ningún pedido al servidor al elegir ({len(requests)} pedidos)")
    check(pg.locator("span[role='img'][aria-label*='sin lugar']").count() >= 1, "RF-5: los días sin lugar no son botones")

    # RF-16: con la página abierta, al pasar 40 minutos desaparecen los primeros horarios de hoy.
    pg2 = b.new_page(viewport={"width": 390, "height": 844})
    pg2.clock.install()
    pg2.goto(BASE, wait_until="networkidle")
    first_before = pg2.locator("#titulo-horarios ~ div li").first.inner_text()
    heading = pg2.inner_text("#titulo-horarios")
    pg2.clock.run_for(40 * 60 * 1000)
    first_after = pg2.locator("#titulo-horarios ~ div li").first.inner_text() if pg2.locator("#titulo-horarios ~ div li").count() else "(ninguno)"
    check(not heading.startswith("Hoy") or first_after != first_before, f"RF-16: {heading.split('·')[0].strip()}: primer horario {first_before} → {first_after} tras 40 min")
    b.close()
sys.exit(0 if ok else 1)
