const { Pool } = require('pg');

// PostgreSQL bazasiga ulanish sozlamalari
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'postgres',
  password: 'zafar1717',
  port: 5432,
});

pool.on('connect', () => {
  console.log('Maʼlumotlar bazasiga muvaffaqiyatli ulandi!');
});

module.exports = pool;
