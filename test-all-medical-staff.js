// Test the updated medical staff API
const postgres = require('postgres');

const databaseUrl = process.env.DATABASE_URL || "postgresql://neondb_owner:npg_RBybikcu3tz5@ep-long-river-allaqs25.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

const sql = postgres(databaseUrl, {
  ssl: 'require',
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10
});

async function testAllMedicalStaff() {
  try {
    console.log('🔍 Testing updated medical staff API query...');
    
    const workspaceid = 'fa9fb036-a7eb-49af-890c-54406dad139d';
    
    // Fetch all medical staff (doctors, nurses, lab technicians) with user account status
    const medicalStaff = await sql`
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

    console.log(`\n📋 Found ${medicalStaff.length} medical staff members:\n`);
    
    medicalStaff.forEach((staff, index) => {
      const roleDisplay = staff.role.charAt(0).toUpperCase() + staff.role.slice(1).replace('_', ' ');
      const unitDisplay = staff.unit ? ` (${staff.unit})` : '';
      const userStatus = staff.has_user_account ? '✅ Has User Account' : '❌ No User Account';
      
      console.log(`${index + 1}. ${staff.name} - ${roleDisplay}${unitDisplay}`);
      console.log(`   Email: ${staff.email || 'N/A'}`);
      console.log(`   Specialty: ${staff.specialty || 'N/A'}`);
      console.log(`   Phone: ${staff.phone || 'N/A'}`);
      console.log(`   Staff ID: ${staff.staffid}`);
      console.log(`   User ID: ${staff.user_id || 'N/A'}`);
      console.log(`   Status: ${userStatus}`);
      console.log('');
    });

    console.log('✅ Medical staff API test complete!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await sql.end();
  }
}

testAllMedicalStaff();
