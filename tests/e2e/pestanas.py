"""Pestañas del panel de Colo: al ir y volver, queda marcada la de la pantalla (Next conserva las pantallas
visitadas y las vuelve a mostrar tal cual). Con celular simulado, con y sin 4G lento. Uso: python3 -I tests/e2e/pestanas.py [URL]"""
import sys
from playwright.sync_api import sync_playwright
B = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:3100"
PATH = {"Agenda": "/colo", "Clientes": "/colo/clientes", "Ajustes": "/colo/ajustes"}
bad = []
with sync_playwright() as p:
    b = p.chromium.launch()
    for throttle in (False, True):
        ctx = b.new_context(viewport={"width": 390, "height": 844}, has_touch=True, is_mobile=True); pg = ctx.new_page()
        pg.goto(B + "/", wait_until="networkidle"); pg.click("button:has-text('Colo (barbero)')"); pg.click("button[type=submit]:has-text('Ingresar')")
        pg.wait_for_url("**/colo*"); pg.wait_for_load_state("networkidle")
        if throttle:
            cdp = ctx.new_cdp_session(pg); cdp.send("Network.enable")
            cdp.send("Network.emulateNetworkConditions", {"offline": False, "latency": 150, "downloadThroughput": 200_000, "uploadThroughput": 93_750})
            cdp.send("Emulation.setCPUThrottlingRate", {"rate": 4})
        for tab in ["Clientes", "Agenda", "Clientes", "Ajustes", "Agenda", "Ajustes", "Clientes", "Agenda", "Agenda"]:
            pg.locator("nav[aria-label=Secciones]:visible a", has_text=tab).tap()
            pg.wait_for_url("**" + PATH[tab] + "*", timeout=20000); pg.wait_for_timeout(2500 if throttle else 800)
            active = [a.inner_text().strip() for a in pg.locator("nav[aria-label=Secciones]:visible a[data-on]").all()]
            ok = active == [tab]
            print(("✓" if ok else "✗"), "red lenta" if throttle else "normal", "→", tab, "marcada:", active)
            if not ok: bad.append(tab)
        ctx.close()
    b.close()
print("FALLARON", bad) if bad else print("todo en verde")
sys.exit(1 if bad else 0)
