const postgres = require('postgres');

async function testInvoiceAPI() {
  try {
    console.log('🔍 TESTING INVOICE API QUERY');
    console.log('=============================\n');

    const sql = postgres('postgresql://neondb_owner:npg_8FjAiWwJlhz7@ep-red-cherry-ag82jhqf-pooler.c-2.eu-central-1.aws.neon.tech/neondb', { 
      ssl: 'require',
      max: 1
    });

    // Simple test query
    console.log('📋 Testing simple query...');
    const testQuery = await sql`
      SELECT 
        pi.invoiceid,
        pi.invoicenumber,
        pi.status,
        pi.total,
        pi.createdat
      FROM pharmacy_invoices pi
      ORDER BY pi.createdat DESC
      LIMIT 5
    `;
    
    console.log('✅ Simple query results:');
    testQuery.forEach((row, i) => {
      console.log(`${i + 1}. Invoice: ${row.invoicenumber}, Status: ${row.status}, Total: ${row.total}`);
    });
    console.log('');

    // Test with insurance join
    console.log('📋 Testing with insurance join...');
    const joinQuery = await sql`
      SELECT 
        pi.invoiceid,
        pi.invoicenumber,
        pi.status,
        pi.total,
        pi.createdat,
        ic.company_code,
        ic.company_name
      FROM pharmacy_invoices pi
      LEFT JOIN insurance_companies ic ON pi.insuranceid = ic.id
      ORDER BY pi.createdat DESC
      LIMIT 5
    `;
    
    console.log('✅ Join query results:');
    joinQuery.forEach((row, i) => {
      console.log(`${i + 1}. Invoice: ${row.invoicenumber}, Status: ${row.status}, Insurance: ${row.company_name || 'None'}`);
    });
    console.log('');

    await sql.end();

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testInvoiceAPI();
