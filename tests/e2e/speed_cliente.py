"""Velocidad del cliente entre Inicio y Mi perfil: del toque a la pantalla nueva, con 4G simulado.
Uso: python3 -I tests/e2e/speed_cliente.py [URL]"""
import sys
from playwright.sync_api import sync_playwright
B = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:3100"
JS = """(text) => new Promise((resolve) => {
  const vis = (e) => e.getClientRects().length > 0;
  const title = () => [...document.querySelectorAll('h1')].filter(vis).map(e => e.textContent).join('|');
  const before = title(); const t0 = performance.now();
  const link = [...document.querySelectorAll('nav[aria-label=Secciones] a')].find(a => vis(a) && a.textContent.includes(text));
  const obs = new MutationObserver(() => { if (title() !== before) { obs.disconnect(); resolve(Math.round(performance.now() - t0)); } });
  obs.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true });
  link.click(); setTimeout(() => { obs.disconnect(); resolve(-1); }, 15000);
})"""
with sync_playwright() as p:
    b = p.chromium.launch(); ctx = b.new_context(viewport={"width": 390, "height": 844}, has_touch=True, is_mobile=True); pg = ctx.new_page()
    pg.goto(B + "/", wait_until="networkidle"); pg.click("button:has-text('Cliente de prueba 1')"); pg.click("button[type=submit]:has-text('Ingresar')")
    pg.wait_for_url("**/turnos"); pg.wait_for_load_state("networkidle"); pg.wait_for_timeout(1500)
    cdp = ctx.new_cdp_session(pg); cdp.send("Network.enable")
    cdp.send("Network.emulateNetworkConditions", {"offline": False, "latency": 150, "downloadThroughput": 200_000, "uploadThroughput": 93_750})
    times = []
    for link, url in [("Mi perfil", "/perfil"), ("Inicio", "/turnos"), ("Reservar", "/reservar"), ("Inicio", "/turnos")] * 2:
        ms = pg.evaluate(JS, link); pg.wait_for_url("**" + url); pg.wait_for_timeout(1200); times.append(ms)
        print(f"  → {url:8s} {ms} ms")
    b.close()
print("peor:", max(times), "ms · mediana:", sorted(times)[len(times) // 2], "ms")
