const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_RBybikcu3tz5@ep-long-river-allaqs25.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require'
});

async function verifyDeployment() {
  console.log('🔍 Verifying Leave Management System Deployment\n');
  
  try {
    // Check all new tables
    const tables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema='public' 
      AND table_name IN (
        'leave_policy_rules',
        'leave_audit_log',
        'department_staffing_rules',
        'leave_approval_workflow',
        'leave_request_approvals',
        'notifications',
        'notification_templates',
        'notification_preferences'
      )
      ORDER BY table_name
    `);
    
    console.log('✅ Tables Created:', tables.rows.length);
    tables.rows.forEach(row => console.log('   -', row.table_name));
    
    // Check functions
    const functions = await pool.query(`
      SELECT routine_name 
      FROM information_schema.routines 
      WHERE routine_schema='public' 
      AND routine_name IN (
        'update_leave_balance_on_approval',
        'restore_leave_balance_on_cancel',
        'calculate_monthly_accrual',
        'validate_leave_balance',
        'process_monthly_accrual',
        'log_leave_request_changes',
        'send_notification',
        'notify_leave_status_change'
      )
      ORDER BY routine_name
    `);
    
    console.log('\n✅ Functions Created:', functions.rows.length);
    functions.rows.forEach(row => console.log('   -', row.routine_name));
    
    // Check triggers
    const triggers = await pool.query(`
      SELECT trigger_name, event_object_table
      FROM information_schema.triggers 
      WHERE trigger_schema='public'
      AND trigger_name IN (
        'trg_leave_approved_update_balance',
        'trg_leave_cancelled_restore_balance',
        'trg_log_leave_changes',
        'trg_notify_leave_status'
      )
      ORDER BY trigger_name
    `);
    
    console.log('\n✅ Triggers Created:', triggers.rows.length);
    triggers.rows.forEach(row => console.log(`   - ${row.trigger_name} on ${row.event_object_table}`));
    
    // Check notification templates
    const templates = await pool.query(`
      SELECT COUNT(*) as count FROM notification_templates
    `);
    
    console.log('\n✅ Notification Templates:', templates.rows[0].count);
    
    console.log('\n🎉 DEPLOYMENT VERIFICATION COMPLETE!');
    console.log('\n📊 Summary:');
    console.log(`   - ${tables.rows.length}/8 tables created`);
    console.log(`   - ${functions.rows.length}/8 functions created`);
    console.log(`   - ${triggers.rows.length}/4 triggers created`);
    console.log(`   - ${templates.rows[0].count} notification templates loaded`);
    
    if (tables.rows.length === 8 && functions.rows.length === 8 && triggers.rows.length === 4) {
      console.log('\n✅ ALL SYSTEMS OPERATIONAL!');
    } else {
      console.log('\n⚠️  Some components may be missing. Review logs above.');
    }
    
  } catch (error) {
    console.error('❌ Verification failed:', error.message);
  } finally {
    await pool.end();
  }
}

verifyDeployment();
