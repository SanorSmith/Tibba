const { Pool } = require('pg');

const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL, 
  ssl: { rejectUnauthorized: false } 
});

async function checkColumns() {
  try {
    console.log('🔍 Checking for insurance/appointment columns in patients table...');
    console.log('='.repeat(60));
    
    // Check all columns in patients table
    const allColumns = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'patients' 
      ORDER BY column_name
    `);
    
    console.log('📋 All columns in patients table:');
    allColumns.rows.forEach(row => {
      console.log(`• ${row.column_name}: ${row.data_type} (${row.is_nullable})`);
    });
    
    console.log('\n🔍 Looking for insurance-related columns...');
    const insuranceColumns = allColumns.rows.filter(row => 
      row.column_name.toLowerCase().includes('insurance')
    );
    
    if (insuranceColumns.length === 0) {
      console.log('❌ No insurance columns found in patients table');
    } else {
      console.log('✅ Insurance columns found:');
      insuranceColumns.forEach(row => {
        console.log(`• ${row.column_name}: ${row.data_type}`);
      });
    }
    
    console.log('\n🔍 Looking for appointment-related columns...');
    const appointmentColumns = allColumns.rows.filter(row => 
      row.column_name.toLowerCase().includes('appointment')
    );
    
    if (appointmentColumns.length === 0) {
      console.log('❌ No appointment columns found in patients table');
    } else {
      console.log('✅ Appointment columns found:');
      appointmentColumns.forEach(row => {
        console.log(`• ${row.column_name}: ${row.data_type}`);
      });
    }
    
    // Check sample data
    console.log('\n📊 Sample patient data:');
    const sampleData = await pool.query(`
      SELECT patientid, firstname, lastname, phone, email 
      FROM patients 
      LIMIT 3
    `);
    
    sampleData.rows.forEach((row, index) => {
      console.log(`Patient ${index + 1}: ${row.firstname} ${row.lastname} (${row.patientid})`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkColumns();
