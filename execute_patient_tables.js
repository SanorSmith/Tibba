const { Pool } = require('pg');

// Database connection - using the same URL as other test files
const databaseUrl = process.env.DATABASE_URL || "postgresql://neondb_owner:npg_RBybikcu3tz5@ep-long-river-allaqs25.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

const pool = new Pool({
  connectionString: databaseUrl,
  ssl: { rejectUnauthorized: false },
});

async function createPatientTables() {
  console.log('🚀 Starting to create patient additional tables...\n');

  try {
    const client = await pool.connect();
    
    // SQL statements to create the three tables
    const createTablesSQL = `
      -- Patient Emergency Contacts Table
      CREATE TABLE IF NOT EXISTS patient_emergency_contacts (
          emergencycontactid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          patientid UUID NOT NULL,
          contactname TEXT,
          contactphone TEXT,
          relationship TEXT,
          createdat TIMESTAMP DEFAULT NOW(),
          updatedat TIMESTAMP DEFAULT NOW(),
          CONSTRAINT fk_patient_emergency
              FOREIGN KEY (patientid) 
              REFERENCES patients(patientid)
              ON DELETE CASCADE
      );

      -- Patient Insurance Information Table
      CREATE TABLE IF NOT EXISTS patient_insurance_information (
          insuranceid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          patientid UUID NOT NULL,
          insurancecompany TEXT,
          insurancenumber TEXT,
          policytype TEXT,
          coveragedetails JSONB DEFAULT '{}',
          createdat TIMESTAMP DEFAULT NOW(),
          updatedat TIMESTAMP DEFAULT NOW(),
          CONSTRAINT fk_patient_insurance
              FOREIGN KEY (patientid) 
              REFERENCES patients(patientid)
              ON DELETE CASCADE
      );

      -- Patient Medical Information Table
      CREATE TABLE IF NOT EXISTS patient_medical_information (
          medicalinfoid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          patientid UUID NOT NULL,
          allergies TEXT,
          chronicdiseases TEXT,
          currentmedications TEXT,
          medicalhistory TEXT,
          surgicalhistory TEXT,
          familyhistory TEXT,
          createdat TIMESTAMP DEFAULT NOW(),
          updatedat TIMESTAMP DEFAULT NOW(),
          CONSTRAINT fk_patient_medical
              FOREIGN KEY (patientid) 
              REFERENCES patients(patientid)
              ON DELETE CASCADE
      );

      -- Create indexes for better query performance
      CREATE INDEX IF NOT EXISTS idx_emergency_contacts_patient ON patient_emergency_contacts(patientid);
      CREATE INDEX IF NOT EXISTS idx_insurance_patient ON patient_insurance_information(patientid);
      CREATE INDEX IF NOT EXISTS idx_medical_info_patient ON patient_medical_information(patientid);

      -- Comments for documentation
      COMMENT ON TABLE patient_emergency_contacts IS 'Stores emergency contact information for patients';
      COMMENT ON TABLE patient_insurance_information IS 'Stores insurance details for patients';
      COMMENT ON TABLE patient_medical_information IS 'Stores detailed medical information including allergies, chronic diseases, and medications';
    `;

    console.log('📝 Executing SQL to create tables...');
    await client.query(createTablesSQL);
    
    // Verify tables were created
    console.log('\n🔍 Verifying tables were created...');
    const checkTables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN (
        'patient_emergency_contacts',
        'patient_insurance_information',
        'patient_medical_information'
      )
      ORDER BY table_name
    `);

    console.log('\n✅ Tables created successfully:');
    checkTables.rows.forEach(row => {
      console.log(`   - ${row.table_name}`);
    });

    // Check foreign key constraints
    console.log('\n🔗 Checking foreign key constraints...');
    const checkConstraints = await client.query(`
      SELECT
          tc.constraint_name,
          tc.table_name,
          kcu.column_name,
          ccu.table_name AS foreign_table_name,
          ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_name LIKE 'patient_%'
      ORDER BY tc.table_name, tc.constraint_name
    `);

    console.log('\n🔐 Foreign key constraints:');
    checkConstraints.rows.forEach(constraint => {
      console.log(`   - ${constraint.table_name}.${constraint.column_name} → ${constraint.foreign_table_name}.${constraint.foreign_column_name}`);
    });

    // Check indexes
    console.log('\n📊 Checking indexes...');
    const checkIndexes = await client.query(`
      SELECT 
        indexname,
        tablename,
        indexdef
      FROM pg_indexes
      WHERE tablename IN (
        'patient_emergency_contacts',
        'patient_insurance_information',
        'patient_medical_information'
      )
      ORDER BY tablename, indexname
    `);

    console.log('\n📈 Indexes created:');
    checkIndexes.rows.forEach(index => {
      console.log(`   - ${index.tablename}: ${index.indexname}`);
    });

    console.log('\n🎉 All patient tables and constraints created successfully!');
    console.log('\n📋 Summary:');
    console.log(`   - 3 new tables created`);
    console.log(`   - 3 foreign key constraints established`);
    console.log(`   - 3 performance indexes created`);
    console.log(`   - All connected to the main patients table`);

    await client.release();
    
  } catch (error) {
    console.error('❌ Error creating tables:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the function
createPatientTables().catch(console.error);
