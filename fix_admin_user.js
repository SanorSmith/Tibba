const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function fixAdminUser() {
  try {
    console.log('🔧 Fixing admin user for approve functionality...\n');
    
    // Check if admin user exists
    const adminCheck = await pool.query(
      'SELECT staffid, role FROM staff WHERE staffid = $1',
      ['00000000-0000-0000-0000-000000000001']
    );
    
    if (adminCheck.rows.length === 0) {
      console.log('Creating admin user...');
      
      // Get table structure first
      const columns = await pool.query(
        'SELECT column_name, data_type FROM information_schema.columns WHERE table_name = \'staff\' ORDER BY ordinal_position'
      );
      
      // Insert admin user with available columns
      const insertQuery = `
        INSERT INTO staff (
          staffid, firstname, lastname, role, email, created_at
        ) VALUES (
          $1, $2, $3, $4, $5, NOW()
        )
      `;
      
      await pool.query(insertQuery, [
        '00000000-0000-0000-0000-000000000001',
        'System',
        'Administrator',
        'Administrator',
        'admin@tibbna.com'
      ]);
      
      console.log('✅ Admin user created successfully');
    } else {
      const user = adminCheck.rows[0];
      console.log(`Admin user exists: ${user.role}`);
      
      if (user.role !== 'Administrator' && user.role !== 'HR_ADMIN') {
        console.log('Updating admin user role...');
        await pool.query(
          'UPDATE staff SET role = $1 WHERE staffid = $2',
          ['Administrator', '00000000-0000-0000-0000-000000000001']
        );
        console.log('✅ Admin user role updated');
      }
    }
    
    console.log('\n🎉 Admin user is now ready for approve functionality!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

fixAdminUser();
