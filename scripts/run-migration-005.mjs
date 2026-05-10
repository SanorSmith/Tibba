import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATABASE_URL = process.env.DATABASE_URL || "postgresql://neondb_owner:npg_RBybikcu3tz5@ep-long-river-allaqs25.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

const client = new pg.Client({
  connectionString: DATABASE_URL,
});

async function runMigration() {
  try {
    await client.connect();
    console.log('Connected to database');

    const migrationPath = path.join(__dirname, 'migrations', '005-create-insurance-tables.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    console.log('Running migration: 005-create-insurance-tables.sql');
    console.log('---');

    await client.query(sql);

    console.log('✅ Migration completed successfully!');
    console.log('   - Created insurance_companies table');
    console.log('   - Created patient_insurance table');
    console.log('   - Created insurance_pre_approvals table');
    console.log('   - Added indexes for performance');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();
