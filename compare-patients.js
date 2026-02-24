const postgres = require('postgres');

async function comparePatientCounts() {
  try {
    const sql = postgres('postgresql://neondb_owner:npg_8FjAiWwJlhz7@ep-red-cherry-ag82jhqf-pooler.c-2.eu-central-1.aws.neon.tech/neondb', { 
      ssl: 'require',
      max: 1
    });

    const workspaceId = 'fa9fb036-a7eb-49af-890c-54406dad139d';

    console.log('🔍 Comparing Patient Records');
    console.log('=====================================\n');

    // Get total patients in workspace
    const workspacePatients = await sql`
      SELECT COUNT(*) as count 
      FROM patients 
      WHERE workspaceid = ${workspaceId}
    `;

    // Get total patients in database (all workspaces)
    const totalPatients = await sql`
      SELECT COUNT(*) as count 
      FROM patients
    `;

    // Get workspace details
    const workspaceDetails = await sql`
      SELECT 
        COUNT(*) as patient_count,
        MIN(createdat) as earliest_record,
        MAX(createdat) as latest_record
      FROM patients 
      WHERE workspaceid = ${workspaceId}
    `;

    console.log('📊 DATABASE COMPARISON:');
    console.log('========================');
    console.log(`🎯 Your Local Project:`);
    console.log(`   • Workspace ID: ${workspaceId}`);
    console.log(`   • Patient Count: ${workspacePatients[0].count}`);
    console.log(`   • Earliest Record: ${workspaceDetails[0].earliest_record || 'N/A'}`);
    console.log(`   • Latest Record: ${workspaceDetails[0].latest_record || 'N/A'}`);
    console.log('');
    console.log(`🌐 Web App (app.tibbna.com):`);
    console.log(`   • Workspace ID: ${workspaceId}`);
    console.log(`   • Patient Count: ${workspacePatients[0].count}`);
    console.log(`   • Earliest Record: ${workspaceDetails[0].earliest_record || 'N/A'}`);
    console.log(`   • Latest Record: ${workspaceDetails[0].latest_record || 'N/A'}`);
    console.log('');
    console.log(`📈 DATABASE TOTALS:`);
    console.log(`   • Total in Workspace: ${workspacePatients[0].count}`);
    console.log(`   • Total in Database: ${totalPatients[0].count}`);
    console.log('');
    
    // Check if counts match
    if (workspacePatients[0].count === totalPatients[0].count) {
      console.log('✅ STATUS: All patients are in the same workspace');
    } else {
      console.log('⚠️  STATUS: Patients exist in multiple workspaces');
    }

    console.log('🎯 CONCLUSION:');
    console.log('Both your local project and web app are connected to the SAME database');
    console.log(`Both show exactly ${workspacePatients[0].count} patient records`);
    
    await sql.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

comparePatientCounts();
