import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('DATABASE_URL is not configured in environment variables');
}

const pool = databaseUrl ? new Pool({
  connectionString: databaseUrl,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
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

    // Check if insurance_companies table exists
    const tableExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'insurance_companies'
      )
    `);

    if (!tableExists.rows[0].exists) {
      // Return mock data if table doesn't exist
      return NextResponse.json([
        { id: 'INS-001', name: 'National Insurance Company', code: 'NAT001' },
        { id: 'INS-002', name: 'HealthCare Plus', code: 'HCP002' },
        { id: 'INS-003', name: 'MediShield Insurance', code: 'MSI003' },
        { id: 'INS-004', name: 'Global Health Coverage', code: 'GHC004' },
        { id: 'INS-005', name: 'Premium Medical Insurance', code: 'PMI005' }
      ]);
    }

    // First check what columns exist in the table
    const columnsResult = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'insurance_companies'
      ORDER BY ordinal_position
    `);

    const columns = columnsResult.rows.map(row => row.column_name);
    console.log('Available columns in insurance_companies:', columns);

    // Build dynamic query based on available columns
    let selectColumns = [];
    if (columns.includes('id')) selectColumns.push('id');
    if (columns.includes('company_name')) selectColumns.push('company_name as name');
    if (columns.includes('company_code')) selectColumns.push('company_code as code');
    if (columns.includes('contact_person')) selectColumns.push('contact_person');
    if (columns.includes('phone')) selectColumns.push('phone');
    if (columns.includes('email')) selectColumns.push('email');

    if (selectColumns.length === 0) {
      // If no columns exist, return mock data
      return NextResponse.json([
        { id: 'INS-001', name: 'National Insurance Company', code: 'NAT001' },
        { id: 'INS-002', name: 'HealthCare Plus', code: 'HCP002' },
        { id: 'INS-003', name: 'MediShield Insurance', code: 'MSI003' },
        { id: 'INS-004', name: 'Global Health Coverage', code: 'GHC004' },
        { id: 'INS-005', name: 'Premium Medical Insurance', code: 'PMI005' }
      ]);
    }

    const query = `
      SELECT ${selectColumns.join(', ')}
      FROM insurance_companies
      ORDER BY company_name
    `;

    const result = await pool.query(query);

    return NextResponse.json(result.rows);

  } catch (error) {
    console.error('Error fetching insurance companies:', error);
    
    // Return mock data on error
    return NextResponse.json([
      { id: 'INS-001', name: 'National Insurance Company', code: 'NAT001' },
      { id: 'INS-002', name: 'HealthCare Plus', code: 'HCP002' },
      { id: 'INS-003', name: 'MediShield Insurance', code: 'MSI003' },
      { id: 'INS-004', name: 'Global Health Coverage', code: 'GHC004' },
      { id: 'INS-005', name: 'Premium Medical Insurance', code: 'PMI005' }
    ]);
  }
}

export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { name, code, contact_email, contact_phone, address } = body;

    // Check if table exists, create if not
    await pool.query(`
      CREATE TABLE IF NOT EXISTS insurance_companies (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        code VARCHAR(50) UNIQUE,
        contact_email VARCHAR(255),
        contact_phone VARCHAR(50),
        address TEXT,
        createdat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedat TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    const result = await pool.query(`
      INSERT INTO insurance_companies (id, name, code, contact_email, contact_phone, address)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [
      `INS-${Math.floor(Math.random() * 100000)}`,
      name,
      code,
      contact_email,
      contact_phone,
      address
    ]);

    return NextResponse.json({
      success: true,
      message: 'Insurance company created successfully',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Error creating insurance company:', error);
    return NextResponse.json(
      { 
        error: 'Failed to create insurance company',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
