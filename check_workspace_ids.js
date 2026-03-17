const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_RBybikcu3tz5@ep-long-river-allaqs25.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require'
});

async function checkWorkspaceIds() {
  try {
    console.log('🔍 Checking available workspace IDs...');
    
    // Check if workspaces table exists
    const tableCheck = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = 'workspaces' 
      AND table_schema = 'public'
    `);
    
    if (tableCheck.rows.length === 0) {
      console.log('❌ workspaces table does not exist');
      console.log('🔧 Creating workspaces table...');
      
      // Create workspaces table
      await pool.query(`
        CREATE TABLE IF NOT EXISTS workspaces (
          workspaceid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name VARCHAR(255) NOT NULL,
          description TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `);
      
      console.log('✅ workspaces table created');
      
      // Insert a default workspace
      await pool.query(`
        INSERT INTO workspaces (name, description) 
        VALUES ('Default Workspace', 'Default workspace for the hospital system')
      `);
      
      console.log('✅ Default workspace created');
    }
    
    // Get available workspace IDs
    const result = await pool.query(`
      SELECT workspaceid, name, createdat 
      FROM workspaces 
      ORDER BY createdat DESC
    `);
    
    console.log('\n📋 Available workspace IDs:');
    if (result.rows.length > 0) {
      result.rows.forEach((row, i) => {
        console.log(`${i+1}. ${row.name}`);
        console.log(`   ID: ${row.workspaceid}`);
        console.log(`   Created: ${row.createdat}`);
      });
      
      // Use the first available workspace ID
      const firstWorkspaceId = result.rows[0].workspaceid;
      console.log(`\n✅ Using workspace ID: ${firstWorkspaceId}`);
      
      console.log('\n🔧 Update the API to use this workspace ID:');
      console.log(`Replace: '00000000-0000-0000-0000-000000000001'`);
      console.log(`With: '${firstWorkspaceId}'`);
      
    } else {
      console.log('❌ No workspaces found');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkWorkspaceIds();
