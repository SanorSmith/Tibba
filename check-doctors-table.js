// Check for doctors/staff tables in Neon database
const postgres = require('postgres');

const databaseUrl = process.env.DATABASE_URL || "postgresql://neondb_owner:npg_RBybikcu3tz5@ep-long-river-allaqs25.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

const sql = postgres(databaseUrl, {
  ssl: 'require',
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10
});

async function checkDoctorsTables() {
  try {
    console.log('🔍 Checking for doctors/staff tables in Neon database...');
    
    // Get all tables that might contain doctor/staff info
    const tables = await sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND (
        table_name LIKE '%doctor%' 
        OR table_name LIKE '%staff%' 
        OR table_name LIKE '%user%'
        OR table_name LIKE '%employee%'
        OR table_name LIKE '%practitioner%'
      )
      ORDER BY table_name
    `;
    
    console.log('\n📋 Found tables:');
    tables.forEach((table, index) => {
      console.log(`${index + 1}. ${table.table_name}`);
    });
    
    // Check users table if it exists
    const usersTable = tables.find(t => t.table_name === 'users');
    if (usersTable) {
      console.log('\n📊 Structure of users table:');
      
      const columns = await sql`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'users'
        ORDER BY ordinal_position
      `;
      
      columns.forEach((column) => {
        console.log(`  - ${column.column_name}: ${column.data_type} (${column.is_nullable})`);
      });
      
      // Get sample data
      console.log('\n📝 Sample data from users table:');
      const sampleData = await sql`
        SELECT *
        FROM users
        LIMIT 5
      `;
      
      sampleData.forEach((row, index) => {
        console.log(`  ${index + 1}. ${JSON.stringify(row, null, 2)}`);
      });
    }
    
    // Check staff table if it exists
    const staffTable = tables.find(t => t.table_name === 'staff');
    if (staffTable) {
      console.log('\n📊 Structure of staff table:');
      
      const columns = await sql`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'staff'
        ORDER BY ordinal_position
      `;
      
      columns.forEach((column) => {
        console.log(`  - ${column.column_name}: ${column.data_type} (${column.is_nullable})`);
      });
      
      // Get sample data
      console.log('\n📝 Sample data from staff table:');
      const sampleData = await sql`
        SELECT *
        FROM staff
        LIMIT 5
      `;
      
      sampleData.forEach((row, index) => {
        console.log(`  ${index + 1}. ${JSON.stringify(row, null, 2)}`);
      });
    }
    
    // Check workspace_members table if it exists
    const workspaceMembersTable = tables.find(t => t.table_name === 'workspace_members');
    if (workspaceMembersTable) {
      console.log('\n📊 Structure of workspace_members table:');
      
      const columns = await sql`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'workspace_members'
        ORDER BY ordinal_position
      `;
      
      columns.forEach((column) => {
        console.log(`  - ${column.column_name}: ${column.data_type} (${column.is_nullable})`);
      });
      
      // Get sample data with role = 'doctor'
      console.log('\n📝 Doctors from workspace_members table:');
      const doctors = await sql`
        SELECT *
        FROM workspace_members
        WHERE role = 'doctor'
        LIMIT 5
      `;
      
      console.log(`Found ${doctors.length} doctors`);
      doctors.forEach((row, index) => {
        console.log(`  ${index + 1}. ${JSON.stringify(row, null, 2)}`);
      });
    }
    
    console.log('\n✅ Table check complete!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await sql.end();
  }
}

checkDoctorsTables();
