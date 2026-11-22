"""La agenda guardada no queda vieja: Colo va a Clientes, entra un turno (directo en la base local) y, al
volver a Agenda, aparece. Solo local (usa psql contra la base de supabase start). Uso: python3 -I tests/e2e/agenda_fresca.py"""
import subprocess, sys
from playwright.sync_api import sync_playwright
B = "http://localhost:3100"; DB = "postgresql://postgres:postgres@127.0.0.1:54332/postgres"
def sql(q): return subprocess.run(["psql", DB, "-Atc", q], capture_output=True, text=True, check=True).stdout.strip()
with sync_playwright() as p:
    b = p.chromium.launch(); ctx = b.new_context(viewport={"width": 390, "height": 844}, has_touch=True, is_mobile=True); pg = ctx.new_page()
    pg.goto(B + "/", wait_until="networkidle"); pg.click("button:has-text('Colo (barbero)')"); pg.click("button[type=submit]:has-text('Ingresar')")
    pg.wait_for_url("**/colo*"); pg.wait_for_load_state("networkidle"); pg.wait_for_timeout(800)
    pg.locator("main:visible nav a", has_text="Clientes").tap(); pg.wait_for_url("**/colo/clientes"); pg.wait_for_timeout(800)
    pg.locator("main:visible nav a", has_text="Agenda").tap(); pg.wait_for_url("**/colo"); pg.wait_for_timeout(800)
    pg.locator("main:visible nav a", has_text="Clientes").tap(); pg.wait_for_url("**/colo/clientes"); pg.wait_for_timeout(800)
    cid = sql("insert into app.customers (role, full_name, phone_e164, is_demo) values ('guest', 'Fresco Prueba (demo)', '+5491179990001', true) returning id").splitlines()[0]
    aid = sql(f"""insert into app.appointments (customer_id, service_id, period, status, price_cents)
      values ('{cid}', (select id from app.services where name='Corte'),
      tstzrange((current_date + time '23:15') at time zone 'America/Argentina/Buenos_Aires', (current_date + time '23:45') at time zone 'America/Argentina/Buenos_Aires'), 'reserved', 1800000) returning id""").splitlines()[0]
    try:
        pg.locator("main:visible nav a", has_text="Agenda").tap(); pg.wait_for_url("**/colo")
        pg.locator("main:visible >> text=Fresco Prueba").first.wait_for(timeout=4000)
        print("✓ el turno nuevo aparece al volver a la agenda")
        ok = True
    except Exception as e:
        print("✗ no apareció:", str(e)[:120]); ok = False
    finally:
        sql(f"delete from app.appointment_events where appointment_id='{aid}'; delete from app.appointments where id='{aid}'; delete from app.customers where id='{cid}'")
    b.close()
sys.exit(0 if ok else 1)
