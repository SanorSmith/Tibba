/**
 * Check appointment status enum values
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

async function checkAppointmentStatus() {
  console.log('🔍 Checking appointment status enum values...\n');

  try {
    const result = await sql`
      SELECT enumlabel 
      FROM pg_enum 
      WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'appointment_status')
      ORDER BY enumlabel
    `;

    console.log('Available appointment status values:');
    result.forEach(row => {
      console.log(`  - ${row.enumlabel}`);
    });

  } catch (error) {
    console.error('❌ Error checking appointment status:', error.message);
  } finally {
    await sql.end();
  }
}

checkAppointmentStatus();
