// Load environment variables
require('dotenv').config({ path: '.env.local' });

const { Pool } = require('pg');

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function checkServicesColumns() {
  try {
    const result = await pool.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'services' 
      ORDER BY ordinal_position
    `);
    
    console.log('Services table columns:');
    result.rows.forEach(row => {
      console.log('  -', row.column_name);
    });
    
    await pool.end();
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkServicesColumns();
