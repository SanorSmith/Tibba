const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_RBybikcu3tz5@ep-long-river-allaqs25.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require'
});

async function testShiftSystem() {
  console.log('🕐 TESTING SHIFT MANAGEMENT SYSTEM');
  console.log('='.repeat(50));

  try {
    
    // Test 1: Check if shift tables exist
    console.log('\n1️⃣ Checking Shift Database Tables...');
    try {
      const tablesResult = await pool.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND (table_name LIKE '%shift%' OR table_name LIKE '%schedule%')
        ORDER BY table_name
      `);

      if (tablesResult.rows.length > 0) {
        console.log('✅ Shift/Schedule Tables Found:');
        tablesResult.rows.forEach(row => {
          console.log(`   - ${row.table_name}`);
        });
      } else {
        console.log('❌ No shift/schedule tables found');
      }
    } catch (error) {
      console.log('❌ Error checking tables:', error.message);
    }

    // Test 2: Check shift data
    console.log('\n2️⃣ Testing Shift Data...');
    try {
      const shiftResult = await pool.query('SELECT COUNT(*) as count FROM shifts');
      console.log(`✅ Shifts table: ${shiftResult.rows[0].count} records`);

      if (shiftResult.rows[0].count > 0) {
        const shiftData = await pool.query('SELECT * FROM shifts LIMIT 3');
        console.log('Sample shifts:');
        shiftData.rows.forEach((shift, index) => {
          console.log(`   ${index + 1}. ${shift.name} (${shift.shift_type}) - ${shift.start_time} to ${shift.end_time}`);
        });
      }
    } catch (error) {
      console.log('❌ Error checking shift data:', error.message);
    }

    // Test 3: Check schedule data
    console.log('\n3️⃣ Testing Schedule Data...');
    try {
      const scheduleResult = await pool.query('SELECT COUNT(*) as count FROM employee_schedules');
      console.log(`✅ Employee Schedules: ${scheduleResult.rows[0].count} records`);

      if (scheduleResult.rows[0].count > 0) {
        const scheduleData = await pool.query(`
          SELECT es.*, s.firstname || ' ' || s.lastname as employee_name, sh.name as shift_name
          FROM employee_schedules es
          LEFT JOIN staff s ON es.employee_id = s.staffid
          LEFT JOIN shifts sh ON es.shift_id = sh.id
          LIMIT 3
        `);
        console.log('Sample schedules:');
        scheduleData.rows.forEach((schedule, index) => {
          console.log(`   ${index + 1}. ${schedule.employee_name} - ${schedule.shift_name} (${schedule.effective_date})`);
        });
      }
    } catch (error) {
      console.log('❌ Error checking schedule data:', error.message);
    }

    // Test 4: Test Shift API
    console.log('\n4️⃣ Testing Shift API...');
    try {
      const schedulesResponse = await fetch('http://localhost:3000/api/hr/schedules');
      const schedulesData = await schedulesResponse.json();
      
      if (schedulesData.success) {
        console.log('✅ Schedules API: Working');
        console.log(`   Found ${schedulesData.data.length} schedules`);
        if (schedulesData.data.length > 0) {
          console.log(`   Sample: ${schedulesData.data[0]?.employee_name || 'No name'} - ${schedulesData.data[0]?.shift_name || 'No shift'}`);
        }
      } else {
        console.log('❌ Schedules API: Failed');
        console.log(`   Error: ${schedulesData.error}`);
      }
    } catch (error) {
      console.log('❌ Schedules API: Error -', error.message);
    }

    // Test 5: Test Shift Creation API
    console.log('\n5️⃣ Testing Shift Creation API...');
    try {
      // First check if we have any shifts defined
      const shiftCheck = await pool.query('SELECT id FROM shifts LIMIT 1');
      
      if (shiftCheck.rows.length > 0) {
        const testShift = {
          employee_id: 'test-employee-id',
          shift_id: shiftCheck.rows[0].id,
          effective_date: '2025-01-15',
          schedule_type: 'REGULAR',
          status: 'ACTIVE'
        };

        const createResponse = await fetch('http://localhost:3000/api/hr/schedules', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(testShift)
        });
        const createData = await createResponse.json();
        
        if (createData.success) {
          console.log('✅ Schedule Creation: Working');
          console.log(`   Created schedule ID: ${createData.data.id.substring(0, 8)}...`);
          
          // Clean up - delete the test schedule
          await pool.query('DELETE FROM employee_schedules WHERE id = $1', [createData.data.id]);
          console.log('   ✅ Test schedule cleaned up');
        } else {
          console.log('❌ Schedule Creation: Failed');
          console.log(`   Error: ${createData.error}`);
        }
      } else {
        console.log('⚠️ No shifts available to test schedule creation');
      }
    } catch (error) {
      console.log('❌ Schedule Creation: Error -', error.message);
    }

    // Test 6: Check UI Components
    console.log('\n6️⃣ Checking UI Components...');
    try {
      const fs = require('fs');
      const path = require('path');
      
      const schedulePagePath = path.join(process.cwd(), 'src/app/(dashboard)/hr/schedules/page.tsx');
      if (fs.existsSync(schedulePagePath)) {
        console.log('✅ Schedules Page UI: Found');
      } else {
        console.log('❌ Schedules Page UI: Not found');
      }

      const scheduleCreatePath = path.join(process.cwd(), 'src/app/(dashboard)/hr/schedules/create/page.tsx');
      if (fs.existsSync(scheduleCreatePath)) {
        console.log('✅ Schedule Creation UI: Found');
      } else {
        console.log('❌ Schedule Creation UI: Not found');
      }
    } catch (error) {
      console.log('❌ Error checking UI:', error.message);
    }

    console.log('\n🎯 SHIFT SYSTEM TEST SUMMARY');
    console.log('='.repeat(35));
    console.log('✅ Shift system components tested');
    console.log('📝 Check individual results above');
    console.log('🚀 Ready for shift management!');

  } catch (error) {
    console.error('❌ Test Suite Error:', error);
  } finally {
    await pool.end();
  }
}

// Run the tests
testShiftSystem().catch(console.error);
