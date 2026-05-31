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
  
  // Extract strength (numbers with units like mg, mcg, ml, etc.)
  const strengthMatch = inn.match(/(\d+\.?\d*\s*(mg|mcg|g|ml|%|iu|units?))/gi);
  const strength = strengthMatch ? strengthMatch.join(' ') : '';
  
  // Remove strength from name to get clean drug name
  const name = inn.replace(/\d+\.?\d*\s*(mg|mcg|g|ml|%|iu|units?)/gi, '').trim();
  
  return { name, strength };
}

// Extract category from national code
function extractCategory(nationalCode) {
  if (!nationalCode) return '';
  
  // National code format: XX-YY0-ZZZ
  // First part indicates category
  const parts = nationalCode.split('-');
  if (parts.length >= 2) {
    const categoryCode = parts[0];
    // Map category codes to names
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
      'NCDS': 'CARDIOVASCULAR SYSTEM' // Handle NCDS source
    };
    return categoryMap[categoryCode] || 'OTHER';
  }
  return '';
}

async function importNationalDrugs() {
  const client = await pool.connect();
  
  try {
    console.log('Starting import of National Drug List...');
    
    // Read and parse CSV - handle semicolon delimiter
    const drugs = [];
    const csvPath = 'NDL 1278.csv';
    
    console.log(`Reading CSV file: ${csvPath}`);
    
    await new Promise((resolve, reject) => {
      const stream = fs.createReadStream(csvPath)
        .pipe(csv({ 
          headers: false,
          separator: ';',  // Handle semicolon delimiter
          quote: '"',
          escape: '"'
        }))
        .on('data', (row) => {
          // Skip header rows and empty rows
          const rowArray = Object.values(row);
          
          // Log first few rows for debugging
          if (drugs.length < 5) {
            console.log(`Row ${drugs.length + 1}:`, rowArray.slice(0, 10));
          }
          
          // Skip if no row number or national code
          if (!rowArray[0] || !rowArray[2] || !rowArray[3]) {
            return;
          }
          
          // Skip header rows (non-numeric row numbers)
          if (isNaN(rowArray[0])) {
            return;
          }
          
          // Skip empty national codes
          if (!rowArray[2] || rowArray[2].trim() === '') {
            return;
          }
          
          const { name, strength } = parseDrugName(rowArray[3]);
          const category = extractCategory(rowArray[2]);
          
          const drug = {
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
          };
          
          drugs.push(drug);
        })
        .on('end', () => {
          console.log(`Parsed ${drugs.length} drugs from CSV`);
          resolve(drugs);
        })
        .on('error', reject);
    });
    
    if (drugs.length === 0) {
      console.log('No drugs parsed. Let me check the CSV file format...');
      
      // Read first few lines manually
      const content = fs.readFileSync(csvPath, 'utf8');
      const lines = content.split('\n').slice(0, 10);
      console.log('First 10 lines of CSV:');
      lines.forEach((line, i) => {
        console.log(`Line ${i + 1}:`, line.substring(0, 200));
      });
      
      return;
    }
    
    // Begin transaction
    await client.query('BEGIN');
    
    // Insert drugs in batches
    const batchSize = 100;
    let inserted = 0;
    let skipped = 0;
    
    for (let i = 0; i < drugs.length; i += batchSize) {
      const batch = drugs.slice(i, i + batchSize);
      
      for (const drug of batch) {
        try {
          await client.query(`
            INSERT INTO national_drugs (
              row_number, source, national_code, inn, drug_name, strength,
              dosage_form, route, biological_products, biosimilar,
              medical_device, edl, orphan, notes, category, active
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
            ON CONFLICT (national_code) DO UPDATE SET
              inn = EXCLUDED.inn,
              drug_name = EXCLUDED.drug_name,
              strength = EXCLUDED.strength,
              dosage_form = EXCLUDED.dosage_form,
              route = EXCLUDED.route,
              updated_at = CURRENT_TIMESTAMP
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
          console.error(`Error inserting drug ${drug.national_code}:`, err.message);
          skipped++;
        }
      }
      
      console.log(`Progress: ${Math.min(i + batchSize, drugs.length)}/${drugs.length} drugs processed`);
    }
    
    // Create OpenEHR medications from national drugs
    console.log('\nCreating OpenEHR medication entries...');
    
    await client.query(`
      INSERT INTO openehr_medications (
        medication_id, medication_name, generic_name, dose_form,
        strength, administration_route, national_code, therapeutic_category,
        active
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
      ON CONFLICT (medication_id) DO UPDATE SET
        medication_name = EXCLUDED.medication_name,
        generic_name = EXCLUDED.generic_name,
        dose_form = EXCLUDED.dose_form,
        strength = EXCLUDED.strength,
        administration_route = EXCLUDED.administration_route,
        updated_at = CURRENT_TIMESTAMP
    `);
    
    // Commit transaction
    await client.query('COMMIT');
    
    // Get statistics
    const stats = await client.query(`
      SELECT 
        (SELECT COUNT(*) FROM national_drugs) as total_drugs,
        (SELECT COUNT(*) FROM national_drugs WHERE active = true) as active_drugs,
        (SELECT COUNT(*) FROM openehr_medications) as openehr_medications,
        (SELECT COUNT(DISTINCT category) FROM national_drugs WHERE category IS NOT NULL) as categories,
        (SELECT COUNT(DISTINCT dosage_form) FROM national_drugs WHERE dosage_form IS NOT NULL) as dosage_forms
    `);
    
    console.log('\n=== IMPORT COMPLETE ===');
    console.log(`Total drugs inserted: ${inserted}`);
    console.log(`Skipped (errors): ${skipped}`);
    console.log(`\nDatabase Statistics:`);
    console.log(`- Total drugs in database: ${stats.rows[0].total_drugs}`);
    console.log(`- Active drugs: ${stats.rows[0].active_drugs}`);
    console.log(`- OpenEHR medications: ${stats.rows[0].openehr_medications}`);
    console.log(`- Categories: ${stats.rows[0].categories}`);
    console.log(`- Dosage forms: ${stats.rows[0].dosage_forms}`);
    
    // Sample data
    const sample = await client.query(`
      SELECT national_code, drug_name, strength, dosage_form, route, category
      FROM national_drugs
      LIMIT 5
    `);
    
    console.log('\nSample drugs:');
    sample.rows.forEach(drug => {
      console.log(`- ${drug.drug_name} ${drug.strength} (${drug.dosage_form}) - ${drug.national_code}`);
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Import failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run import
importNationalDrugs()
  .then(() => {
    console.log('\nImport completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\nImport failed:', error);
    process.exit(1);
  });
