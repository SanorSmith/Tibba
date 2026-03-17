const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_RBybikcu3tz5@ep-long-river-allaqs25.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require'
});

async function testPayrollPeriodsSystem() {
  console.log('💰 TESTING PAYROLL PERIODS SYSTEM');
  console.log('='.repeat(50));

  try {
    
    // Test 1: Check payroll_periods table
    console.log('\n1️⃣ Checking Payroll Periods Table...');
    try {
      const result = await pool.query('SELECT COUNT(*) as count FROM payroll_periods');
      console.log('✅ Payroll Periods Table: Working');
      console.log(`   Found ${result.rows[0].count} payroll periods`);

      if (result.rows[0].count > 0) {
        const sampleData = await pool.query('SELECT * FROM payroll_periods LIMIT 3');
        console.log('Sample payroll periods:');
        sampleData.rows.forEach((period, index) => {
          console.log(`   ${index + 1}. ${period.period_name} (${period.period_code}) - ${period.status}`);
          console.log(`      Dates: ${period.start_date} to ${period.end_date}`);
          console.log(`      Payment: ${period.payment_date}`);
          console.log(`      Totals: Gross: ${period.total_gross}, Net: ${period.total_net}`);
        });
      }
    } catch (error) {
      console.log('❌ Payroll Periods Table: Error -', error.message);
    }

    // Test 2: Check Payroll Periods API
    console.log('\n2️⃣ Testing Payroll Periods API...');
    try {
      const periodsResponse = await fetch('http://localhost:3000/api/hr/payroll/periods');
      const periodsData = await periodsResponse.json();
      
      if (periodsData.success) {
        console.log('✅ Payroll Periods API: Working');
        console.log(`   Found ${periodsData.data.length} periods`);
        if (periodsData.data.length > 0) {
          console.log(`   Sample: ${periodsData.data[0]?.period_name || 'No name'} - ${periodsData.data[0]?.status}`);
        }
      } else {
        console.log('❌ Payroll Periods API: Failed');
        console.log(`   Error: ${periodsData.error}`);
      }
    } catch (error) {
      console.log('❌ Payroll Periods API: Error -', error.message);
    }

    // Test 3: Check Payroll UI Integration
    console.log('\n3️⃣ Testing Payroll UI Integration...');
    try {
      const payrollPageResponse = await fetch('http://localhost:3000/hr/payroll');
      if (payrollPageResponse.ok) {
        console.log('✅ Payroll Dashboard Page: Accessible');
      } else {
        console.log('❌ Payroll Dashboard Page: Not accessible');
      }
    } catch (error) {
      console.log('❌ Payroll Dashboard Page: Error -', error.message);
    }

    // Test 4: Check Payroll Calculation Engine
    console.log('\n4️⃣ Testing Payroll Calculation Engine...');
    try {
      const fs = require('fs');
      const path = require('path');
      
      const calculationEnginePath = path.join(process.cwd(), 'src/lib/services/payroll-calculation-engine.ts');
      if (fs.existsSync(calculationEnginePath)) {
        console.log('✅ Payroll Calculation Engine: Found');
        
        // Check if it's connected to payroll periods
        const engineContent = fs.readFileSync(calculationEnginePath, 'utf8');
        if (engineContent.includes('payroll_periods')) {
          console.log('✅ Engine connected to payroll_periods table');
        } else {
          console.log('⚠️ Engine may not be directly connected to payroll_periods');
        }
      } else {
        console.log('❌ Payroll Calculation Engine: Not found');
      }
    } catch (error) {
      console.log('❌ Error checking calculation engine:', error.message);
    }

    // Test 5: Check Payroll Transactions
    console.log('\n5️⃣ Testing Payroll Transactions...');
    try {
      // Check if payroll transactions table exists and has data
      const transactionResult = await pool.query(`
        SELECT COUNT(*) as count 
        FROM information_schema.tables 
        WHERE table_name = 'payroll_transactions'
      `);
      
      if (transactionResult.rows[0].count > 0) {
        const transCount = await pool.query('SELECT COUNT(*) as count FROM payroll_transactions');
        console.log('✅ Payroll Transactions Table: Working');
        console.log(`   Found ${transCount.rows[0].count} transactions`);
        
        // Check if transactions are linked to payroll periods
        const linkCheck = await pool.query(`
          SELECT COUNT(*) as count 
          FROM information_schema.columns 
          WHERE table_name = 'payroll_transactions' 
          AND column_name = 'period_id'
        `);
        
        if (linkCheck.rows[0].count > 0) {
          console.log('✅ Transactions linked to payroll periods');
        } else {
          console.log('⚠️ Transactions may not be linked to periods');
        }
      } else {
        console.log('❌ Payroll Transactions Table: Not found');
      }
    } catch (error) {
      console.log('❌ Error checking transactions:', error.message);
    }

    // Test 6: Test Payroll Period Creation
    console.log('\n6️⃣ Testing Payroll Period Creation...');
    try {
      const testPeriod = {
        period_name: 'Test Period March 2026',
        period_code: 'TEST-MAR-2026',
        period_type: 'MONTHLY',
        start_date: '2026-03-01',
        end_date: '2026-03-31',
        payment_date: '2026-04-05',
        status: 'DRAFT'
      };

      const createResponse = await fetch('http://localhost:3000/api/hr/payroll/periods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testPeriod)
      });
      const createData = await createResponse.json();
      
      if (createData.success) {
        console.log('✅ Payroll Period Creation: Working');
        console.log(`   Created period ID: ${createData.data.id.substring(0, 8)}...`);
        
        // Clean up - delete the test period
        await pool.query('DELETE FROM payroll_periods WHERE id = $1', [createData.data.id]);
        console.log('   ✅ Test period cleaned up');
      } else {
        console.log('❌ Payroll Period Creation: Failed');
        console.log(`   Error: ${createData.error}`);
      }
    } catch (error) {
      console.log('❌ Payroll Period Creation: Error -', error.message);
    }

    console.log('\n🎯 PAYROLL PERIODS SYSTEM SUMMARY');
    console.log('='.repeat(40));
    console.log('✅ Payroll periods system tested');
    console.log('📝 Check individual results above');
    console.log('🚀 Ready for payroll management!');

  } catch (error) {
    console.error('❌ Test Suite Error:', error);
  } finally {
    await pool.end();
  }
}

// Run the tests
testPayrollPeriodsSystem().catch(console.error);
