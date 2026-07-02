const { Pool } = require('pg');

const DATABASE_URL = "postgresql://neondb_owner:npg_RBybikcu3tz5@ep-long-river-allaqs25.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function main() {
  const nationalId = process.argv[2] || '199001010101';
  
  console.log(`Searching for patient with National ID: ${nationalId}\n`);
  
  try {
    const result = await pool.query(
      'SELECT firstname, middlename, lastname, nationalid, phone, email, dateofbirth, gender FROM patients WHERE nationalid = $1',
      [nationalId]
    );
    
    if (result.rows.length > 0) {
      const patient = result.rows[0];
      const fullName = `${patient.firstname} ${patient.middlename || ''} ${patient.lastname}`.trim();
      console.log('Patient Found:');
      console.log('================');
      console.log(`Name: ${fullName}`);
      console.log(`First Name: ${patient.firstname}`);
      console.log(`Middle Name: ${patient.middlename || 'N/A'}`);
      console.log(`Last Name: ${patient.lastname}`);
      console.log(`National ID: ${patient.nationalid}`);
      console.log(`Date of Birth: ${patient.dateofbirth}`);
      console.log(`Gender: ${patient.gender}`);
      console.log(`Phone: ${patient.phone || 'N/A'}`);
      console.log(`Email: ${patient.email || 'N/A'}`);
    } else {
      console.log('Patient not found in Neon database');
      
      // Try searching by partial match
      console.log('\nTrying partial match...');
      const partialResult = await pool.query(
        'SELECT firstname, middlename, lastname, nationalid FROM patients WHERE nationalid LIKE $1 LIMIT 10',
        [`%${nationalId}%`]
      );
      
      if (partialResult.rows.length > 0) {
        console.log('Similar patients found:');
        partialResult.rows.forEach((row, i) => {
          console.log(`${i+1}. ${row.firstname} ${row.middlename || ''} ${row.lastname} - ${row.nationalid}`);
        });
      }
    }
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

main();
