// Conector + mysql2/promise
const { Connector } = require('@google-cloud/cloud-sql-connector');
const mysql = require('mysql2/promise');

// Crea un único conector para toda la app
const connector = new Connector();

let pool;

// Devuelve (y memoiza) el pool
async function getPool() {
    if (pool) return pool;

    const isCloudEnvironment = process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'test'; // Ambos están en la nube

    let poolConfig = {
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        waitForConnections: true,
        connectionLimit: Number(process.env.DB_POOL || 10),
        queueLimit: 0
    };

    if (isCloudEnvironment) {
        // Configuración para Google Cloud SQL (producción)
        const clientOpts = await connector.getOptions({
            instanceConnectionName: process.env.INSTANCE_CONNECTION_NAME,
            ipType: process.env.DB_IP_TYPE || 'PUBLIC',
        });

        poolConfig = {
            ...poolConfig,
            ...clientOpts
        };

        console.log('Conectando a Google Cloud SQL (Producción)');
    } else {
        // Configuración para desarrollo local
        poolConfig = {
            ...poolConfig,
            host: process.env.DB_HOST || 'localhost',
            port: process.env.DB_PORT || 3306
        };

        console.log('Conectando a base de datos local (Desarrollo)');
    }

    pool = mysql.createPool(poolConfig);

    return pool;
}

// Cierre ordenado al terminar el proceso
async function closeAll() {
    try {
        if (pool) await pool.end();
    } finally {
        connector.close();
    }
}

process.on('SIGINT', async () => { await closeAll(); process.exit(0); });
process.on('SIGTERM', async () => { await closeAll(); process.exit(0); });

module.exports = { getPool };