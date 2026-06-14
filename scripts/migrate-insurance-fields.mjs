import postgres from 'postgres';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

config({ path: join(__dirname, '..', '.env') });

const sql = postgres(process.env.DATABASE_URL);

async function migrate() {
  try {
    console.log('Adding missing fields to insurance_companies table...');
    
    await sql`
      ALTER TABLE insurance_companies 
      ADD COLUMN IF NOT EXISTS api_endpoint text,
      ADD COLUMN IF NOT EXISTS api_key text,
      ADD COLUMN IF NOT EXISTS edi_payer_id text,
      ADD COLUMN IF NOT EXISTS claim_submission_method text,
      ADD COLUMN IF NOT EXISTS pre_approval_required boolean NOT NULL DEFAULT true
    `;
    
    console.log('✅ Migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

migrate();
