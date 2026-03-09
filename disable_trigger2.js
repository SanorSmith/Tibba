const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function disableTrigger() {
  try {
    // Try to disable it by altering the trigger function to do nothing
    await pool.query(`
      CREATE OR REPLACE FUNCTION public.notify_leave_status_change() 
      RETURNS trigger 
      LANGUAGE plpgsql
      AS $function$
      BEGIN
        RETURN NEW;
      END;
      $function$
    `);
    console.log('Trigger function updated to do nothing');
    await pool.end();
  } catch (e) {
    console.error('Error:', e.message);
    await pool.end();
  }
}
disableTrigger();
