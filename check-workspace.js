const postgres = require('postgres');

async function checkWorkspace() {
  try {
    const sql = postgres('postgresql://neondb_owner:npg_8FjAiWwJlhz7@ep-red-cherry-ag82jhqf-pooler.c-2.eu-central-1.aws.neon.tech/neondb', { 
      ssl: 'require',
      max: 1
    });

    console.log('🔍 Checking workspace data in Neon database...\n');
    
    // Get workspace analysis
    const workspaces = await sql`
      SELECT DISTINCT workspaceid, COUNT(*) as patient_count
      FROM patients 
      GROUP BY workspaceid
    `;
    
    console.log('📊 Workspace Analysis:');
    workspaces.forEach(w => {
      console.log(`• Workspace ID: ${w.workspaceid}`);
      console.log(`  - Patients: ${w.patient_count}`);
      console.log('');
    });

    // Check if the specific workspace exists
    const targetWorkspace = 'fa9fb036-a7eb-49af-890c-54406dad139d';
    const targetCheck = await sql`
      SELECT COUNT(*) as count 
      FROM patients 
      WHERE workspaceid = ${targetWorkspace}
    `;
    
    console.log(`🎯 Target Workspace (${targetWorkspace}):`);
    console.log(`  - Patient Count: ${targetCheck[0].count}`);
    
    // Get sample patients from that workspace
    const samplePatients = await sql`
      SELECT patientid, firstname, lastname, createdat
      FROM patients 
      WHERE workspaceid = ${targetWorkspace}
      LIMIT 3
    `;
    
    if (samplePatients.length > 0) {
      console.log('\n📋 Sample Patients from Target Workspace:');
      samplePatients.forEach((p, i) => {
        console.log(`${i + 1}. ${p.firstname} ${p.lastname} (${p.patientid})`);
        console.log(`   Created: ${p.createdat}`);
      });
    }
    
    await sql.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkWorkspace();
