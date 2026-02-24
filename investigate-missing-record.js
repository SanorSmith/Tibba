const postgres = require('postgres');

async function investigateMissingRecord() {
  try {
    console.log('🔍 INVESTIGATING HOW RECORD CAN BE MISSING');
    console.log('==========================================\n');

    const sql = postgres('postgresql://neondb_owner:npg_8FjAiWwJlhz7@ep-red-cherry-ag82jhqf-pooler.c-2.eu-central-1.aws.neon.tech/neondb', { 
      ssl: 'require',
      max: 1
    });

    const workspaceId = 'fa9fb036-a7eb-49af-890c-54406dad139d';

    console.log('📋 POSSIBLE SCENARIOS FOR MISSING RECORD:');
    console.log('=====================================\n');

    // Scenario 1: Check if there are multiple databases/schemas
    console.log('🔍 SCENARIO 1: Multiple Databases/Schemas');
    console.log('===========================================');
    
    try {
      const databases = await sql`
        SELECT datname 
        FROM pg_database 
        WHERE datname NOT LIKE 'template%' 
        AND datname != 'postgres'
        ORDER BY datname
      `;
      
      console.log('Available databases:');
      databases.forEach(db => {
        console.log(`• ${db.datname}`);
      });
      console.log('');

      const schemas = await sql`
        SELECT schema_name 
        FROM information_schema.schemata 
        WHERE schema_name NOT IN ('information_schema', 'pg_catalog', 'pg_toast')
        ORDER BY schema_name
      `;
      
      console.log('Available schemas:');
      schemas.forEach(schema => {
        console.log(`• ${schema.schema_name}`);
      });
      console.log('');

    } catch (error) {
      console.log('❌ Could not check databases/schemas');
    }

    // Scenario 2: Check if there are multiple patient tables
    console.log('🔍 SCENARIO 2: Multiple Patient Tables');
    console.log('====================================');
    
    try {
      const patientTables = await sql`
        SELECT table_name, table_schema
        FROM information_schema.tables 
        WHERE table_name ILIKE '%patient%'
        AND table_schema NOT IN ('information_schema', 'pg_catalog')
        ORDER BY table_schema, table_name
      `;
      
      console.log('Patient-related tables:');
      patientTables.forEach(table => {
        console.log(`• ${table.table_schema}.${table.table_name}`);
      });
      console.log('');

    } catch (error) {
      console.log('❌ Could not check patient tables');
    }

    // Scenario 3: Check if there are multiple workspaces
    console.log('🔍 SCENARIO 3: Multiple Workspaces');
    console.log('==================================');
    
    try {
      const workspaces = await sql`
        SELECT DISTINCT workspaceid, COUNT(*) as patient_count
        FROM patients 
        WHERE workspaceid IS NOT NULL
        GROUP BY workspaceid
        ORDER BY patient_count DESC
      `;
      
      console.log('Workspaces in database:');
      workspaces.forEach(ws => {
        console.log(`• ${ws.workspaceid}: ${ws.patient_count} patients`);
      });
      console.log('');

    } catch (error) {
      console.log('❌ Could not check workspaces');
    }

    // Scenario 4: Check for the specific record in different ways
    console.log('🔍 SCENARIO 4: Search for ALI dani in Different Ways');
    console.log('===============================================');
    
    try {
      // Search by name only
      const nameSearch = await sql`
        SELECT patientid, firstname, lastname, nationalid, workspaceid, createdat
        FROM patients 
        WHERE (firstname ILIKE '%ALI%' OR firstname ILIKE '%ali%')
        AND (lastname ILIKE '%dani%' OR lastname ILIKE '%Dani%')
        ORDER BY createdat DESC
      `;
      
      console.log('Patients with "ALI" and "dani" in name:');
      if (nameSearch.length > 0) {
        nameSearch.forEach(patient => {
          console.log(`• ${patient.firstname} ${patient.lastname}`);
          console.log(`  ID: ${patient.patientid}`);
          console.log(`  National ID: ${patient.nationalid || 'N/A'}`);
          console.log(`  Workspace: ${patient.workspaceid}`);
          console.log(`  Created: ${patient.createdat}`);
          console.log('');
        });
      } else {
        console.log('❌ No patients found with "ALI" and "dani"');
      }
      console.log('');

      // Search for national ID 10101010 in all tables
      const nationalIdSearch = await sql`
        SELECT 'patients' as table_name, patientid, firstname, lastname, nationalid, workspaceid
        FROM patients 
        WHERE nationalid = '10101010'
        UNION ALL
        SELECT 'patients' as table_name, patientid, firstname, lastname, nationalid, workspaceid
        FROM patients 
        WHERE nationalid ILIKE '%10101010%'
        ORDER BY table_name, createdat DESC
      `;
      
      console.log('Records with National ID 10101010:');
      if (nationalIdSearch.length > 0) {
        nationalIdSearch.forEach(record => {
          console.log(`• ${record.firstname} ${record.lastname}`);
          console.log(`  Table: ${record.table_name}`);
          console.log(`  National ID: ${record.nationalid}`);
          console.log(`  Workspace: ${record.workspaceid}`);
          console.log('');
        });
      } else {
        console.log('❌ No records found with National ID 10101010');
      }
      console.log('');

    } catch (error) {
      console.log('❌ Could not search for ALI dani');
    }

    // Scenario 5: Check database connection details
    console.log('🔍 SCENARIO 5: Database Connection Details');
    console.log('=======================================');
    
    try {
      const connectionInfo = await sql`
        SELECT 
          current_database() as database,
          current_schema() as schema,
          version() as version,
          inet_server_addr() as server_ip
      `;
      
      console.log('Current connection details:');
      console.log(`• Database: ${connectionInfo[0].database}`);
      console.log(`• Schema: ${connectionInfo[0].schema}`);
      console.log(`• Version: ${connectionInfo[0].version}`);
      console.log(`• Server IP: ${connectionInfo[0].server_ip || 'N/A'}`);
      console.log('');

    } catch (error) {
      console.log('❌ Could not get connection details');
    }

    console.log('🎯 POSSIBLE EXPLANATIONS:');
    console.log('========================');
    console.log('1. 🔄 Web app uses a DIFFERENT Neon database instance');
    console.log('2. 📊 Web app connects to a different schema or table');
    console.log('3. 🏢 Web app uses a different workspace ID');
    console.log('4. 💾 Web app has cached/synced data from another source');
    console.log('5. 🔐 Web app environment variables point to a different database');
    console.log('6. 🌐 Web app is connected to a replica or read-only copy');
    console.log('7. 📱 Web app shows data from a different environment (staging vs production)');

    await sql.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

investigateMissingRecord();
