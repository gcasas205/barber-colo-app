"""Pruebas de punta a punta de Ajustes (spec 003). Uso: python3 -I tests/e2e/ajustes.py [URL]
Sin URL usa la app local en :3100. Con la URL de producción no crea servicios (no se pueden borrar) y deja
la agenda como estaba al terminar. Criterio de velocidad (RNF-5, 4G lento): abrir Ajustes < 1,5 s; guardar < 1 s."""
import os, statistics, sys, time
from playwright.sync_api import sync_playwright

B = (sys.argv[1] if len(sys.argv) > 1 else "http://localhost:3100").rstrip("/")
PROD = not B.startswith("http://localhost")
SHOTS = "/tmp/shots"; os.makedirs(SHOTS, exist_ok=True)
fails = []
def ok(c, m):
    print(("✓ " if c else "✗ ") + m)
    if not c: fails.append(m)

def login(b, account, viewport=(390, 844)):
    ctx = b.new_context(viewport={"width": viewport[0], "height": viewport[1]})
    pg = ctx.new_page()
    pg.goto(B + "/ingresar", wait_until="networkidle")
    pg.click(f"button:has-text('{account}')"); pg.click("button[type=submit]:has-text('Ingresar')")
    pg.wait_for_url(lambda u: "/ingresar" not in u, timeout=15000); pg.wait_for_load_state("networkidle")
    return ctx, pg

def saved(section):
    section.locator("[role=status]:has-text('Guardado')").first.wait_for(timeout=8000)
    return True

def public_text(b, weeks=5):
    """Texto de la página pública recorriendo las primeras semanas (avisos, servicios, días)."""
    pg = b.new_page(); pg.goto(B + "/", wait_until="networkidle"); pg.wait_for_selector("main:visible h2:has-text('Servicio')")
    out = [pg.inner_text("main:visible")]
    for _ in range(weeks):
        nxt = pg.locator("button[aria-label='Semana siguiente']")
        if nxt.count() == 0: break
        nxt.click(); pg.wait_for_timeout(150); out.append(pg.inner_text("main:visible"))
    pg.close(); return "\n".join(out)

def public_labels(b):
    """aria-label de los días de la primera semana pública y cantidad de semanas navegables."""
    pg = b.new_page(); pg.goto(B + "/", wait_until="networkidle"); pg.wait_for_selector("main:visible h2:has-text('Día')")
    labels = pg.eval_on_selector_all("main:visible ul.grid-cols-7 [aria-label]", "els => els.map(e => e.getAttribute('aria-label'))")
    weeks = 1
    while pg.locator("button[aria-label='Semana siguiente']").count() and weeks < 20:
        pg.click("button[aria-label='Semana siguiente']"); weeks += 1
    pg.close(); return labels, weeks

