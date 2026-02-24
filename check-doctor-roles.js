// Check what role values exist for doctors in the database
const postgres = require('postgres');

const databaseUrl = process.env.DATABASE_URL || "postgresql://neondb_owner:npg_RBybikcu3tz5@ep-long-river-allaqs25.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

const sql = postgres(databaseUrl, {
  ssl: 'require',
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10
});

async function checkDoctorRoles() {
  try {
    console.log('🔍 Checking role values for all staff members...');
    
    const workspaceid = 'fa9fb036-a7eb-49af-890c-54406dad139d';
    
    // Get all staff with their roles
    const allStaff = await sql`
      SELECT 
        staffid,
        CONCAT(firstname, ' ', COALESCE(middlename, ''), ' ', lastname) as name,
        role,
        unit,
        specialty
      FROM staff
      WHERE workspaceid = ${workspaceid}
      ORDER BY role, firstname
    `;

    console.log(`\n📋 All staff members and their roles:\n`);
    
    allStaff.forEach((staff, index) => {
      console.log(`${index + 1}. ${staff.name}`);
      console.log(`   Role: "${staff.role}"`);
      console.log(`   Unit: ${staff.unit || 'N/A'}`);
      console.log(`   Specialty: ${staff.specialty || 'N/A'}`);
      console.log(`   ID: ${staff.staffid}`);
      console.log('');
    });

    // Check specifically for different role variations
    console.log('🔍 Checking for role variations that might indicate doctors:');
    
    const doctorVariations = await sql`
      SELECT 
        staffid,
        CONCAT(firstname, ' ', COALESCE(middlename, ''), ' ', lastname) as name,
        role,
        unit,
        specialty
      FROM staff
      WHERE workspaceid = ${workspaceid}
      AND (
        LOWER(role) LIKE '%doctor%'
        OR LOWER(role) LIKE '%dr%'
        OR LOWER(firstname) LIKE '%dr%'
        OR LOWER(specialty) LIKE '%cardiologist%'
        OR LOWER(specialty) LIKE '%dermatologist%'
        OR LOWER(specialty) LIKE '%neurology%'
        OR LOWER(specialty) LIKE '%ophthalmology%'
      )
      ORDER BY role, firstname
    `;

    console.log(`\n📋 Staff that might be doctors (by role name or specialty):\n`);
    
    doctorVariations.forEach((staff, index) => {
      console.log(`${index + 1}. ${staff.name}`);
      console.log(`   Role: "${staff.role}"`);
      console.log(`   Unit: ${staff.unit || 'N/A'}`);
      console.log(`   Specialty: ${staff.specialty || 'N/A'}`);
      console.log('');
    });

    console.log(`✅ Found ${allStaff.length} total staff members`);
    console.log(`✅ Found ${doctorVariations.length} potential doctors by various criteria`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await sql.end();
  }
}

checkDoctorRoles();
