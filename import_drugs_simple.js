const { Pool } = require('pg');
const fs = require('fs');
const csv = require('csv-parser');

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://neondb_owner:npg_RBybikcu3tz5@ep-long-river-allaqs25.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require",
  ssl: { rejectUnauthorized: false }
});

// Parse drug name to extract name and strength
function parseDrugName(inn) {
  if (!inn) return { name: '', strength: '' };
  
  const strengthMatch = inn.match(/(\d+\.?\d*\s*(mg|mcg|g|ml|%|iu|units?))/gi);
  const strength = strengthMatch ? strengthMatch.join(' ') : '';
  const name = inn.replace(/\d+\.?\d*\s*(mg|mcg|g|ml|%|iu|units?)/gi, '').trim();
  
  return { name, strength };
}

// Extract category from national code
function extractCategory(nationalCode) {
  if (!nationalCode) return '';
  
  const parts = nationalCode.split('-');
  if (parts.length >= 2) {
    const categoryCode = parts[0];
    const categoryMap = {
      '01': 'CARDIOVASCULAR SYSTEM',
      '02': 'BLOOD AND BLOOD FORMING ORGANS',
      '03': 'DERMATOLOGICALS',
      '04': 'GENITO URINARY SYSTEM',
      '05': 'HORMONES',
      '06': 'ANTI-INFECTIVES',
      '07': 'ANTINEOPLASTIC',
      '08': 'MUSCULO-SKELETAL SYSTEM',
      '09': 'NERVOUS SYSTEM',
      '10': 'ANTIPARASITIC',
      '11': 'RESPIRATORY SYSTEM',
      '12': 'SENSORY ORGANS',
      '13': 'VARIOUS',
      '14': 'DIAGNOSTIC AGENTS',
      '15': 'DISINFECTANTS',
      '16': 'DIURETICS',
      '17': 'ELECTROLYTES',
      'NCDS': 'CARDIOVASCULAR SYSTEM'
    };
    return categoryMap[categoryCode] || 'OTHER';
  }
  return '';
}

async function importDrugs() {
  try {
    console.log('Starting simple drug import...');
    
    // Read CSV
    const drugs = [];
    const csvPath = 'NDL 1278.csv';
    
    await new Promise((resolve, reject) => {
      fs.createReadStream(csvPath)
        .pipe(csv({ 
          headers: false,
          separator: ';',
          quote: '"',
          escape: '"'
        }))
        .on('data', (row) => {
          const rowArray = Object.values(row);
          
          if (!rowArray[0] || !rowArray[2] || !rowArray[3] || isNaN(rowArray[0])) {
            return;
          }
          
          const { name, strength } = parseDrugName(rowArray[3]);
          const category = extractCategory(rowArray[2]);
          
          drugs.push({
            row_number: parseInt(rowArray[0]) || null,
            source: rowArray[1] || null,
            national_code: rowArray[2] ? rowArray[2].trim() : null,
            inn: rowArray[3] || null,
            drug_name: name || rowArray[3],
            strength: strength || null,
            dosage_form: rowArray[4] || null,
            route: rowArray[5] || null,
            biological_products: rowArray[6] || null,
            biosimilar: rowArray[7] || null,
            medical_device: rowArray[8] || null,
            edl: rowArray[9] || null,
            orphan: rowArray[10] || null,
            notes: rowArray[11] || null,
            category: category
          });
          
          // Limit to first 100 drugs for testing
          if (drugs.length >= 100) {
            resolve(drugs);
          }
        })
        .on('end', () => resolve(drugs))
        .on('error', reject);
    });
    
    console.log(`Parsed ${drugs.length} drugs (limited to 100 for testing)`);
    
    // Insert drugs one by one to avoid transaction issues
    let inserted = 0;
    for (const drug of drugs) {
      try {
        await pool.query(`
          INSERT INTO national_drugs (
            row_number, source, national_code, inn, drug_name, strength,
            dosage_form, route, biological_products, biosimilar,
            medical_device, edl, orphan, notes, category, active
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
          ON CONFLICT (national_code) DO NOTHING
        `, [
          drug.row_number,
          drug.source,
          drug.national_code,
          drug.inn,
          drug.drug_name,
          drug.strength,
          drug.dosage_form,
          drug.route,
          drug.biological_products,
          drug.biosimilar,
          drug.medical_device,
          drug.edl,
          drug.orphan,
          drug.notes,
          drug.category,
          true
        ]);
        inserted++;
      } catch (err) {
        console.error(`Error inserting ${drug.national_code}:`, err.message);
      }
    }
    
    // Create OpenEHR medications
    console.log('Creating OpenEHR medications...');
    await pool.query(`
      INSERT INTO openehr_medications (
        medication_id, medication_name, generic_name, dose_form,
        strength, administration_route, national_code, therapeutic_category, active
      )
      SELECT 
        national_code as medication_id,
        drug_name as medication_name,
        inn as generic_name,
        dosage_form as dose_form,
        strength,
        route as administration_route,
        national_code,
        category as therapeutic_category,
        true as active
      FROM national_drugs
      WHERE national_code IS NOT NULL
      ON CONFLICT (medication_id) DO NOTHING
    `);
    
    // Get statistics
    const stats = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM national_drugs) as total_drugs,
        (SELECT COUNT(*) FROM national_drugs WHERE active = true) as active_drugs,
        (SELECT COUNT(*) FROM openehr_medications) as openehr_medications,
        (SELECT COUNT(DISTINCT category) FROM national_drugs WHERE category IS NOT NULL) as categories
    `);
    
    console.log('\n=== IMPORT COMPLETE ===');
    console.log(`Total drugs inserted: ${inserted}`);
    console.log(`\nDatabase Statistics:`);
    console.log(`- Total drugs in database: ${stats.rows[0].total_drugs}`);
    console.log(`- Active drugs: ${stats.rows[0].active_drugs}`);
    console.log(`- OpenEHR medications: ${stats.rows[0].openehr_medications}`);
    console.log(`- Categories: ${stats.rows[0].categories}`);
    
    // Sample drugs
    const sample = await pool.query(`
      SELECT national_code, drug_name, strength, dosage_form, route, category
      FROM national_drugs
      ORDER BY id
      LIMIT 5
    `);
    
    console.log('\nSample drugs:');
    sample.rows.forEach(drug => {
      console.log(`- ${drug.drug_name} ${drug.strength} (${drug.dosage_form}) - ${drug.national_code}`);
    });
    
  } catch (error) {
    console.error('Import failed:', error);
  } finally {
    await pool.end();
  }
}

importDrugs();
