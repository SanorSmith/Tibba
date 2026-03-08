const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_RBybikcu3tz5@ep-long-river-allaqs25.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require'
});

// =====================================================
// MONTHLY LEAVE ACCRUAL JOB
// Run this on the 1st of every month
// =====================================================

async function runMonthlyAccrual() {
  console.log('🔄 Starting monthly leave accrual job...');
  
  const startTime = Date.now();
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  
  console.log(`📅 Processing accrual for: ${year}-${month.toString().padStart(2, '0')}`);
  
  try {
    // Call the stored procedure
    const result = await pool.query('SELECT * FROM process_monthly_accrual()');
    
    const summary = {
      employees_processed: result.rows.length,
      total_accrued: 0,
      successful: 0,
      failed: 0,
    };
    
    result.rows.forEach(row => {
      if (row.status === 'SUCCESS') {
        summary.successful++;
        summary.total_accrued += parseFloat(row.accrued_days || 0);
      } else {
        summary.failed++;
      }
    });
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.log('✅ Monthly accrual completed:');
    console.log(`   Employees processed: ${summary.employees_processed}`);
    console.log(`   Successful: ${summary.successful}`);
    console.log(`   Failed: ${summary.failed}`);
    console.log(`   Total days accrued: ${summary.total_accrued.toFixed(2)}`);
    console.log(`   Duration: ${duration}s`);
    
    // Log to database
    try {
      await pool.query(
        `INSERT INTO leave_audit_log (
          leave_request_id,
          action,
          performed_by_name,
          notes
        ) VALUES (
          '00000000-0000-0000-0000-000000000000',
          'MONTHLY_ACCRUAL',
          'SYSTEM',
          $1
        )`,
        [`Monthly accrual completed: ${summary.successful} employees, ${summary.total_accrued.toFixed(2)} days accrued`]
      );
    } catch (logError) {
      console.log('Note: Could not log to audit table');
    }
    
    return summary;
    
  } catch (error) {
    console.error('❌ Monthly accrual job failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run if called directly
if (require.main === module) {
  runMonthlyAccrual()
    .then(() => {
      console.log('✅ Job completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Job failed:', error);
      process.exit(1);
    });
}

module.exports = { runMonthlyAccrual };
