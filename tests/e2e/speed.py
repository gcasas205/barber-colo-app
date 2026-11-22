"""RNF-3: velocidad con 4G lento simulado (1,6 Mbps, 150 ms) y procesador 4 veces más lento.
Uso: python3 -I tests/e2e/speed.py [URL]   (por defecto http://localhost:3100/)
Criterio: los horarios aparecen en menos de 2 s; cambiar servicio, día o semana tarda menos de 200 ms."""
import statistics, sys, time
from playwright.sync_api import sync_playwright

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:3100/"
RUNS = 5

def enter(pg, base):
    """Spec 004: los horarios están en /turnos, con sesión. Entra con el cliente de prueba 1 (sin turno)."""
    pg.goto(base.rstrip("/") + "/", wait_until="networkidle")
    pg.click("button:has-text('Cliente de prueba 1')"); pg.click("button[type=submit]:has-text('Ingresar')")
    pg.wait_for_url("**/turnos", wait_until="commit"); pg.wait_for_selector("#titulo-horarios")

with sync_playwright() as p:
    b = p.chromium.launch()
    loads, service, day, week = [], [], [], []
    for _ in range(RUNS):
        ctx = b.new_context(viewport={"width": 390, "height": 844})
        pg = ctx.new_page()
        cdp = ctx.new_cdp_session(pg)
        cdp.send("Network.enable")
        cdp.send("Network.setCacheDisabled", {"cacheDisabled": True})  # cada corrida como primera visita
        cdp.send("Network.emulateNetworkConditions", {"offline": False, "latency": 150, "downloadThroughput": 200_000, "uploadThroughput": 93_750})
        cdp.send("Emulation.setCPUThrottlingRate", {"rate": 4})
        # Spec 004: se mide la carga de /turnos con la sesión ya abierta.
        enter(pg, BASE); pg.wait_for_load_state("load")
        t = time.perf_counter()
        pg.goto(BASE.rstrip("/") + "/turnos", wait_until="commit")
        pg.wait_for_selector("#titulo-horarios")
        loads.append(time.perf_counter() - t)
        pg.wait_for_load_state("load")  # que termine de hidratar antes de tocar
        pg.wait_for_function("() => !!document.querySelector('button[aria-pressed]')")
        time.sleep(0.5)

        def timed(action, done):
            t = time.perf_counter(); action(); pg.wait_for_function(done); return time.perf_counter() - t
        service.append(timed(lambda: pg.click("button:has-text('Claritos')"),
                             "() => document.querySelector('#titulo-horarios')?.textContent.includes('claritos')"))
        # Primero la semana (la actual puede no tener otro día con lugar) y después un día de esa semana.
        week.append(timed(lambda: pg.click("button[aria-label='Semana siguiente']"),
                          "() => !!document.querySelector('button[aria-label=\"Semana anterior\"]')"))
        day_btn = pg.locator("ul button[aria-label*='libres']:not([aria-pressed='true'])").first
        label = day_btn.get_attribute("aria-label").split(",")[0].split(" ")[1]
        day.append(timed(lambda: day_btn.click(), f"() => document.querySelector('#titulo-horarios')?.textContent.includes(' {label} ')"))
        ctx.close()
    b.close()

def line(name, xs, limit):
    worst = max(xs)
    print(f"{'✓' if worst < limit else '✗'} {name}: mediana {statistics.median(xs)*1000:.0f} ms · peor {worst*1000:.0f} ms (límite {limit*1000:.0f} ms)")
    return worst < limit
ok = all([
    line("carga hasta ver los horarios", loads, 2.0),
    line("cambiar de servicio", service, 0.2),
    line("cambiar de día", day, 0.2),
    line("cambiar de semana", week, 0.2),
])
sys.exit(0 if ok else 1)
