"""Velocidad de las pestañas: del toque a la pantalla nueva (título cambiado), en celular simulado.
Mide primera visita y vueltas. Uso: python3 -I tests/e2e/speed_pestanas.py [URL] [--lento]"""
import sys
from playwright.sync_api import sync_playwright
B = next((a for a in sys.argv[1:] if not a.startswith("--")), "http://localhost:3100")
SLOW = "--lento" in sys.argv
PATH = {"Agenda": "/colo", "Clientes": "/colo/clientes", "Ajustes": "/colo/ajustes"}
# Marca el toque y espera a que el título visible de la pantalla cambie (MutationObserver, sin depender de timers).
JS = """(tab) => new Promise((resolve) => {
  const title = () => { const m = [...document.querySelectorAll('main')].find(e => e.offsetParent !== null || e.getClientRects().length);
                        return m ? (m.querySelector('h1,h2')?.textContent ?? '') : ''; };
  const before = title(); const t0 = performance.now();
  const link = [...document.querySelectorAll('nav[aria-label=Secciones] a')].find(a => a.getClientRects().length && a.textContent.includes(tab));
  const obs = new MutationObserver(() => { if (title() !== before) { obs.disconnect(); resolve(Math.round(performance.now() - t0)); } });
  obs.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true });
  link.click();
  setTimeout(() => { obs.disconnect(); resolve(-1); }, 15000);
})"""
with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={"width": 390, "height": 844}, has_touch=True, is_mobile=True); pg = ctx.new_page()
    pg.goto(B + "/", wait_until="networkidle"); pg.click("button:has-text('Colo (barbero)')"); pg.click("button[type=submit]:has-text('Ingresar')")
    pg.wait_for_url("**/colo*"); pg.wait_for_load_state("networkidle"); pg.wait_for_timeout(1500)
    if SLOW:
        cdp = ctx.new_cdp_session(pg); cdp.send("Network.enable")
        cdp.send("Network.emulateNetworkConditions", {"offline": False, "latency": 150, "downloadThroughput": 200_000, "uploadThroughput": 93_750})
    times = []
    for tab in ["Clientes", "Ajustes", "Agenda", "Clientes", "Agenda", "Ajustes", "Clientes", "Ajustes", "Agenda"]:
        ms = pg.evaluate(JS, tab); pg.wait_for_url("**" + PATH[tab] + "*"); pg.wait_for_timeout(700)
        times.append(ms); print(f"  → {tab:9s} {ms} ms")
    ctx.close(); b.close()
print("peor:", max(times), "ms · mediana:", sorted(times)[len(times) // 2], "ms")
