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
    account_art VARCHAR(20) NOT NULL DEFAULT 'mint', -- arte visual: mint | lavender | peach
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
    expiry_date VARCHAR(5),       -- Vigencia de la tarjeta en formato MM/YY (ej: 11/35)
    cut_off_day TINYINT,          -- Día de corte mensual (1-31), solo para tarjetas de crédito
    card_art VARCHAR(20) NOT NULL DEFAULT 'aurora', -- arte visual: aurora | sunset | ocean
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (account_id) REFERENCES accounts(id)
);

-- Tipos de transacción
CREATE TABLE IF NOT EXISTS types (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL
);

-- Categorías de transacción
CREATE TABLE IF NOT EXISTS categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    type ENUM('INGRESO','GASTO') NOT NULL
);

-- Transacciones
CREATE TABLE IF NOT EXISTS transactions (
    id CHAR(36) PRIMARY KEY,
    user_id CHAR(36) NOT NULL,
    account_id CHAR(36),
    card_id CHAR(36),
    type_id INT NOT NULL,
    category_id INT,
    amount DECIMAL(15,2) NOT NULL,
    description VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (account_id) REFERENCES accounts(id),
    FOREIGN KEY (card_id) REFERENCES cards(id),
    FOREIGN KEY (type_id) REFERENCES types(id),
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