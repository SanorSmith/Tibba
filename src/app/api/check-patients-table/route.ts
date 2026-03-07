import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// Use the non-medical database (Neon DB)
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('DATABASE_URL is not configured in environment variables');
}

// Neon database connection for non-medical patient data
const pool = databaseUrl ? new Pool({
  connectionString: databaseUrl,
  ssl: { rejectUnauthorized: false },
}) : null;

export async function GET(request: NextRequest) {
  try {
    if (!pool) {
      return NextResponse.json(
        { 
          error: 'Database not configured',
          details: 'DATABASE_URL environment variable is missing'
        },
        { status: 500 }
      );
    }

    console.log('Checking patients table structure...');

    // Check if table exists
    const tableExistsQuery = `
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'patients'
      );
    `;

    const tableExistsResult = await pool.query(tableExistsQuery);
    const tableExists = tableExistsResult.rows[0].exists;

    if (!tableExists) {
      return NextResponse.json({
        success: false,
        error: 'Patients table does not exist',
        suggestion: 'Please run the reception desk schema migration first',
        metadata: {
          database: 'Neon Non-Medical DB',
          connection: 'DATABASE_URL'
        }
      });
    }

    // Get table structure
    const structureQuery = `
      SELECT 
        column_name,
        data_type,
        is_nullable,
        column_default,
        character_maximum_length
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'patients'
      ORDER BY ordinal_position;
    `;

    const structureResult = await pool.query(structureQuery);
    const columns = structureResult.rows;

    // Get sample data to understand the structure
    let sampleData = [];
    try {
      const sampleQuery = 'SELECT * FROM patients LIMIT 3';
      const sampleResult = await pool.query(sampleQuery);
      sampleData = sampleResult.rows;
    } catch (error) {
      console.log('Could not fetch sample data:', error);
    }

    return NextResponse.json({
      success: true,
      tableExists: true,
      columns: columns.map(col => ({
        name: col.column_name,
        type: col.data_type,
        nullable: col.is_nullable === 'YES',
        default: col.column_default,
        maxLength: col.character_maximum_length
      })),
      sampleData: sampleData,
      metadata: {
        database: 'Neon Non-Medical DB',
        connection: 'DATABASE_URL',
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error checking patients table:', error);
    return NextResponse.json(
      { 
        error: 'Failed to check patients table',
        details: error instanceof Error ? error.message : 'Unknown error',
        metadata: {
          database: 'Neon Non-Medical DB',
          connection: 'DATABASE_URL'
        }
      },
      { status: 500 }
    );
  }
}
