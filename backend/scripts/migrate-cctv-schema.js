const mysql = require('mysql2/promise');
require('dotenv').config();

async function migrate() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'crisisgrid',
    port: parseInt(process.env.DB_PORT, 10) || 3306
  });

  console.log('[Migration] Connected to database:', process.env.DB_NAME || 'crisisgrid');

  // Check columns on cctv_evidence
  const [columns] = await connection.query(`SHOW COLUMNS FROM cctv_evidence`);
  const columnNames = columns.map(c => c.Field);

  if (!columnNames.includes('capture_start_time')) {
    console.log('[Migration] Adding capture_start_time to cctv_evidence...');
    await connection.query(`ALTER TABLE cctv_evidence ADD COLUMN capture_start_time TIMESTAMP NULL AFTER captured_at`);
  }

  if (!columnNames.includes('capture_end_time')) {
    console.log('[Migration] Adding capture_end_time to cctv_evidence...');
    await connection.query(`ALTER TABLE cctv_evidence ADD COLUMN capture_end_time TIMESTAMP NULL AFTER capture_start_time`);
  }

  if (!columnNames.includes('stream_reference')) {
    console.log('[Migration] Adding stream_reference to cctv_evidence...');
    await connection.query(`ALTER TABLE cctv_evidence ADD COLUMN stream_reference VARCHAR(500) NULL AFTER capture_end_time`);
  }

  if (!columnNames.includes('evidence_type')) {
    console.log('[Migration] Adding evidence_type to cctv_evidence...');
    await connection.query(`ALTER TABLE cctv_evidence ADD COLUMN evidence_type VARCHAR(50) NOT NULL DEFAULT 'snapshot' AFTER stream_reference`);
  }

  if (!columnNames.includes('status')) {
    console.log('[Migration] Adding status to cctv_evidence...');
    await connection.query(`ALTER TABLE cctv_evidence ADD COLUMN status VARCHAR(50) NOT NULL DEFAULT 'captured' AFTER evidence_type`);
  }

  console.log('[Migration] Schema migration completed successfully.');
  const [updatedCols] = await connection.query(`SHOW COLUMNS FROM cctv_evidence`);
  console.log('[Migration] Current cctv_evidence columns:', updatedCols.map(c => c.Field).join(', '));

  await connection.end();
}

migrate().catch(err => {
  console.error('[Migration Error]:', err);
  process.exit(1);
});
