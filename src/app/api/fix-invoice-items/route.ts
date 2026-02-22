import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(request: NextRequest) {
  try {
    // Add missing columns to invoice_items table
    const alterTableSQL = `
      -- Add missing columns if they don't exist
      ALTER TABLE public.invoice_items 
      ADD COLUMN IF NOT EXISTS payment_status VARCHAR(50) DEFAULT 'PENDING',
      ADD COLUMN IF NOT EXISTS discount_percentage DECIMAL(5,2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(10,2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS insurance_covered BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS insurance_coverage_percentage DECIMAL(5,2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS insurance_amount DECIMAL(10,2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS patient_amount DECIMAL(10,2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS provider_id UUID,
      ADD COLUMN IF NOT EXISTS provider_name VARCHAR(255),
      ADD COLUMN IF NOT EXISTS service_fee DECIMAL(10,2) DEFAULT 0;

      -- Refresh schema cache
      NOTIFY pgrst, 'reload schema';
    `;

    // Execute the SQL
    const { error } = await supabase.rpc('exec_sql', { sql: alterTableSQL });

    if (error) {
      console.log('exec_sql not available, trying manual column additions...');
      
      // Try adding columns one by one
      const columns = [
        'payment_status VARCHAR(50) DEFAULT \'PENDING\'',
        'discount_percentage DECIMAL(5,2) DEFAULT 0',
        'discount_amount DECIMAL(10,2) DEFAULT 0',
        'insurance_covered BOOLEAN DEFAULT false',
        'insurance_coverage_percentage DECIMAL(5,2) DEFAULT 0',
        'insurance_amount DECIMAL(10,2) DEFAULT 0',
        'patient_amount DECIMAL(10,2) DEFAULT 0',
        'provider_id UUID',
        'provider_name VARCHAR(255)',
        'service_fee DECIMAL(10,2) DEFAULT 0'
      ];

      for (const column of columns) {
        try {
          await supabase.rpc('exec_sql', { 
            sql: `ALTER TABLE public.invoice_items ADD COLUMN IF NOT EXISTS ${column};` 
          });
        } catch (err) {
          console.log(`Column might already exist or failed to add: ${column}`);
        }
      }
    }

    // Refresh schema cache
    await supabase.rpc('exec_sql', { sql: 'NOTIFY pgrst, \'reload schema\';' });

    return NextResponse.json({
      success: true,
      message: 'Invoice items table updated successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Error updating invoice_items table:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      details: error
    }, { status: 500 });
  }
}
