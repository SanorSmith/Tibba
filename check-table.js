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

    // Check if patients table exists and get its structure
    const tableInfo = await sql`
      SELECT 
        table_name,
        table_type,
        is_insertable_into
      FROM information_schema.tables 
      WHERE table_name = 'patients'
      AND table_schema = 'public'
    `;

    console.log('📋 PATIENTS TABLE INFO:');
    console.log('========================');
    if (tableInfo.length > 0) {
      console.log(`✅ Table Exists: ${tableInfo[0].table_name}`);
      console.log(`• Type: ${tableInfo[0].table_type}`);
      console.log(`• Insertable: ${tableInfo[0].is_insertable_into}`);
    } else {
      console.log('❌ Patients table not found');
    }
    console.log('');

    // Get table columns
    const columns = await sql`
      SELECT 
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns 
      WHERE table_name = 'patients' 
      AND table_schema = 'public'
      ORDER BY ordinal_position
    `;

    console.log('📊 TABLE COLUMNS:');
    console.log('=================');
    columns.forEach(col => {
      console.log(`• ${col.column_name} (${col.data_type}) ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });
    console.log('');

    // Check for other patient-related tables
    const allTables = await sql`
      SELECT table_name
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      AND (table_name ILIKE '%patient%' OR table_name ILIKE '%user%')
      ORDER BY table_name
    `;

    console.log('🔍 PATIENT-RELATED TABLES:');
    console.log('==========================');
    allTables.forEach(table => {
      console.log(`• ${table.table_name}`);
    });
    console.log('');

    // Get row counts for all patient-related tables
    console.log('📈 ROW COUNTS:');
    console.log('===============');
    
    for (const table of allTables) {
      try {
        const countResult = await sql`
          SELECT COUNT(*) as count 
          FROM ${sql.unsafe(table.table_name)}
        `;
        console.log(`• ${table.table_name}: ${countResult[0].count} rows`);
      } catch (error) {
        console.log(`• ${table.table_name}: Error counting rows`);
      }
    }
    console.log('');

    // Check specifically for the workspace
    const workspaceCount = await sql`
      SELECT COUNT(*) as count 
      FROM patients 
      WHERE workspaceid = ${workspaceId}
    `;

    console.log('🎯 WORKSPACE ANALYSIS:');
    console.log('=====================');
    console.log(`• Workspace ID: ${workspaceId}`);
    console.log(`• Patients in workspace: ${workspaceCount[0].count}`);
    console.log(`• Total patients in table: ${columns.length > 0 ? (await sql\`SELECT COUNT(*) as count FROM patients\`)[0].count : 'N/A'}`);
    console.log('');

    // Get sample records to verify table content
    if (tableInfo.length > 0) {
      const sampleRecords = await sql`
        SELECT 
          patientid,
          firstname,
          lastname,
          workspaceid,
          createdat
        FROM patients 
        WHERE workspaceid = ${workspaceId}
        ORDER BY createdat DESC
        LIMIT 3
      `;

      console.log('📋 SAMPLE RECORDS FROM WORKSPACE:');
      console.log('===================================');
      sampleRecords.forEach((record, i) => {
        console.log(`${i + 1}. ${record.firstname} ${record.lastname}`);
        console.log(`   ID: ${record.patientid}`);
        console.log(`   Workspace: ${record.workspaceid}`);
        console.log(`   Created: ${record.createdat}`);
        console.log('');
      });
    }

    await sql.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkTableConnection();
