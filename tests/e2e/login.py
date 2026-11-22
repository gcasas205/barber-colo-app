"""Pruebas de punta a punta del ingreso (spec 002, actualizadas a la entrada de la spec 004).
Uso: python3 -I tests/e2e/login.py (con la app en :3100 y la base local)."""
from playwright.sync_api import sync_playwright
B = "http://localhost:3100"
fails = []
def ok(c, m):
    print(("✓ " if c else "✗ ") + m)
    if not c: fails.append(m)

with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={"width": 360, "height": 800})
    pg = ctx.new_page(); errs = []
    pg.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)
    pg.goto(B + "/", wait_until="networkidle")
    pg.screenshot(path="/tmp/shots/ingresar-360.png", full_page=True)
    # Contraseña equivocada (RF-1b)
    pg.fill("input[name=email]:visible", "colo@example.com"); pg.fill("input[name=password]:visible", "mala")
    pg.click("button:has-text('Ingresar')"); pg.wait_for_selector("main:visible [role=alert]")
    ok("Revisá el correo y la contraseña" in pg.inner_text("main:visible [role=alert]"), "RF-1b: contraseña equivocada → mensaje sin decir cuál falló")
    # Cliente de prueba 1 (RF-22): tocar la cuenta completa el formulario
    pg.click("button:has-text('Cliente de prueba 1')")
    ok(pg.input_value("input[name=email]:visible") == "cliente1@example.com" and pg.input_value("input[name=password]:visible") != "", "RF-22: la cuenta de prueba completa el formulario")
    pg.click("button[type=submit]:has-text('Ingresar')"); pg.wait_for_url("**/turnos")
    ok(pg.locator("text=Modo de prueba").count() > 0, "RF-22b: franja 'Modo de prueba'")
    ok(pg.locator("header >> text=Mi perfil").count() == 1, "con sesión, la chapa dice 'Mi perfil'")
    # Perfil (RF-9 a RF-14): opcional desde la spec 004; los errores siguen junto a cada campo.
    pg.goto(B + "/perfil", wait_until="networkidle")
    pg.fill("input[name=name]:visible", "A"); pg.fill("input[name=phone]:visible", "4555-1234")
    pg.click("main:visible button[type=submit]"); pg.wait_for_selector("#error-nombre:has-text('2 y 40')")
    ok("celular, con código de área" in pg.inner_text("#error-celular"), "RF-10, RF-10b: errores junto a cada campo")
    pg.fill("input[name=name]:visible", "Martín"); pg.fill("input[name=phone]:visible", "011 15 3816-3491")
    pg.select_option("select[name=birthDay]:visible", "29"); pg.select_option("select[name=birthMonth]:visible", "2")
    pg.click("main:visible button[type=submit]"); pg.wait_for_timeout(1500)
    pg.goto(B + "/perfil", wait_until="networkidle")
    ok(pg.input_value("input[name=phone]:visible") == "11 3816-3491" and pg.input_value("input[name=name]:visible") == "Martín (demo)", "el perfil guardado vuelve normalizado y con la marca (demo)")
    ok(pg.evaluate("document.cookie").find("sb-") == -1, "RNF-1: la cookie de sesión no se puede leer desde el navegador")
    pg.click("text=Salir >> nth=0"); pg.wait_for_url(B + "/")
    ok(pg.locator("main:visible input[type=email]").count() == 1, "RF-5: salir vuelve a la pantalla de ingreso")

    # Invitado con un toque (spec 004, RF-4)
    g = b.new_context(viewport={"width": 390, "height": 844}).new_page()
    g.goto(B + "/", wait_until="networkidle")
    g.click("button:has-text('Entrar como invitado')"); g.wait_for_url("**/turnos")
    g.goto(B + "/perfil", wait_until="networkidle")
    ok("Entraste como invitado" in g.inner_text("main:visible"), "RF-15: el invitado entra y ve su cuenta")

    # Tema: menú compacto (RF-17 de la 001)
    t = b.new_context(viewport={"width": 360, "height": 800}).new_page()
    t.goto(B + "/", wait_until="networkidle")
    t.click("button[aria-label^='Tema:']"); t.click("button[aria-label='Tema oscuro']")
    ok(t.evaluate("document.documentElement.dataset.theme") == "dark", "tema oscuro desde el menú")
    print("errores de consola:", [e for e in errs if "401" not in e][:3])
    b.close()

# --- Panel de Colo (spec 002, T7; desde la 004, Clientes es una sección) ---
with sync_playwright() as p:
    b = p.chromium.launch()
    # Un cliente de prueba no ve nada de Colo (RF-8, caso 13)
    c = b.new_context(viewport={"width": 390, "height": 844}).new_page()
    c.goto(B + "/", wait_until="networkidle")
    c.click("button:has-text('Cliente de prueba 2')"); c.click("button[type=submit]:has-text('Ingresar')"); c.wait_for_url("**/turnos")
    for path in ("/colo", "/colo/clientes"):
        c.goto(B + path, wait_until="networkidle"); c.wait_for_selector("main:visible h1")
        ok("No tenés acceso" in c.inner_text("main:visible h1") and "Martín" not in c.inner_text("main:visible"), f"RF-8: un cliente que abre {path} no ve datos")
    # Colo (demo)
    pg = b.new_context(viewport={"width": 390, "height": 844}).new_page()
    pg.goto(B + "/", wait_until="networkidle")
    pg.click("button:has-text('Colo (barbero)')"); pg.click("button[type=submit]:has-text('Ingresar')"); pg.wait_for_url("**/colo")
    pg.click("main:visible a:has-text('Clientes')"); pg.wait_for_selector("main:visible h1:has-text('Clientes')")
    text = pg.inner_text("main:visible")
    ok("Martín" in text and "Cuenta" in text, "RF-19: Colo ve la lista de clientes")
    ok(pg.locator("text=Modo de prueba").count() > 0, "RF-22b: franja de prueba también en el panel")
    pg.click("button[aria-label^='Poner sobrenombre a Martín']")
    pg.fill("input[name=nickname]:visible", "el cordobés"); pg.click("button:has-text('Guardar')")
    pg.wait_for_selector("h3:has-text('el cordobés')")
    ok(pg.locator("h3:has-text('el cordobés')").inner_text().startswith("el cordobés"), "RF-20: el sobrenombre aparece primero")
    # El cliente no ve su sobrenombre (RF-21)
    m = b.new_context(viewport={"width": 390, "height": 844}).new_page()
    m.goto(B + "/", wait_until="networkidle")
    m.click("button:has-text('Cliente de prueba 1')"); m.click("button[type=submit]:has-text('Ingresar')"); m.wait_for_url("**/turnos")
    m.goto(B + "/perfil", wait_until="networkidle")
    ok("cordobés" not in m.content(), "RF-21: el cliente nunca ve su sobrenombre")
    b.close()

print("FALLARON:", fails) if fails else print("todo en verde")
