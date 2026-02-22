-- Tipos de transacción
INSERT INTO types (name) VALUES
('DEPOSITO'),
('RETIRO_CAJERO'),
('TRANSFERENCIA'),
('COMPRA_TARJETA'),
('PAGO_TARJETA'),
('OTRO');

-- Categorías
INSERT INTO categories (name, type) VALUES
-- Ingresos
('Salario', 'INGRESO'),
('Freelance', 'INGRESO'),
('Dividendos', 'INGRESO'),
('Otros Ingresos', 'INGRESO'),
-- Gastos - Hogar
('Alquiler', 'GASTO'),
('Hipoteca', 'GASTO'),
('Servicios Hogar', 'GASTO'),
-- Gastos - Alimentación
('Supermercado', 'GASTO'),
('Restaurantes', 'GASTO'),
-- Gastos - Transporte
('Gasolina', 'GASTO'),
('Transporte Público', 'GASTO'),
('Uber/Taxi', 'GASTO'),
('Mantenimiento Vehículo', 'GASTO'),
-- Gastos financieros
('Pago Tarjeta Crédito', 'GASTO'),
('Préstamos', 'GASTO'),
-- Gastos estilo de vida`
('Suscripciones', 'GASTO'),
('Ropa', 'GASTO'),
('Tecnología', 'GASTO'),
-- Gastos personales
('Salud', 'GASTO'),
('Educación', 'GASTO'),
('Otros Gastos', 'GASTO');