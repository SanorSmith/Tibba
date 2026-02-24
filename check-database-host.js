const postgres = require('postgres');

async function checkDatabaseHost() {
  try {
    console.log('🔍 CHECKING DATABASE HOST CONNECTION');
    console.log('==================================\n');

    // Your local project database connection
    const localConnection = 'postgresql://neondb_owner:npg_8FjAiWwJlhz7@ep-red-cherry-ag82jhqf-pooler.c-2.eu-central-1.aws.neon.tech/neondb';
    
    console.log('📋 LOCAL PROJECT DATABASE CONNECTION:');
    console.log('=====================================');
    console.log('• Host: ep-red-cherry-ag82jhqf-pooler.c-2.eu-central-1.aws.neon.tech');
    console.log('• Database: neondb');
    console.log('• User: neondb_owner');
    console.log('• Region: eu-central-1');
    console.log('• Provider: AWS Neon');
    console.log('');

    // Test connection to your local database
    const sql = postgres(localConnection, { 
      ssl: 'require',
      max: 1
    });

    const workspaceId = 'fa9fb036-a7eb-49af-890c-54406dad139d';

    try {
      // Test connection and get basic info
      const connectionTest = await sql`SELECT version() as version, current_database() as database`;
      console.log('✅ LOCAL DATABASE CONNECTION SUCCESSFUL:');
      console.log('=======================================');
      console.log(`• PostgreSQL Version: ${connectionTest[0].version}`);
      console.log(`• Database Name: ${connectionTest[0].database}`);
      console.log('');

      // Get patient count
      const patientCount = await sql`SELECT COUNT(*) as count FROM patients WHERE workspaceid = ${workspaceId}`;
      console.log(`• Patients in Local DB: ${patientCount[0].count}`);
      console.log('');

      // Check if ALI dani (10101010) exists
      const aliDani = await sql`
        SELECT firstname, lastname, nationalid, createdat
        FROM patients 
        WHERE workspaceid = ${workspaceId}
        AND nationalid = '10101010'
      `;
      
      console.log('🔍 SEARCHING FOR ALI dani (10101010):');
      console.log('=====================================');
      if (aliDani.length > 0) {
        console.log('✅ FOUND in Local Database:');
        aliDani.forEach(patient => {
          console.log(`• ${patient.firstname} ${patient.lastname}`);
          console.log(`  National ID: ${patient.nationalid}`);
          console.log(`  Created: ${patient.createdat}`);
        });
      } else {
        console.log('❌ NOT FOUND in Local Database');
      }
      console.log('');

    } catch (error) {
      console.log('❌ LOCAL DATABASE CONNECTION FAILED:');
      console.log(`Error: ${error.message}`);
    }

    await sql.end();

    console.log('🌐 WEB APP ANALYSIS:');
    console.log('====================');
    console.log('• Web App URL: https://app.tibbna.com/d/fa9fb036-a7eb-49af-890c-54406dad139d/dashboard');
    console.log('• Expected Host: ep-red-cherry-ag82jhqf-pooler.c-2.eu-central-1.aws.neon.tech');
    console.log('• Expected Database: neondb');
    console.log('');

    console.log('🎯 HOST COMPARISON:');
    console.log('==================');
    console.log('✅ Both SHOULD connect to the SAME Neon database host');
    console.log('✅ Both SHOULD use the same database (neondb)');
    console.log('✅ Both SHOULD use the same workspace ID');
    console.log('');
    console.log('🚨 BUT: Web app shows different patients than local database');
    console.log('🚨 This suggests either:');
    console.log('   • Web app uses a different database connection string');
    console.log('   • Web app has cached/synced data from another source');
    console.log('   • Web app environment variables are different');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkDatabaseHost();
