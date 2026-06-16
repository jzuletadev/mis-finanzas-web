-- Mis Finanzas — migraciones incrementales (aplicar manualmente contra MySQL de producción, en orden)

-- 2026-06-16: arte visual seleccionable en tarjetas y cuentas
ALTER TABLE cards ADD COLUMN card_art VARCHAR(20) NOT NULL DEFAULT 'aurora';
ALTER TABLE accounts ADD COLUMN account_art VARCHAR(20) NOT NULL DEFAULT 'mint';