with sync_playwright() as p:
    b = p.chromium.launch()

    # Caso 15 / RF-2: un cliente no ve Ajustes.
    ctx, c = login(b, "Cliente de prueba 2")
    c.goto(B + "/colo/ajustes", wait_until="networkidle")
    ok("No tenés acceso" in c.inner_text("main:visible") and "Guardar" not in c.inner_text("main:visible"), "RF-2: un cliente que abre Ajustes no ve ningún dato")
    ctx.close()

    ctx, pg = login(b, "Colo (barbero)", (360, 800))
    errs = []; pg.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)
    pg.goto(B + "/colo", wait_until="networkidle")
    pg.click("main:visible a:has-text('Ajustes')"); pg.wait_for_selector("main:visible h1:has-text('Ajustes')")
    ok(True, "RF-1: Ajustes se abre desde el panel de Colo")
    pg.screenshot(path=f"{SHOTS}/ajustes-360.png", full_page=True)
    main = pg.locator("main:visible")
    franjas = main.locator("section[aria-labelledby=titulo-franjas], [aria-labelledby=titulo-franjas]").first

    # RF-7 y caso 14: copiar el sábado al domingo y guardar.
    franjas.locator("select").filter(has=pg.locator("option:has-text('Sábado')")).first.select_option("6")
    franjas.locator("label:has-text('Domingo') input[type=checkbox]").check()
    franjas.locator("button:has-text('Copiar')").click()
    ok(franjas.locator("li[aria-label=Domingo] select").count() == 4, "RF-7: el domingo recibe las dos franjas del sábado")
    franjas.locator("button:has-text('Guardar horarios')").click(); ok(saved(franjas), "RF-5, RF-25: horarios guardados")
    labels, _ = public_labels(b)
    ok(any(l.startswith("domingo") and "libres" in l for l in labels) or not any(l.startswith("domingo") for l in labels),
       "caso 14: el domingo tiene horarios en la página pública")

    # RF-6: horas inválidas → error junto al día, nada guardado.
    dom = franjas.locator("li[aria-label=Domingo]")
    dom.locator("select").nth(1).select_option(dom.locator("select").nth(1).locator("option").nth(0).get_attribute("value"))
    franjas.locator("button:has-text('Guardar horarios')").click()
    dom.locator("[aria-live=polite]:has-text('cierra antes')").first.wait_for(timeout=8000)
    ok(True, "RF-6: una franja que cierra antes de abrir se marca junto al día")
    # Volver el domingo a "No atiende".
    while dom.locator("button[aria-label^='Sacar la franja']").count():
        dom.locator("button[aria-label^='Sacar la franja']").first.click()
    franjas.locator("button:has-text('Guardar horarios')").click(); saved(franjas)
    ok("No atiende" in dom.inner_text(), "el domingo vuelve a 'No atiende'")

    # RF-9 / caso 1: paso de 20 con Corte de 30.
    paso = main.locator("[aria-labelledby=titulo-paso]")
    paso.locator("select").select_option("20"); paso.locator("button:has-text('Guardar paso')").click()
    paso.locator("text=no coinciden").wait_for(timeout=8000)
    ok("Corte" in paso.inner_text(), "RF-9: no deja cambiar el paso a 20 y nombra el servicio a ajustar")
    paso.locator("select").select_option("15")

    # RF-10, RF-14: bloqueo de horas con aviso, visible en la página pública; después se borra.
    nuevo = main.locator("[aria-labelledby=titulo-nuevo-bloqueo]")
    nuevo.locator("label:has-text('Unas horas')").click()
    day = pg.evaluate("(() => { const d = new Date(Date.now() + 3 * 86400000); return d.toLocaleDateString('sv', { timeZone: 'America/Argentina/Buenos_Aires' }); })()")
    nuevo.locator("input[type=date]").fill(day)
    nuevo.locator("input[type=time]").nth(0).fill("10:00"); nuevo.locator("input[type=time]").nth(1).fill("11:00")
    nuevo.locator("label:has-text('Aviso') input").fill("Prueba de Ajustes")
    nuevo.locator("button:has-text('Bloquear')").click(); saved(nuevo)
    vigentes = main.locator("[aria-labelledby=titulo-vigentes]")
    vigentes.locator("text=Aviso: Prueba de Ajustes").wait_for(timeout=8000); ok(True, "RF-12: el bloqueo aparece en la lista con su aviso")
    ok("10:00 a 11:00: Prueba de Ajustes" in public_text(b), "RF-14: la página pública muestra el aviso con su horario")
    vigentes.locator("button[aria-label*='Prueba'], li:has-text('Prueba de Ajustes') button").first.click()
    vigentes.locator("text=Prueba de Ajustes").wait_for(state="detached", timeout=8000)
    ok(True, "RF-12: el bloqueo se borra")
    # RF-11: bloqueo de horas que ya terminó.
    nuevo.locator("label:has-text('Unas horas')").click()
    yesterday = pg.evaluate("(() => new Date(Date.now() - 86400000).toLocaleDateString('sv', { timeZone: 'America/Argentina/Buenos_Aires' }))()")
    nuevo.locator("input[type=date]").fill(yesterday); nuevo.locator("button:has-text('Bloquear')").click()
    nuevo.locator("text=ya terminó").wait_for(timeout=8000); ok(True, "RF-11: un bloqueo que ya terminó se rechaza junto al campo")
    nuevo.locator("input[type=date]").fill(day)

    # Servicios: editar el precio (y volverlo atrás); en local, también alta, orden, sacar y reactivar.
    servicios = main.locator("#servicios")
    servicios.locator("button[aria-label='Editar Claritos']").click()
    editor = servicios.locator("[aria-label='Editar Claritos']")
    editor.locator("input[inputmode=numeric]").fill("71000"); editor.locator("button:has-text('Guardar cambios')").click()
    servicios.locator("text=Guardaste Claritos").wait_for(timeout=8000)
    ok("$ 71.000" in public_text(b, 0), "RF-16: el precio nuevo se ve en la página pública")
    servicios.locator("button[aria-label='Editar Claritos']").click()
    editor.locator("input[inputmode=numeric]").fill("70000"); editor.locator("button:has-text('Guardar cambios')").click()
    servicios.locator("text=Guardaste Claritos").wait_for(timeout=8000)
    if not PROD:
        nombre = f"Barba {int(time.time()) % 100000}"  # único: los servicios no se borran
        servicios.locator("button:has-text('Agregar servicio')").click()
        alta = servicios.locator("[aria-label='Servicio nuevo']")
        alta.locator("label:has-text('Nombre') input").fill(" corte ")
        alta.locator("input[inputmode=numeric]").fill("9000"); alta.locator("button:has-text('Agregar')").click()
        alta.locator("text=Ya hay otro servicio").wait_for(timeout=8000); ok(True, "RF-17, caso 9: nombre repetido junto al campo")
        alta.locator("label:has-text('Nombre') input").fill(nombre); alta.locator("button:has-text('Agregar')").click()
        servicios.locator(f"text=Agregaste {nombre}").wait_for(timeout=8000)
        servicios.locator(f"button[aria-label='Subir {nombre}']").click(); servicios.locator(f"text=Subiste {nombre}").wait_for(timeout=8000)
        txt = public_text(b, 0); ok(txt.index(nombre) < txt.index("Claritos"), "RF-18: el orden nuevo se ve en la página pública")
        servicios.locator(f"li:has(p:text-is('{nombre}'), span:text-is('{nombre}')) button:has-text('Dejar de ofrecer')").click()
        servicios.locator(f"text={nombre} ya no se ofrece").wait_for(timeout=8000)
        ok("no se ofrece" in servicios.inner_text() and nombre not in public_text(b, 0), "RF-19: el servicio se saca y queda en 'No se ofrecen'")
        servicios.locator(f"li:has(p:text-is('{nombre}'), span:text-is('{nombre}')) button:has-text('Volver a ofrecer')").click()
        servicios.locator(f"text={nombre} se vuelve a ofrecer").wait_for(timeout=8000); ok(True, "RF-20: se vuelve a ofrecer")
        servicios.locator(f"li:has(p:text-is('{nombre}'), span:text-is('{nombre}')) button:has-text('Dejar de ofrecer')").click(); servicios.locator(f"text={nombre} ya no se ofrece").wait_for(timeout=8000)

    # RF-22 a RF-24: días a futuro y WhatsApp.
    reservas = main.locator("[aria-labelledby=titulo-reserva-form]")
    reservas.locator("label:has-text('WhatsApp') input").fill("123")
    reservas.locator("button:has-text('Guardar reservas')").click()
    reservas.locator("text=celular argentino").wait_for(timeout=8000); ok(True, "RF-24: WhatsApp mal escrito, error junto al campo")
    reservas.locator("label:has-text('WhatsApp') input").fill("+54 9 11 3816-3491")
    reservas.locator("label:has-text('Días a futuro') input").fill("91")
    reservas.locator("button:has-text('Guardar reservas')").click()
    reservas.locator("text=entre 1 y 90").wait_for(timeout=8000); ok(True, "RF-24: días a futuro fuera de rango")
    reservas.locator("label:has-text('Días a futuro') input").fill("7")
    reservas.locator("button:has-text('Guardar reservas')").click(); saved(reservas)
    _, weeks = public_labels(b)
    ok(weeks <= 2, f"RF-22, caso 12: con 7 días a futuro la página pública muestra hasta 2 semanas ({weeks})")
    reservas.locator("label:has-text('Días a futuro') input").fill("30")
    reservas.locator("button:has-text('Guardar reservas')").click(); saved(reservas)

    # RF-26: con cambios sin guardar, salir pide confirmación.
    reservas.locator("label:has-text('Días a futuro') input").fill("29")
    asked = []
    pg.once("dialog", lambda d: (asked.append(d.message), d.dismiss()))
    pg.click("a:has-text('Panel de Colo')"); pg.wait_for_timeout(500)
    ok(asked and "sin guardar" in asked[0] and pg.url.endswith("/colo/ajustes"), "RF-26: aviso antes de perder cambios sin guardar")
    reservas.locator("label:has-text('Días a futuro') input").fill("30")
    pg.screenshot(path=f"{SHOTS}/ajustes-360-final.png", full_page=True)
    print("errores de consola:", errs[:3] or "ninguno")
    ctx.close()

    # RNF-5: velocidad con 4G lento simulado.
    opens, saves = [], []
    for _ in range(3):
        ctx, pg = login(b, "Colo (barbero)")
        cdp = ctx.new_cdp_session(pg)
        cdp.send("Network.enable")
        cdp.send("Network.emulateNetworkConditions", {"offline": False, "latency": 150, "downloadThroughput": 200_000, "uploadThroughput": 93_750})
        cdp.send("Emulation.setCPUThrottlingRate", {"rate": 4})
        t = time.perf_counter(); pg.goto(B + "/colo/ajustes", wait_until="commit")
        pg.wait_for_selector("main:visible button:has-text('Guardar paso')"); opens.append(time.perf_counter() - t)
        pg.wait_for_load_state("load")
        paso = pg.locator("main:visible [aria-labelledby=titulo-paso]")
        original = paso.locator("select").input_value(); other = "30" if original != "30" else "15"
        try:
            paso.locator("select").select_option(other); paso.locator("text=Cambios sin guardar").wait_for()
            t = time.perf_counter(); paso.locator("button:has-text('Guardar paso')").click(); saved(paso); saves.append(time.perf_counter() - t)
        finally:
            # Volver al paso original y esperar a que se guarde de verdad antes de cerrar.
            paso.locator("select").select_option(original); paso.locator("text=Cambios sin guardar").wait_for()
            paso.locator("button:has-text('Guardar paso')").click(); saved(paso)
            pg.reload(wait_until="networkidle")
            ok(pg.locator("main:visible [aria-labelledby=titulo-paso] select").input_value() == original, "el paso vuelve a quedar como estaba")
        ctx.close()
    o, s = statistics.median(opens), statistics.median(saves)
    print(f"   abrir Ajustes: {o * 1000:.0f} ms · guardar: {s * 1000:.0f} ms (medianas)")
    ok(o < 1.5, "RNF-5: abrir Ajustes en menos de 1,5 s"); ok(s < 1.0, "RNF-5: guardar en menos de 1 s")
    b.close()

print("FALLARON:", fails) if fails else print("todo en verde")
sys.exit(1 if fails else 0)
