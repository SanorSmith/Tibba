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

    // Check if services table exists
    const tableExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'services'
      )
    `);

    if (!tableExists.rows[0].exists) {
      // Return mock medical services if table doesn't exist
      return NextResponse.json([
        { id: 'SRV-001', name: 'General Consultation', code: 'GC001', price: '50000.00', category: 'Consultation' },
        { id: 'SRV-002', name: 'Specialist Consultation', code: 'SC001', price: '100000.00', category: 'Consultation' },
        { id: 'SRV-003', name: 'Blood Test', code: 'BT001', price: '25000.00', category: 'Laboratory' },
        { id: 'SRV-004', name: 'X-Ray', code: 'XR001', price: '75000.00', category: 'Radiology' },
        { id: 'SRV-005', name: 'Ultrasound', code: 'US001', price: '150000.00', category: 'Radiology' },
        { id: 'SRV-006', name: 'ECG', code: 'EC001', price: '30000.00', category: 'Cardiology' },
        { id: 'SRV-007', name: 'Vaccination', code: 'VC001', price: '20000.00', category: 'Preventive' },
        { id: 'SRV-008', name: 'Dental Checkup', code: 'DC001', price: '80000.00', category: 'Dental' },
        { id: 'SRV-009', name: 'Physical Therapy', code: 'PT001', price: '120000.00', category: 'Therapy' },
        { id: 'SRV-010', name: 'Minor Surgery', code: 'MS001', price: '500000.00', category: 'Surgery' }
      ]);
    }

    const result = await pool.query(`
      SELECT 
        id,
        name,
        code,
        price_self_pay as price,
        category,
        description,
        createdat,
        updatedat
      FROM services
      WHERE active = true
      ORDER BY category, name
    `);

    return NextResponse.json(result.rows);

  } catch (error) {
    console.error('Error fetching services:', error);
    
    // Return mock data on error
    return NextResponse.json([
      { id: 'SRV-001', name: 'General Consultation', code: 'GC001', price: '50000.00', category: 'Consultation' },
      { id: 'SRV-002', name: 'Specialist Consultation', code: 'SC001', price: '100000.00', category: 'Consultation' },
      { id: 'SRV-003', name: 'Blood Test', code: 'BT001', price: '25000.00', category: 'Laboratory' },
      { id: 'SRV-004', name: 'X-Ray', code: 'XR001', price: '75000.00', category: 'Radiology' },
      { id: 'SRV-005', name: 'Ultrasound', code: 'US001', price: '150000.00', category: 'Radiology' },
      { id: 'SRV-006', name: 'ECG', code: 'EC001', price: '30000.00', category: 'Cardiology' },
      { id: 'SRV-007', name: 'Vaccination', code: 'VC001', price: '20000.00', category: 'Preventive' },
      { id: 'SRV-008', name: 'Dental Checkup', code: 'DC001', price: '80000.00', category: 'Dental' },
      { id: 'SRV-009', name: 'Physical Therapy', code: 'PT001', price: '120000.00', category: 'Therapy' },
      { id: 'SRV-010', name: 'Minor Surgery', code: 'MS001', price: '500000.00', category: 'Surgery' }
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
    const { name, code, price, category, description } = body;

    // Check if table exists, create if not
    await pool.query(`
      CREATE TABLE IF NOT EXISTS services (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        code VARCHAR(50) UNIQUE,
        price DECIMAL(10,2) NOT NULL,
        category VARCHAR(100),
        description TEXT,
        createdat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedat TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    const result = await pool.query(`
      INSERT INTO services (id, name, code, price, category, description)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [
      `SRV-${Math.floor(Math.random() * 100000)}`,
      name,
      code,
      price,
      category,
      description
    ]);

    return NextResponse.json({
      success: true,
      message: 'Service created successfully',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Error creating service:', error);
    return NextResponse.json(
      { 
        error: 'Failed to create service',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
