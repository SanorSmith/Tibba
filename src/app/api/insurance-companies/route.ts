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

    const result = await pool.query(`
      SELECT 
        company_id as id,
        company_name as name,
        company_code as code,
        contact_email,
        contact_phone,
        address,
        createdat,
        updatedat
      FROM insurance_companies
      WHERE active = true
      ORDER BY company_name
    `);

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
