/**
 * Staff Schema API
 * GET /api/staff/schema - Get staff table structure
 */

import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

// Neon database connection
const pool = new Pool({
  connectionString: process.env.OPENEHR_DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// GET /api/staff/schema - Get staff table structure
export async function GET(request: NextRequest) {
  try {
    if (!process.env.OPENEHR_DATABASE_URL) {
      return NextResponse.json(
        { 
          error: 'Database not configured',
          details: 'OPENEHR_DATABASE_URL environment variable is missing'
        },
        { status: 500 }
      );
    }

    console.log('Fetching staff table schema...');
    
    // Get table structure
    const schemaResult = await pool.query(`
      SELECT 
        column_name,
        data_type,
        is_nullable,
        column_default,
        character_maximum_length,
        numeric_precision,
        numeric_scale
      FROM information_schema.columns 
      WHERE table_name = 'staff' 
      AND table_schema = 'public'
      ORDER BY ordinal_position
    `);

    // Get sample data
    const sampleResult = await pool.query(`
      SELECT * FROM staff 
      LIMIT 3
    `);

    // Get table info
    const tableInfoResult = await pool.query(`
      SELECT 
        table_name,
        table_type
      FROM information_schema.tables 
      WHERE table_name = 'staff' 
      AND table_schema = 'public'
    `);

    return NextResponse.json({
      success: true,
      data: {
        table_info: tableInfoResult.rows,
        schema: schemaResult.rows,
        sample_data: sampleResult.rows,
        total_columns: schemaResult.rows.length,
        total_records: (await pool.query('SELECT COUNT(*) as count FROM staff')).rows[0].count
      }
    });

  } catch (error) {
    console.error('Staff schema fetch error:', error);
    
    // Check if table doesn't exist
    if (error instanceof Error) {
      if (error.message.includes('does not exist') || 
          error.message.includes('relation "staff" does not exist')) {
        return NextResponse.json(
          { 
            error: 'Staff table not found',
            details: 'The staff table does not exist in the database',
            suggestion: 'Please create the staff table first'
          },
          { status: 404 }
        );
      }
      
      if (error.message.includes('ECONNREFUSED') || 
          error.message.includes('connection') ||
          error.message.includes('authentication')) {
        return NextResponse.json(
          { 
            error: 'Database connection failed',
            details: error.message
          },
          { status: 500 }
        );
      }
    }

    return NextResponse.json(
      { 
        error: 'Failed to fetch staff schema',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
