// Check relationship between staff and users tables
const postgres = require('postgres');

const databaseUrl = process.env.DATABASE_URL || "postgresql://neondb_owner:npg_RBybikcu3tz5@ep-long-river-allaqs25.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

const sql = postgres(databaseUrl, {
  ssl: 'require',
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10
});

async function checkStaffUsersRelationship() {
  try {
    console.log('🔍 Checking staff-users relationship...');
    
    const workspaceid = 'fa9fb036-a7eb-49af-890c-54406dad139d';
    
    // Check if staff email matches users email
    const staffWithUsers = await sql`
      SELECT 
        s.staffid,
        s.firstname,
        s.middlename,
        s.lastname,
        s.email as staff_email,
        s.role as staff_role,
        s.unit,
        s.specialty,
        u.userid,
        u.name as user_name,
        u.email as user_email
      FROM staff s
      LEFT JOIN users u ON s.email = u.email
      WHERE s.workspaceid = ${workspaceid}
      AND s.role IN ('doctor', 'nurse', 'lab_technician')
      ORDER BY s.role, s.firstname
    `;
    
    console.log('\n📋 Staff with matching users:');
    staffWithUsers.forEach((staff, index) => {
      console.log(`${index + 1}. ${staff.firstname} ${staff.lastname}`);
      console.log(`   Staff Email: ${staff.staff_email}`);
      console.log(`   User Email: ${staff.user_email}`);
      console.log(`   User ID: ${staff.userid || 'NO MATCH'}`);
      console.log(`   User Name: ${staff.user_name || 'NO MATCH'}`);
      console.log(`   Role: ${staff.staff_role}`);
      console.log(`   Unit: ${staff.unit || 'N/A'}`);
      console.log('');
    });
    
    // Count matches
    const withMatches = staffWithUsers.filter(s => s.userid).length;
    const withoutMatches = staffWithUsers.filter(s => !s.userid).length;
    
    console.log(`📊 Summary:`);
    console.log(`  Total staff: ${staffWithUsers.length}`);
    console.log(`  With matching users: ${withMatches}`);
    console.log(`  Without matching users: ${withoutMatches}`);
    
    console.log('\n✅ Relationship check complete!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await sql.end();
  }
}

checkStaffUsersRelationship();
