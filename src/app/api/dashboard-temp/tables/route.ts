import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = 'https://ldabymaexuvyeygjqbby.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxkYWJ5bWFleHV2eWV5Z2pxYmJ5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDkyMjE0NiwiZXhwIjoyMDg2NDk4MTQ2fQ.Y3IhqA8-DEnSmUoV_-jrF_jQvuG6V5it6poCgh6jXfo';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function GET() {
  try {
    // Common table names to check
    const commonTables = [
      'users', 'employees', 'patients', 'appointments', 'departments',
      'staff', 'attendance_records', 'leave_requests', 'payroll_transactions',
      'workspaces', 'workspaceusers', 'todos', 'alerts', 'workflows',
      'organizations', 'shifts', 'notification_queue', 'audit_logs',
      'patients', 'accession_samples', 'drug_batches', 'drugs',
      'equipment', 'insurance_companies', 'lab_test_catalog',
      'laboratory_types', 'labs', 'lims_order_tests', 'lims_orders',
      'materials', 'notifications', 'operations', 'patient_insurance',
      'pharmacies', 'pharmacy_invoice_lines', 'pharmacy_invoices',
      'pharmacy_order_items', 'pharmacy_orders', 'pharmacy_stock_levels',
      'pharmacy_stock_locations', 'pharmacy_stock_movements',
      'pharmacy_substitutions', 'qc_runs', 'result_validation_history',
      'sample_accession_audit_log', 'sample_status_history',
      'sample_storage', 'samples', 'shop_order_items', 'shop_orders',
      'storage_locations', 'study_protocols', 'suppliers',
      'test_reference_audit_log', 'test_reference_ranges', 'test_results',
      'validation_states', 'worklist_items', 'worklists'
    ];

    const tableResults = [];

    for (const tableName of commonTables) {
      try {
        // Try to get row count
        const { count, error: countError } = await supabase
          .from(tableName)
          .select('*', { count: 'exact', head: true });

        if (!countError) {
          // Try to get sample data
          const { data: sampleData, error: sampleError } = await supabase
            .from(tableName)
            .select('*')
            .limit(3);

          // Try to get column information
          const { data: columnsData, error: columnsError } = await supabase
            .from('information_schema.columns')
            .select('column_name, data_type, is_nullable, column_default')
            .eq('table_schema', 'public')
            .eq('table_name', tableName);

          tableResults.push({
            name: tableName,
            rowCount: count || 0,
            columns: columnsData?.map(col => ({
              name: col.column_name,
              type: col.data_type,
              nullable: col.is_nullable === 'YES',
              default: col.column_default
            })) || [],
            sampleData: sampleData || [],
            accessible: true
          });
        }
      } catch (err) {
        // Table doesn't exist or no access
        tableResults.push({
          name: tableName,
          rowCount: 0,
          columns: [],
          sampleData: [],
          accessible: false
        });
      }
    }

    // Filter to only accessible tables
    const accessibleTables = tableResults.filter(table => table.accessible);

    return NextResponse.json({
      success: true,
      tables: accessibleTables,
      totalTables: accessibleTables.length,
      databaseUrl: supabaseUrl
    });

  } catch (error) {
    console.error('Dashboard API Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}
