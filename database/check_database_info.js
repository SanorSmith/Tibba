const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_RBybikcu3tz5@ep-long-river-allaqs25.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require'
});

async function checkDatabaseInfo() {
  try {
    console.log('🗃️  Database Information:');
    console.log('================================');
    
    // Get database name
    const dbResult = await pool.query('SELECT current_database()');
    const dbName = dbResult.rows[0].current_database;
    console.log('📊 Database Name:', dbName);
    
    // Get connection info
    const connResult = await pool.query('SELECT version()');
    console.log('🔗 Connection:', connResult.rows[0].version.split(',')[0]);
    
    // Get all tables
    const tableResult = await pool.query(`
      SELECT table_name, table_type
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    console.log('\n📋 All Tables in Database:');
    console.log('================================');
    tableResult.rows.forEach(row => {
      const icon = row.table_name.includes('schedule') || row.table_name.includes('rotation') ? '📅' : '🗂️';
      console.log(`${icon} ${row.table_name} (${row.table_type})`);
    });
    
    // Get schedule-specific tables
    const scheduleTables = tableResult.rows.filter(row => 
      row.table_name.includes('schedule') || 
      row.table_name.includes('rotation') ||
      row.table_name === 'staff' ||
      row.table_name === 'shifts'
    );
    
    console.log('\n📅 Schedule-Related Tables:');
    console.log('================================');
    scheduleTables.forEach(row => {
      console.log(`✅ ${row.table_name}`);
    });
    
    // Check if staff table has data
    const staffCount = await pool.query('SELECT COUNT(*) as count FROM staff');
    console.log('\n👥 Staff Table Records:', staffCount.rows[0].count);
    
    // Check if shifts table has data
    const shiftCount = await pool.query('SELECT COUNT(*) as count FROM shifts');
    console.log('⏰ Shifts Table Records:', shiftCount.rows[0].count);
    
    // Check if schedules tables have data
    const scheduleCount = await pool.query('SELECT COUNT(*) as count FROM employee_schedules');
    console.log('📅 Employee Schedules:', scheduleCount.rows[0].count);
    
    const dailyCount = await pool.query('SELECT COUNT(*) as count FROM daily_schedule_details');
    console.log('📝 Daily Schedule Details:', dailyCount.rows[0].count);
    
    console.log('\n🌐 Database Connection Details:');
    console.log('================================');
    console.log('🔗 Host: ep-long-river-allaqs25.c-3.eu-central-1.aws.neon.tech');
    console.log('📊 Database: neondb');
    console.log('🔐 SSL: Required');
    console.log('📍 Region: eu-central-1 (Frankfurt)');
    console.log('🏢 Provider: Neon (PostgreSQL)');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkDatabaseInfo();
