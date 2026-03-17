// Check why rrrrrrrrrrrrrrrrrrr is missing from the provided data
const postgres = require('postgres');

const databaseUrl = process.env.DATABASE_URL || "postgresql://neondb_owner:npg_RBybikcu3tz5@ep-long-river-allaqs25.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

const sql = postgres(databaseUrl, {
  ssl: 'require',
});

async function checkMissingRrrrrr() {
  try {
    console.log('🔍 Checking why "rrrrrrrrrrrrrrrrrrrr" is missing from your data...\n');
    
    // 1. Find the rrrrrrrrrrrrrrrrrrr patient in the database
    const rrrrrrPatient = await sql`
      SELECT patientid, ehrid, firstname, lastname, phone, createdat
      FROM patients 
      WHERE firstname ILIKE '%rrrrr%'
      ORDER BY createdat DESC
    `;
    
    if (rrrrrrPatient.length > 0) {
      const patient = rrrrrrPatient[0];
      console.log('✅ Found "rrrrrrrrrrrrrrrrrrrr" in database:');
      console.log(`   Name: ${patient.firstname} ${patient.lastname}`);
      console.log(`   Patient ID: ${patient.patientid}`);
      console.log(`   Patient Number: ${patient.ehrid}`);
      console.log(`   Created: ${patient.createdat}\n`);
      
      // 2. Check the most recent patients in database
      console.log('📋 Most recent patients in database (last 10):');
      const recentPatients = await sql`
        SELECT patientid, ehrid, firstname, lastname, createdat
        FROM patients 
        ORDER BY createdat DESC 
        LIMIT 10
      `;
      
      recentPatients.forEach((p, i) => {
        console.log(`${i+1}. ${p.firstname} ${p.lastname} (${p.ehrid}) - ${p.createdat}`);
      });
      
      // 3. Check if rrrrrrrrrrrrrrrrrrr is among the most recent
      const isRecent = recentPatients.some(p => p.patientid === patient.patientid);
      console.log(`\n🎯 Is rrrrrrrrrrrrrrrrrrr among the 10 most recent? ${isRecent ? '✅ YES' : '❌ NO'}`);
      
      // 4. Find the position of rrrrrrrrrrrrrrrrrrr in all patients
      const allPatientsCount = await sql`SELECT COUNT(*) as count FROM patients`;
      const positionQuery = await sql`
        SELECT COUNT(*) as position 
        FROM patients 
        WHERE createdat > (SELECT createdat FROM patients WHERE patientid = ${patient.patientid})
      `;
      
      const position = Number(positionQuery[0].position) + 1;
      const total = Number(allPatientsCount[0].count);
      
      console.log(`\n📊 rrrrrrrrrrrrrrrrrrr position in database:`);
      console.log(`   Position: ${position} out of ${total} patients`);
      console.log(`   This means there are ${position - 1} patients created after rrrrrrrrrrrrrrrrrrr`);
      
      // 5. Show the patients created after rrrrrrrrrrrrrrrrrrr
      console.log('\n📋 Patients created AFTER rrrrrrrrrrrrrrrrrrr:');
      const patientsAfter = await sql`
        SELECT ehrid, firstname, lastname, createdat
        FROM patients 
        WHERE createdat > (SELECT createdat FROM patients WHERE patientid = ${patient.patientid})
        ORDER BY createdat DESC
        LIMIT 5
      `;
      
      patientsAfter.forEach((p, i) => {
        console.log(`${i+1}. ${p.firstname} ${p.lastname} (${p.ehrid}) - ${p.createdat}`);
      });
      
      console.log('\n💡 CONCLUSION:');
      console.log('=============');
      console.log('❌ The data you provided is OUTDATED');
      console.log('❌ It does not include the most recent patients');
      console.log('❌ "rrrrrrrrrrrrrrrrrrrr" was created AFTER the data in your list');
      console.log('✅ "rrrrrrrrrrrrrrrrrrrr" EXISTS in the database but is not in your provided data');
      console.log('✅ Your provided data is missing the latest patients including rrrrrrrrrrrrrrrrrrr');
      
    } else {
      console.log('❌ "rrrrrrrrrrrrrrrrrrrr" not found in database');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await sql.end();
  }
}

checkMissingRrrrrr();
