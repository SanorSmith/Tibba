import pg from 'pg';

const DATABASE_URL = process.env.DATABASE_URL || "postgresql://neondb_owner:npg_RBybikcu3tz5@ep-long-river-allaqs25.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

const client = new pg.Client({
  connectionString: DATABASE_URL,
});

async function fixPatientEhrId() {
  try {
    await client.connect();
    console.log('Connected to database');

    const patientId = '0e4be40e-55e1-4297-8a56-56683f7fb6d8';
    const correctEhrId = 'eb1730f4-5133-4fdd-afe5-326f9ecef4d7';

    console.log(`Updating patient ${patientId} with correct EHR ID: ${correctEhrId}`);

    const result = await client.query(
      'UPDATE patients SET ehrid = $1 WHERE patientid = $2 RETURNING patientid, ehrid',
      [correctEhrId, patientId]
    );

    if (result.rows.length > 0) {
      console.log('✅ Patient EHR ID updated successfully!');
      console.log('Updated patient:', result.rows[0]);
    } else {
      console.log('❌ Patient not found');
    }

  } catch (error) {
    console.error('❌ Update failed:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

fixPatientEhrId();
