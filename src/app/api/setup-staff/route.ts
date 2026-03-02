/**
 * Setup Staff Table API
 * POST /api/setup-staff - Create staff table and insert initial data
 */

import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

// Use the same database as departments
const databaseUrl = process.env.OPENEHR_DATABASE_URL;

if (!databaseUrl) {
  console.error('OPENEHR_DATABASE_URL is not configured in environment variables');
}

// Neon database connection
const pool = databaseUrl ? new Pool({
  connectionString: databaseUrl,
  ssl: { rejectUnauthorized: false },
}) : null;

// POST /api/setup-staff - Create staff table and insert initial data
export async function POST(request: NextRequest) {
  try {
    if (!pool) {
      return NextResponse.json(
        { 
          error: 'Database not configured',
          details: 'OPENEHR_DATABASE_URL environment variable is missing'
        },
        { status: 500 }
      );
    }

    console.log('Setting up staff table...');

    // Check if staff table already exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'staff'
      );
    `);

    if (tableCheck.rows[0].exists) {
      return NextResponse.json({
        success: true,
        message: 'Staff table already exists',
        data: { table_exists: true }
      });
    }

    // Create staff table
    await pool.query(`
      CREATE TABLE staff (
        staffid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        occupation VARCHAR(100),
        unit VARCHAR(100),
        specialty VARCHAR(100),
        phone VARCHAR(50),
        email VARCHAR(255) UNIQUE,
        nationalid VARCHAR(50) UNIQUE,
        dateofbirth DATE,
        gender VARCHAR(10),
        maritalstatus VARCHAR(20),
        nationality VARCHAR(100),
        address TEXT,
        emergencycontactname VARCHAR(255),
        emergencycontactrelationship VARCHAR(100),
        emergencycontactphone VARCHAR(50),
        createdat TIMESTAMP DEFAULT NOW(),
        updatedat TIMESTAMP DEFAULT NOW()
      );
    `);

    console.log('Staff table created successfully');

    // Insert sample staff data
    const sampleStaff = [
      {
        name: 'Dr. Ahmed Al-Bayati',
        occupation: 'Doctor',
        unit: 'Emergency',
        specialty: 'Emergency Medicine',
        phone: '+964 770 123 4567',
        email: 'ahmed.albayati@tibbna.iq',
        nationalid: '123456789012',
        dateofbirth: '1985-05-15',
        gender: 'MALE',
        maritalstatus: 'MARRIED',
        nationality: 'Iraq',
        address: 'Baghdad, Iraq',
        emergencycontactname: 'Fatima Al-Bayati',
        emergencycontactrelationship: 'Spouse',
        emergencycontactphone: '+964 770 123 4568'
      },
      {
        name: 'Dr. Sarah Hassan',
        occupation: 'Doctor',
        unit: 'Cardiology',
        specialty: 'Cardiology',
        phone: '+964 770 123 4568',
        email: 'sarah.hassan@tibbna.iq',
        nationalid: '234567890123',
        dateofbirth: '1988-08-22',
        gender: 'FEMALE',
        maritalstatus: 'SINGLE',
        nationality: 'Iraq',
        address: 'Baghdad, Iraq',
        emergencycontactname: 'Mohammed Hassan',
        emergencycontactrelationship: 'Brother',
        emergencycontactphone: '+964 770 123 4569'
      },
      {
        name: 'Nurse Layla Karim',
        occupation: 'Nurse',
        unit: 'Emergency',
        specialty: 'Emergency Nursing',
        phone: '+964 770 123 4569',
        email: 'layla.karim@tibbna.iq',
        nationalid: '345678901234',
        dateofbirth: '1992-03-10',
        gender: 'FEMALE',
        maritalstatus: 'MARRIED',
        nationality: 'Iraq',
        address: 'Baghdad, Iraq',
        emergencycontactname: 'Karim Hassan',
        emergencycontactrelationship: 'Husband',
        emergencycontactphone: '+964 770 123 4570'
      }
    ];

    for (const staff of sampleStaff) {
      await pool.query(`
        INSERT INTO staff (
          name, occupation, unit, specialty, phone, email, nationalid,
          dateofbirth, gender, maritalstatus, nationality, address,
          emergencycontactname, emergencycontactrelationship, emergencycontactphone
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15
        )
      `, [
        staff.name,
        staff.occupation,
        staff.unit,
        staff.specialty,
        staff.phone,
        staff.email,
        staff.nationalid,
        staff.dateofbirth,
        staff.gender,
        staff.maritalstatus,
        staff.nationality,
        staff.address,
        staff.emergencycontactname,
        staff.emergencycontactrelationship,
        staff.emergencycontactphone
      ]);
    }

    console.log(`Inserted ${sampleStaff.length} sample staff records`);

    return NextResponse.json({
      success: true,
      message: 'Staff table created and sample data inserted',
      data: {
        table_created: true,
        sample_records_inserted: sampleStaff.length
      }
    });

  } catch (error) {
    console.error('Error setting up staff table:', error);
    
    // Check if it's a connection error
    if (error instanceof Error) {
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
        error: 'Failed to setup staff table',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// GET /api/setup-staff - Check if staff table exists
export async function GET(request: NextRequest) {
  try {
    if (!pool) {
      return NextResponse.json(
        { 
          error: 'Database not configured',
          details: 'OPENEHR_DATABASE_URL environment variable is missing'
        },
        { status: 500 }
      );
    }

    // Check if staff table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'staff'
      );
    `);

    const exists = tableCheck.rows[0].exists;

    if (exists) {
      // Count staff records
      const countResult = await pool.query('SELECT COUNT(*) as count FROM staff');
      const count = countResult.rows[0].count;

      return NextResponse.json({
        success: true,
        data: {
          table_exists: true,
          staff_count: count
        }
      });
    } else {
      return NextResponse.json({
        success: true,
        data: {
          table_exists: false,
          staff_count: 0
        }
      });
    }

  } catch (error) {
    console.error('Error checking staff table:', error);
    return NextResponse.json(
      { 
        error: 'Failed to check staff table',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
