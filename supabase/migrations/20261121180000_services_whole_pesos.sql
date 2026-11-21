-- Cambio 01 de la spec 001 (RF-3, RF-13): los precios son pesos enteros, sin centavos.
alter table app.services
  add constraint services_price_whole_pesos check (price_cents % 100 = 0);
