// Setup HR Database Tables and Seed Data
const postgres = require('postgres');
const fs = require('fs');
const path = require('path');

// Database connection
const databaseUrl = process.env.DATABASE_URL || "postgresql://neondb_owner:npg_RBybikcu3tz5@ep-long-river-allaqs25.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

async function setupHRDatabase() {
  console.log('🚀 Setting up HR Database...');
  console.log(`📊 Database: ${databaseUrl.split('@')[1].split('?')[0]}`);
  
  const sql = postgres(databaseUrl, {
    ssl: 'require',
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
  });

  try {
    // Step 1: Create tables
    console.log('\n📋 Step 1: Creating HR Tables...');
    const schemaSQL = fs.readFileSync(
      path.join(__dirname, 'database', 'create_hr_tables.sql'),
      'utf8'
    );
    
    await sql.unsafe(schemaSQL);
    console.log('✅ HR Tables created successfully!');

    // Step 2: Seed data
    console.log('\n🌱 Step 2: Seeding HR Data...');
    const seedSQL = fs.readFileSync(
      path.join(__dirname, 'database', 'seed_hr_data.sql'),
      'utf8'
    );
    
    await sql.unsafe(seedSQL);
    console.log('✅ HR Data seeded successfully!');

    // Step 3: Verify tables
    console.log('\n🔍 Step 3: Verifying Tables...');
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name LIKE '%leave%' OR table_name LIKE '%shift%' OR table_name LIKE '%attendance%' OR table_name LIKE '%holiday%'
      ORDER BY table_name
    `;
    
    console.log('\n📊 Created Tables:');
    console.table(tables);

    // Step 4: Verify data
    console.log('\n📈 Step 4: Verifying Data...');
    
    const leaveTypes = await sql`SELECT COUNT(*) as count FROM leave_types`;
    const shifts = await sql`SELECT COUNT(*) as count FROM shifts`;
    const holidays = await sql`SELECT COUNT(*) as count FROM official_holidays`;
    
    console.log('\n📈 Data Summary:');
    console.log(`📝 Leave Types: ${leaveTypes[0].count}`);
    console.log(`⏰ Shifts: ${shifts[0].count}`);
    console.log(`🎉 Holidays: ${holidays[0].count}`);

    // Step 5: Sample data
    console.log('\n📋 Step 5: Sample Leave Types:');
    const sampleLeaves = await sql`
      SELECT name, code, max_days_per_year, is_paid 
      FROM leave_types 
      ORDER BY sort_order 
      LIMIT 5
    `;
    console.table(sampleLeaves);

    console.log('\n🎉 HR Database Setup Complete!');
    console.log('\n🔗 Next Steps:');
    console.log('1. Start your development server: npm run dev');
    console.log('2. Navigate to: /hr/leaves/types');
    console.log('3. Test the Leave Types CRUD system');

  } catch (error) {
    console.error('❌ Error setting up HR Database:', error);
  } finally {
    await sql.end();
  }
}

// Run the setup
setupHRDatabase().catch(console.error);
