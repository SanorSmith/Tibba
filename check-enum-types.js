// Check what enum values are allowed in the database
const postgres = require('postgres');

const databaseUrl = process.env.DATABASE_URL || "postgresql://neondb_owner:npg_RBybikcu3tz5@ep-long-river-allaqs25.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

const sql = postgres(databaseUrl, {
  ssl: 'require',
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10
});

async function checkEnumTypes() {
  try {
    console.log('🔍 Checking enum types in database...');
    
    // Check appointment_name enum
    const appointmentNameEnum = await sql`
      SELECT unnest(enum_range(NULL::appointment_name)) as values
    `;
    
    console.log('\n📋 appointment_name enum values:');
    appointmentNameEnum.forEach((row, index) => {
      console.log(`  ${index + 1}. ${row.values}`);
    });
    
    // Check appointment_type enum
    const appointmentTypeEnum = await sql`
      SELECT unnest(enum_range(NULL::appointment_type)) as values
    `;
    
    console.log('\n📋 appointment_type enum values:');
    appointmentTypeEnum.forEach((row, index) => {
      console.log(`  ${index + 1}. ${row.values}`);
    });
    
    // Check appointment_status enum
    const appointmentStatusEnum = await sql`
      SELECT unnest(enum_range(NULL::appointment_status)) as values
    `;
    
    console.log('\n📋 appointment_status enum values:');
    appointmentStatusEnum.forEach((row, index) => {
      console.log(`  ${index + 1}. ${row.values}`);
    });
    
    console.log('\n✅ Enum types check complete!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await sql.end();
  }
}

checkEnumTypes();
