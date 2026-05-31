const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://neondb_owner:npg_RBybikcu3tz5@ep-long-river-allaqs25.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require",
  ssl: { rejectUnauthorized: false }
});

async function checkImport() {
  const client = await pool.connect();
  
  try {
    console.log('=== CHECKING NATIONAL DRUGS IMPORT ===');
    
    // Check total counts
    const stats = await client.query(`
      SELECT 
        (SELECT COUNT(*) FROM national_drugs) as total_drugs,
        (SELECT COUNT(*) FROM national_drugs WHERE active = true) as active_drugs,
        (SELECT COUNT(*) FROM openehr_medications) as openehr_medications,
        (SELECT COUNT(DISTINCT category) FROM national_drugs WHERE category IS NOT NULL) as categories,
        (SELECT COUNT(DISTINCT dosage_form) FROM national_drugs WHERE dosage_form IS NOT NULL) as dosage_forms
    `);
    
    console.log('\n📊 Database Statistics:');
    console.log(`- Total drugs in database: ${stats.rows[0].total_drugs}`);
    console.log(`- Active drugs: ${stats.rows[0].active_drugs}`);
    console.log(`- OpenEHR medications: ${stats.rows[0].openehr_medications}`);
    console.log(`- Categories: ${stats.rows[0].categories}`);
    console.log(`- Dosage forms: ${stats.rows[0].dosage_forms}`);
    
    // Sample drugs
    const sample = await client.query(`
      SELECT national_code, drug_name, strength, dosage_form, route, category
      FROM national_drugs
      ORDER BY id
      LIMIT 10
    `);
    
    console.log('\n💊 Sample drugs:');
    sample.rows.forEach(drug => {
      console.log(`- ${drug.drug_name} ${drug.strength} (${drug.dosage_form}) - ${drug.national_code} - ${drug.category}`);
    });
    
    // Categories
    const categories = await client.query(`
      SELECT category, COUNT(*) as count
      FROM national_drugs
      WHERE category IS NOT NULL AND category != ''
      GROUP BY category
      ORDER BY count DESC
    `);
    
    console.log('\n📋 Categories:');
    categories.rows.forEach(cat => {
      console.log(`- ${cat.category}: ${cat.count} drugs`);
    });
    
    // Dosage forms
    const dosageForms = await client.query(`
      SELECT dosage_form, COUNT(*) as count
      FROM national_drugs
      WHERE dosage_form IS NOT NULL AND dosage_form != ''
      GROUP BY dosage_form
      ORDER BY count DESC
      LIMIT 10
    `);
    
    console.log('\n💉 Top Dosage Forms:');
    dosageForms.rows.forEach(form => {
      console.log(`- ${form.dosage_form}: ${form.count} drugs`);
    });
    
    // Check for essential drugs
    const essentialDrugs = await client.query(`
      SELECT COUNT(*) as count
      FROM national_drugs
      WHERE edl IS NOT NULL AND edl != ''
    `);
    
    console.log(`\n🌟 Essential Drugs (EDL): ${essentialDrugs.rows[0].count}`);
    
    // Test API endpoint
    console.log('\n🔌 Testing API endpoint...');
    const apiTest = await client.query(`
      SELECT drug_name, national_code, strength, dosage_form
      FROM national_drugs
      WHERE drug_name ILIKE '%digoxin%'
      LIMIT 5
    `);
    
    console.log('API search test results:');
    apiTest.rows.forEach(drug => {
      console.log(`- ${drug.drug_name} ${drug.strength} (${drug.national_code})`);
    });
    
  } catch (error) {
    console.error('Error checking import:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

checkImport();
