const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'crisisgrid',
  port: Number(process.env.DB_PORT) || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  dateStrings: true
});

// Test connection on startup
(async () => {
  try {
    const connection = await pool.getConnection();
    console.log(`[DB] Connected to MySQL database "${process.env.DB_NAME || 'crisisgrid'}" successfully.`);
    connection.release();
  } catch (err) {
    console.error(`[DB Error] Unable to connect to MySQL:`, err.message);
  }
})();

module.exports = pool;
