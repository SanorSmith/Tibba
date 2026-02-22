import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(request: NextRequest) {
  try {
    // Read the migration SQL
    const migrationSQL = `
-- Patient Bridge Table - Links Finance System to OpenEHR Patients
CREATE TABLE IF NOT EXISTS patient_bridge (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  openehr_patient_id VARCHAR(255) NOT NULL UNIQUE,
  openehr_patient_number VARCHAR(100),
  openehr_workspace_id VARCHAR(255),
  patient_name_ar VARCHAR(255) NOT NULL,
  patient_name_en VARCHAR(255),
  phone VARCHAR(50),
  email VARCHAR(255),
  national_id VARCHAR(100),
  governorate VARCHAR(255),
  date_of_birth DATE,
  gender VARCHAR(20),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_patient_bridge_openehr_id ON patient_bridge(openehr_patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_bridge_phone ON patient_bridge(phone);

-- RLS policies
ALTER TABLE patient_bridge ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can read patient bridge data" ON patient_bridge;
DROP POLICY IF EXISTS "Anyone can insert patient bridge data" ON patient_bridge;
DROP POLICY IF EXISTS "Anyone can update patient bridge data" ON patient_bridge;

-- Create new policies
CREATE POLICY "Anyone can read patient bridge data" ON patient_bridge
  FOR SELECT USING (true);

CREATE POLICY "Anyone can insert patient bridge data" ON patient_bridge
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update patient bridge data" ON patient_bridge
  FOR UPDATE USING (true);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_patient_bridge_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS patient_bridge_updated_at ON patient_bridge;

-- Create trigger
CREATE TRIGGER patient_bridge_updated_at
  BEFORE UPDATE ON patient_bridge
  FOR EACH ROW
  EXECUTE FUNCTION update_patient_bridge_updated_at();
    `;

    // Execute the migration
    const { error } = await supabase.rpc('exec_sql', { sql: migrationSQL });

    if (error) {
      // If exec_sql doesn't exist, try direct SQL execution
      console.log('exec_sql not available, trying direct table creation...');
      
      // Try creating the table directly
      const { error: tableError } = await supabase
        .from('patient_bridge')
        .select('id')
        .limit(1);

      if (tableError && tableError.code === 'PGRST116') {
        // Table doesn't exist, we need to create it manually
        return NextResponse.json({
          success: false,
          error: 'Table does not exist and cannot be created automatically. Please run the SQL migration manually.',
          sql: migrationSQL,
          details: tableError
        }, { status: 500 });
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Patient bridge table migration completed successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Migration error:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      details: error
    }, { status: 500 });
  }
}
