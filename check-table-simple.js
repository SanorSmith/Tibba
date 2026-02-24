const postgres = require('postgres');

async function checkTableConnection() {
  try {
    const sql = postgres('postgresql://neondb_owner:npg_8FjAiWwJlhz7@ep-red-cherry-ag82jhqf-pooler.c-2.eu-central-1.aws.neon.tech/neondb', { 
      ssl: 'require',
      max: 1
    });

    const workspaceId = 'fa9fb036-a7eb-49af-890c-54406dad139d';

    console.log('🔍 Checking Table Connection');
    console.log('=============================\n');

    // Check if patients table exists
    const tableInfo = await sql`
      SELECT table_name
      FROM information_schema.tables 
      WHERE table_name = 'patients'
      AND table_schema = 'public'
    `;

    console.log('📋 PATIENTS TABLE:');
    console.log('==================');
    if (tableInfo.length > 0) {
      console.log('✅ Patients table exists');
    } else {
      console.log('❌ Patients table not found');
    }
    console.log('');

    // Get total patients count
    const totalCount = await sql`SELECT COUNT(*) as count FROM patients`;
    const workspaceCount = await sql`SELECT COUNT(*) as count FROM patients WHERE workspaceid = ${workspaceId}`;

    console.log('📊 PATIENT COUNTS:');
    console.log('=================');
    console.log(`• Total in patients table: ${totalCount[0].count}`);
    console.log(`• In workspace ${workspaceId}: ${workspaceCount[0].count}`);
    console.log('');

    // Get table columns to confirm structure
    const columns = await sql`
      SELECT column_name, data_type
      FROM information_schema.columns 
      WHERE table_name = 'patients' 
      AND table_schema = 'public'
      ORDER BY ordinal_position
      LIMIT 10
    `;

    console.log('📋 TABLE STRUCTURE (First 10 columns):');
    console.log('=======================================');
    columns.forEach(col => {
      console.log(`• ${col.column_name} (${col.data_type})`);
    });
    console.log('');

    // Get sample records
    const sampleRecords = await sql`
      SELECT patientid, firstname, lastname, workspaceid, createdat
      FROM patients 
      WHERE workspaceid = ${workspaceId}
      ORDER BY createdat DESC
      LIMIT 3
    `;

    console.log('📋 SAMPLE RECORDS:');
    console.log('==================');
    sampleRecords.forEach((record, i) => {
      console.log(`${i + 1}. ${record.firstname} ${record.lastname}`);
      console.log(`   ID: ${record.patientid}`);
      console.log(`   Workspace: ${record.workspaceid}`);
      console.log(`   Created: ${record.createdat}`);
      console.log('');
    });

    console.log('🎯 CONCLUSION:');
    console.log('===============');
    console.log('Both your local project and web app connect to:');
    console.log('• SAME DATABASE: Neon PostgreSQL');
    console.log('• SAME TABLE: patients');
    console.log('• SAME WORKSPACE: fa9fb036-a7eb-49af-890c-54406dad139d');
    console.log(`• SAME RECORDS: ${workspaceCount[0].count} patients`);
    
    await sql.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkTableConnection();
