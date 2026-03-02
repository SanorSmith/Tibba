/**
 * Emergency Restore - Authentication Data
 * Restores users, workspaces, and associations to enable login
 */

require('dotenv').config({ path: '.env.local' });

const postgres = require('postgres');

const databaseUrl = process.env.DATABASE_URL || process.env.TIBBNA_DATABASE_URL;

if (!databaseUrl) {
  throw new Error('Database URL is not configured');
}

const sql = postgres(databaseUrl, {
  ssl: 'require',
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
});

async function restoreAuthData() {
  console.log('🔧 Emergency Restore - Authentication Data...\n');

  try {
    // 1. Restore Admin User
    console.log('👤 Restoring admin user...');
    const adminUser = await sql`
      INSERT INTO users (userid, name, email, password, theme, language, permissions, createdat, updatedat)
      VALUES (
        gen_random_uuid(),
        'Admin User',
        'admin@tibbna.com',
        '$2a$10$rQ8K8Z5J5Z5Z5Z5Z5Z5Z5uO5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z',
        'light',
        'en',
        '{"role": "admin", "access": "full"}'::jsonb,
        NOW(),
        NOW()
      )
      ON CONFLICT (email) DO UPDATE SET
        name = EXCLUDED.name,
        updatedat = NOW()
      RETURNING userid, email
    `;
    console.log(`✅ Admin user restored: ${adminUser[0].email}`);

    // 2. Restore Demo Users
    console.log('\n👥 Restoring demo users...');
    const demoUsers = [
      { name: 'Dr. John Smith', email: 'john.smith@tibbna.com', role: 'doctor' },
      { name: 'Dr. Sarah Johnson', email: 'sarah.johnson@tibbna.com', role: 'doctor' },
      { name: 'Nurse Mary Wilson', email: 'mary.wilson@tibbna.com', role: 'nurse' },
      { name: 'Receptionist Tom Brown', email: 'tom.brown@tibbna.com', role: 'receptionist' },
      { name: 'Lab Tech Alice Davis', email: 'alice.davis@tibbna.com', role: 'lab_tech' },
    ];

    const insertedUsers = [];
    for (const user of demoUsers) {
      const result = await sql`
        INSERT INTO users (userid, name, email, password, theme, language, permissions, createdat, updatedat)
        VALUES (
          gen_random_uuid(),
          ${user.name},
          ${user.email},
          '$2a$10$defaultPasswordHash',
          'light',
          'en',
          ${JSON.stringify({ role: user.role, access: 'standard' })}::jsonb,
          NOW(),
          NOW()
        )
        ON CONFLICT (email) DO UPDATE SET
          name = EXCLUDED.name,
          updatedat = NOW()
        RETURNING userid, email, name
      `;
      insertedUsers.push(result[0]);
      console.log(`✅ User restored: ${result[0].name} (${result[0].email})`);
    }

    // 3. Restore Workspaces
    console.log('\n🏢 Restoring workspaces...');
    const workspaces = [
      { name: 'Main Hospital', type: 'hospital', description: 'Main hospital workspace' },
      { name: 'Emergency Department', type: 'department', description: 'Emergency department workspace' },
      { name: 'Laboratory', type: 'laboratory', description: 'Laboratory workspace' },
      { name: 'Pharmacy', type: 'pharmacy', description: 'Pharmacy workspace' },
    ];

    const insertedWorkspaces = [];
    for (const workspace of workspaces) {
      const result = await sql`
        INSERT INTO workspaces (workspaceid, name, type, description, settings, createdat, updatedat)
        VALUES (
          gen_random_uuid(),
          ${workspace.name},
          ${workspace.type},
          ${workspace.description},
          '{}'::jsonb,
          NOW(),
          NOW()
        )
        RETURNING workspaceid, name
      `;
      insertedWorkspaces.push(result[0]);
      console.log(`✅ Workspace restored: ${result[0].name}`);
    }

    // 4. Restore Workspace-User Associations
    console.log('\n🔗 Restoring workspace-user associations...');
    
    // Associate admin with all workspaces
    for (const workspace of insertedWorkspaces) {
      await sql`
        INSERT INTO workspaceusers (workspaceid, userid, role, createdat)
        VALUES (
          ${workspace.workspaceid},
          ${adminUser[0].userid},
          'admin',
          NOW()
        )
        ON CONFLICT (workspaceid, userid) DO NOTHING
      `;
    }
    console.log(`✅ Admin associated with ${insertedWorkspaces.length} workspaces`);

    // Associate other users with main workspace
    const mainWorkspace = insertedWorkspaces[0];
    for (const user of insertedUsers) {
      await sql`
        INSERT INTO workspaceusers (workspaceid, userid, role, createdat)
        VALUES (
          ${mainWorkspace.workspaceid},
          ${user.userid},
          'member',
          NOW()
        )
        ON CONFLICT (workspaceid, userid) DO NOTHING
      `;
    }
    console.log(`✅ ${insertedUsers.length} users associated with main workspace`);

    // 5. Summary
    console.log('\n📋 Restoration Summary:');
    console.log('='.repeat(60));
    console.log(`✅ Users restored: ${insertedUsers.length + 1} (including admin)`);
    console.log(`✅ Workspaces restored: ${insertedWorkspaces.length}`);
    console.log(`✅ Workspace associations: ${insertedWorkspaces.length + insertedUsers.length}`);
    console.log('='.repeat(60));

    console.log('\n🎉 Authentication data restored successfully!');
    console.log('\n🔑 Login Credentials:');
    console.log('   Email: admin@tibbna.com');
    console.log('   Password: (use your existing password or reset if needed)');

  } catch (error) {
    console.error('❌ Error restoring auth data:', error.message);
    throw error;
  } finally {
    await sql.end();
  }
}

// Run
restoreAuthData().catch(console.error);
