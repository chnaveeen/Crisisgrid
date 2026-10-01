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

  const [columns] = await connection.query(`SHOW COLUMNS FROM incidents`);
  const columnNames = columns.map(c => c.Field);

  if (!columnNames.includes('detection_source')) {
    console.log('[Migration] Adding detection_source to incidents...');
    await connection.query(`
      ALTER TABLE incidents 
      ADD COLUMN detection_source ENUM('Citizen', 'CCTV_AUTO_DETECTION') NOT NULL DEFAULT 'Citizen' AFTER ai_summary
    `);
  }

  if (!columnNames.includes('detection_camera_id')) {
    console.log('[Migration] Adding detection_camera_id to incidents...');
    await connection.query(`
      ALTER TABLE incidents 
      ADD COLUMN detection_camera_id INT NULL AFTER detection_source
    `);
  }

  console.log('[Migration] Incident schema migration completed successfully.');
  const [updatedCols] = await connection.query(`SHOW COLUMNS FROM incidents`);
  console.log('[Migration] Current incidents columns:', updatedCols.map(c => c.Field).join(', '));

  await connection.end();
}

migrate().catch(err => {
  console.error('[Migration Error]:', err);
  process.exit(1);
});
