"""Capturas de las pantallas con sesión a 360 y 1440 px, en claro y oscuro (spec 004c), en /tmp/shots/capturas.
Uso: python3 -I tests/e2e/capturas.py [URL]"""
import os, sys
from playwright.sync_api import sync_playwright
B = (sys.argv[1] if len(sys.argv) > 1 else "http://localhost:3100").rstrip("/")
OUT = "/tmp/shots/capturas"; os.makedirs(OUT, exist_ok=True)
SCREENS = {"Cliente de prueba 1": ["/turnos", "/reservar", "/perfil"], "Colo (barbero)": ["/colo", "/colo/clientes", "/colo/ajustes"]}
with sync_playwright() as p:
    b = p.chromium.launch()
    for account, paths in SCREENS.items():
        for scheme in ("light", "dark"):
            for w, h in ((360, 800), (1440, 900)):
                ctx = b.new_context(viewport={"width": w, "height": h}, color_scheme=scheme); pg = ctx.new_page()
                pg.goto(B + "/", wait_until="networkidle"); pg.click(f"button:has-text('{account}')"); pg.click("button[type=submit]:has-text('Ingresar')")
                pg.wait_for_url(lambda u: "/turnos" in u or "/colo" in u); pg.wait_for_load_state("networkidle")
                for path in paths:
                    pg.goto(B + path, wait_until="networkidle"); pg.wait_for_timeout(300)
                    name = f"{path.strip('/').replace('/', '-')}-{w}-{scheme}.png"
                    pg.screenshot(path=f"{OUT}/{name}", full_page=(w == 360))
                ctx.close()
    b.close()
print("capturas en", OUT)
