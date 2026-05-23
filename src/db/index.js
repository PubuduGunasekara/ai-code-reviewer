const { Pool } = require('pg');

const isProduction = process.env.NODE_ENV === 'production';

const pool = new Pool(
  process.env.DATABASE_URL
    ? {
        // Railway / any cloud provider — use the full connection string
        connectionString: process.env.DATABASE_URL,
        ssl: isProduction ? { rejectUnauthorized: false } : false,
      }
    : {
        // Local development — use individual vars with sensible defaults
        host:     process.env.DB_HOST     || 'localhost',
        port:     process.env.DB_PORT     || 5432,
        database: process.env.DB_NAME     || 'codereview',
        user:     process.env.DB_USER     || 'postgres',
        password: process.env.DB_PASSWORD || 'password',
      },
  {
    max:                   10,
    idleTimeoutMillis:     30000,
    connectionTimeoutMillis: 2000,
  }
);

pool.on('connect', () => {
  console.log('Connected to PostgreSQL');
});

pool.on('error', (err) => {
  console.error(' PostgreSQL pool error:', err);
  process.exit(-1);
});

const query = async (text, params) => {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log(' Query:', { text, duration: `${duration}ms`, rows: result.rowCount });
    return result;
  } catch (error) {
    console.error(' Query error:', { text, error });
    throw error;
  }
};

module.exports = { pool, query };