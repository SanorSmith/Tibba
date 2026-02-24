// Check appointments table schema and foreign key constraints
const postgres = require('postgres');

const databaseUrl = process.env.DATABASE_URL || "postgresql://neondb_owner:npg_RBybikcu3tz5@ep-long-river-allaqs25.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

const sql = postgres(databaseUrl, {
  ssl: 'require',
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10
});

async function checkAppointmentsSchema() {
  try {
    console.log('🔍 Checking appointments table schema...');
    
    // Get table columns
    const columns = await sql`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'appointments'
      AND table_schema = 'public'
      ORDER BY ordinal_position
    `;
    
    console.log('\n📋 Appointments table columns:');
    columns.forEach((column) => {
      console.log(`  - ${column.column_name}: ${column.data_type} (${column.is_nullable}) ${column.column_default || ''}`);
    });
    
    // Get foreign key constraints
    const constraints = await sql`
      SELECT
        tc.constraint_name,
        tc.constraint_type,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      WHERE tc.table_name = 'appointments'
      AND tc.constraint_type = 'FOREIGN KEY'
    `;
    
    console.log('\n📋 Foreign key constraints:');
    constraints.forEach((constraint) => {
      console.log(`  - ${constraint.constraint_name}: ${constraint.column_name} -> ${constraint.foreign_table_name}.${constraint.foreign_column_name}`);
    });
    
    // Check if there are any existing appointments
    const existingAppointments = await sql`
      SELECT COUNT(*) as count
      FROM appointments
    `;
    
    console.log(`\n📊 Existing appointments: ${existingAppointments[0].count}`);
    
    // Check if there are any users that could be doctors
    const users = await sql`
      SELECT userid, name, email
      FROM users
      LIMIT 5
    `;
    
    console.log('\n📋 Sample users:');
    users.forEach((user, index) => {
      console.log(`  ${index + 1}. ${user.name} (${user.userid})`);
    });
    
    console.log('\n✅ Schema check complete!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await sql.end();
  }
}

checkAppointmentsSchema();
