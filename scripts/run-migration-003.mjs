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

    // Read the migration file
    const migrationPath = path.join(__dirname, 'migrations', '003-rename-description-to-route.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    console.log('Running migration: 003-rename-description-to-route.sql');
    console.log('---');

    // Execute the migration
    await client.query(sql);

    console.log('✅ Migration completed successfully!');
    console.log('   - Renamed global_drugs.description → global_drugs.route');
    console.log('   - Renamed drugs.description → drugs.route');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();
