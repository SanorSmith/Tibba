const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://neondb_owner:npg_RBybikcu3tz5@ep-long-river-allaqs25.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require",
  ssl: { rejectUnauthorized: false }
});

async function countDrugs() {
  const client = await pool.connect();
  
  try {
    console.log('=== COUNTING DRUGS TABLE RECORDS ===');
    
    // Total count
    const totalResult = await client.query('SELECT COUNT(*) as total_drugs FROM drugs');
    console.log(`Total records in drugs table: ${totalResult.rows[0].total_drugs}`);
    
    // Active drugs
    const activeResult = await client.query('SELECT COUNT(*) as active_drugs FROM drugs WHERE isactive = true');
    console.log(`Active drugs: ${activeResult.rows[0].active_drugs}`);
    
    // Drugs with national codes
    const nationalCodeResult = await client.query("SELECT COUNT(*) as with_national_code FROM drugs WHERE nationalcode IS NOT NULL AND nationalcode != ''");
    console.log(`Drugs with national codes: ${nationalCodeResult.rows[0].with_national_code}`);
    
    // Prescription required
    const prescriptionResult = await client.query('SELECT COUNT(*) as prescription_required FROM drugs WHERE requiresprescription = true');
    console.log(`Drugs requiring prescription: ${prescriptionResult.rows[0].prescription_required}`);
    
    // Insurance approved
    const insuranceResult = await client.query('SELECT COUNT(*) as insurance_approved FROM drugs WHERE insuranceapproved = true');
    console.log(`Insurance approved drugs: ${insuranceResult.rows[0].insurance_approved}`);
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

countDrugs();
