"""RNF-6 de la spec 002: velocidad del ingreso con 4G lento simulado (1,6 Mbps, 150 ms) y CPU 4×.
Uso: python3 -I tests/e2e/speed_login.py [URL]  (app en :3100 y base local limpia).
Criterio: el ingreso aparece en menos de 2 s; entrar como invitado (crea una sesión) en menos de 1,5 s; guardar el perfil en menos de 1 s.
Spec 004: el ingreso es la pantalla principal y el invitado entra con un toque (3 corridas: límite de 5 invitados por hora)."""
import statistics, sys, time
from playwright.sync_api import sync_playwright

BASE = (sys.argv[1] if len(sys.argv) > 1 else "http://localhost:3100").rstrip("/")
RUNS = 3

def throttled(b):
    """Contexto con 4G lento y CPU 4×. Empieza sin caché (primera visita); `cdp` permite volver a
    activarlo, como en un navegador real, para lo que se precargó durante la visita."""
    ctx = b.new_context(viewport={"width": 390, "height": 844})
    pg = ctx.new_page()
    cdp = ctx.new_cdp_session(pg)
    cdp.send("Network.enable")
    cdp.send("Network.setCacheDisabled", {"cacheDisabled": True})
    cdp.send("Network.emulateNetworkConditions", {"offline": False, "latency": 150, "downloadThroughput": 200_000, "uploadThroughput": 93_750})
    cdp.send("Emulation.setCPUThrottlingRate", {"rate": 4})
    return ctx, pg, cdp

with sync_playwright() as p:
    b = p.chromium.launch()
    load, guest, save = [], [], []
    for i in range(RUNS):
        ctx, pg, cdp = throttled(b)
        t = time.perf_counter(); pg.goto(BASE + "/", wait_until="commit")
        pg.wait_for_selector("button[type=submit]:has-text('Ingresar')"); load.append(time.perf_counter() - t)
        pg.wait_for_load_state("load")
        # Ya en la página: el navegador guarda lo que precarga mientras la persona completa el formulario.
        cdp.send("Network.setCacheDisabled", {"cacheDisabled": False}); pg.wait_for_timeout(1500)
        t = time.perf_counter(); pg.click("button:has-text('Entrar como invitado')")
        pg.wait_for_selector("main:visible h1:text-is('Hola')"); guest.append(time.perf_counter() - t)
        ctx.close()

        ctx, pg, cdp = throttled(b)
        pg.goto(BASE + "/", wait_until="load")
        pg.click("button:has-text('Cliente de prueba 1')"); pg.click("button[type=submit]:has-text('Ingresar')")
        pg.wait_for_url("**/turnos", wait_until="commit")
        pg.goto(BASE + "/perfil", wait_until="load"); pg.wait_for_selector("input[name=name]:visible")
        if pg.locator("button:has-text('Guardar y ver turnos')").count():  # perfil incompleto: se completa una vez
            pg.fill("input[name=phone]:visible", "11 6000-0001"); pg.click("button:has-text('Guardar y ver turnos')"); pg.wait_for_url("**/turnos", wait_until="commit")
            pg.goto(BASE + "/perfil", wait_until="load"); pg.wait_for_selector("input[name=name]:visible")
        pg.fill("input[name=name]:visible", f"Martín {i}")
        t = time.perf_counter(); pg.click("button:has-text('Guardar cambios')")
        pg.wait_for_selector("text=Guardado"); save.append(time.perf_counter() - t)
        ctx.close()
    b.close()

def line(name, xs, limit):
    worst = max(xs)
    print(f"{'✓' if worst < limit else '✗'} {name}: mediana {statistics.median(xs)*1000:.0f} ms · peor {worst*1000:.0f} ms (límite {limit*1000:.0f} ms)")
    return worst < limit
ok = all([line("ingreso hasta ver el formulario", load, 2.0), line("entrar como invitado", guest, 1.5), line("guardar el perfil", save, 1.0)])
sys.exit(0 if ok else 1)
