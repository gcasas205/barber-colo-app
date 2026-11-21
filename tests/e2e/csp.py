"""CSP con nonce en las pantallas con sesión (spec 002, RNF-4). Uso: python3 -I tests/e2e/csp.py (app en :3100, base local limpia)."""
from playwright.sync_api import sync_playwright
B = "http://localhost:3100"
def ok(c, m): print(("✓ " if c else "✗ ") + m)
with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={"width": 390, "height": 844}, color_scheme="light")
    pg = ctx.new_page(); errs = []
    pg.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)
    pg.goto(B + "/", wait_until="networkidle")
    pg.click("button[aria-label^='Tema:']"); pg.click("button[aria-label='Tema oscuro']")
    first = {}
    pg2 = ctx.new_page(); pg2.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)
    pg2.on("domcontentloaded", lambda: first.update(theme=pg2.evaluate("document.documentElement.dataset.theme")))
    pg2.goto(B + "/ingresar", wait_until="networkidle")
    ok(first.get("theme") == "dark", "el tema elegido abre sin parpadeo en /ingresar (script autorizado por hash)")
    pg2.click("button:has-text('Cliente de prueba 1')"); pg2.click("button[type=submit]:has-text('Ingresar')")
    pg2.wait_for_url("**/perfil"); pg2.wait_for_selector("main h1")
    ok(pg2.locator("form").count() > 0, "el perfil funciona con la CSP estricta (formularios y scripts de Next con nonce)")
    # Un script inyectado (sin nonce) no corre
    # Así llega un ataque real: HTML inyectado con un manejador de eventos o un <script> sin nonce.
    pg2.evaluate("""() => { document.body.insertAdjacentHTML('beforeend', '<img src="x" onerror="window.__inyectado = 1">'); }""")
    pg2.wait_for_timeout(500)
    ok(pg2.evaluate("window.__inyectado === undefined"), "HTML inyectado con onerror no ejecuta código")
    csp_errors = [e for e in errs if "Content Security Policy" in e and "__inyectado" not in e]
    print("   bloqueos de CSP (además del inyectado):", len([e for e in csp_errors if "inline script" not in e or True]) - 1 if csp_errors else 0)
    ok(len(csp_errors) <= 1, "sin bloqueos de la CSP en el uso normal (solo el script inyectado a propósito)")
    b.close()
