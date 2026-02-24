// Test script to debug doctors API database connection
const postgres = require('postgres');

const databaseUrl = "postgresql://neondb_owner:npg_RBybikcu3tz5@ep-long-river-allaqs25.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

const sql = postgres(databaseUrl, {
  ssl: 'require',
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10
});

async function testDoctorsAPI() {
  try {
    console.log('🔍 Testing doctors API database connection...');
    
    // Test basic connection
    const testQuery = await sql`SELECT NOW() as current_time`;
    console.log('✅ Database connection successful:', testQuery[0].current_time);
    
    // Check what tables exist
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `;
    
    console.log('\n📋 Available tables:');
    tables.forEach(table => {
      console.log(`  - ${table.table_name}`);
    });
    
    // Check if staff table exists
    const staffTableCheck = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'staff'
    `;
    
    if (staffTableCheck.length === 0) {
      console.log('\n❌ Staff table does not exist');
      return;
    }
    
    console.log('\n✅ Staff table exists');
    
    // Check staff table structure
    const staffStructure = await sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'staff'
      AND table_schema = 'public'
      ORDER BY ordinal_position
    `;
    
    console.log('\n📋 Staff table structure:');
    staffStructure.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type} (${col.is_nullable})`);
    });
    
    // Check if users table exists
    const usersTableCheck = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'users'
    `;
    
    if (usersTableCheck.length === 0) {
      console.log('\n❌ Users table does not exist');
      return;
    }
    
    console.log('\n✅ Users table exists');
    
    // Test the actual query from the doctors API
    const workspaceid = 'fa9fb036-a7eb-49af-890c-54406dad139d';
    console.log('\n🧪 Testing doctors API query...');
    
    const doctors = await sql`
      SELECT 
        s.staffid,
        CONCAT(s.firstname, ' ', COALESCE(s.middlename, ''), ' ', s.lastname) as name,
        s.email,
        s.unit,
        s.specialty,
        s.phone,
        s.role,
        u.userid as user_id,
        CASE WHEN u.userid IS NOT NULL THEN true ELSE false END as has_user_account
      FROM staff s
      LEFT JOIN users u ON s.email = u.email
      WHERE s.workspaceid = ${workspaceid}
      AND s.role IN ('doctor', 'nurse', 'lab_technician')
      ORDER BY 
        CASE 
          WHEN s.role = 'doctor' THEN 1
          WHEN s.role = 'nurse' THEN 2
          WHEN s.role = 'lab_technician' THEN 3
          ELSE 4
        END,
        s.firstname, s.lastname
    `;
    
    console.log(`✅ Found ${doctors.length} doctors/staff members`);
    
    if (doctors.length > 0) {
      console.log('\n📋 Sample doctor data:');
      console.log(JSON.stringify(doctors[0], null, 2));
    }
    
    console.log('\n✅ Doctors API should work correctly!');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await sql.end();
  }
}

testDoctorsAPI();
