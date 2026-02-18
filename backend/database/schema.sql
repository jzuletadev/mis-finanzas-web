CREATE DATABASE my_finance_db;
USE my_finance_db;

-- Usuarios
CREATE TABLE IF NOT EXISTS users (
    id CHAR(36) PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Cuentas
CREATE TABLE IF NOT EXISTS accounts (
    id CHAR(36) PRIMARY KEY,
    user_id CHAR(36) NOT NULL,
    account_name VARCHAR(100) NOT NULL,
    account_type ENUM('AHORRO','MONETARIA') DEFAULT 'AHORRO',
    balance DECIMAL(15,2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Tarjetas
CREATE TABLE IF NOT EXISTS cards (
    id CHAR(36) PRIMARY KEY,
    user_id CHAR(36) NOT NULL,
    account_id CHAR(36), -- Cuenta asociada si es débito
    card_type ENUM('CREDITO','DEBITO') NOT NULL,
    card_name VARCHAR(100),
    credit_limit DECIMAL(15,2),
    current_balance DECIMAL(15,2) DEFAULT 0.00,
    due_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (account_id) REFERENCES accounts(id)
);

-- Tipos de transacción
CREATE TABLE IF NOT EXISTS transaction_types (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL
);

-- Insertamos valores básicos
INSERT INTO transaction_types (name) VALUES
('INGRESO'),
('GASTO'),
('RETIRO_CAJERO'),
('PAGO_TARJETA'),
('TRANSFERENCIA');

-- Categorías
CREATE TABLE IF NOT EXISTS categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    type ENUM('INGRESO','GASTO') NOT NULL
);

-- Insertamos categorías básicas para ejemplo
INSERT INTO categories (name, type) VALUES
('Salario', 'INGRESO'),
('Freelance', 'INGRESO'),
('Alquiler', 'GASTO'),
('Comida', 'GASTO'),
('Transporte', 'GASTO'),
('Entretenimiento', 'GASTO'),
('Subscripciones', 'GASTO'),
('Educación', 'GASTO'),
('Salud', 'GASTO');


-- Transacciones
CREATE TABLE IF NOT EXISTS transactions (
    id CHAR(36) PRIMARY KEY,
    user_id CHAR(36) NOT NULL,
    account_id CHAR(36),
    card_id CHAR(36),
    transaction_type_id INT NOT NULL,
    category_id INT,
    amount DECIMAL(15,2) NOT NULL,
    description VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (account_id) REFERENCES accounts(id),
    FOREIGN KEY (card_id) REFERENCES cards(id),
    FOREIGN KEY (transaction_type_id) REFERENCES transaction_types(id),
    FOREIGN KEY (category_id) REFERENCES categories(id)
);

-- Pagos con tarjeta
CREATE TABLE IF NOT EXISTS card_payments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    card_id CHAR(36) NOT NULL,
    account_id CHAR(36) NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (card_id) REFERENCES cards(id),
    FOREIGN KEY (account_id) REFERENCES accounts(id)
);

-- Transferencias entre cuentas
CREATE TABLE IF NOT EXISTS account_transfers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    from_account_id CHAR(36) NOT NULL,
    to_account_id CHAR(36) NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    transfer_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (from_account_id) REFERENCES accounts(id),
    FOREIGN KEY (to_account_id) REFERENCES accounts(id)
);

-- Tabla para refresh tokens (lista blanca)
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  token VARCHAR(512) NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY uq_refresh_token (token)
);