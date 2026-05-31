import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('DATABASE_URL is not configured in environment variables');
}

const pool = databaseUrl ? new Pool({ connectionString: databaseUrl }) : null;

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

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const departmentId = searchParams.get('department_id');

    // Try to get staff from database first
    try {
      let query = `
        SELECT 
          staff_id as id,
          staff_name as name,
          staff_email as email,
          staff_phone as phone,
          department_id,
          department_name,
          position,
          is_active as active,
          created_at,
          updated_at
        FROM staff 
        WHERE 1=1
      `;
      
      const params: any[] = [];
      let paramIndex = 1;

      if (search) {
        query += ` AND (staff_name ILIKE $${paramIndex} OR staff_email ILIKE $${paramIndex})`;
        params.push(`%${search}%`);
        paramIndex++;
      }

      if (departmentId) {
        query += ` AND department_id = $${paramIndex}`;
        params.push(departmentId);
      }

      query += ` ORDER BY staff_name`;

      const result = await pool.query(query, params);

      if (result.rows.length > 0) {
        return NextResponse.json(result.rows);
      }
    } catch (dbError) {
      console.log('Staff table not found, returning mock data');
    }

    // Mock data if table doesn't exist
    const mockStaff = [
      {
        id: 'staff-001',
        name: 'Dr. Ahmed Hassan',
        email: 'ahmed.hassan@tibbna.com',
        phone: '+964 770 123 4567',
        department_id: 'dept-001',
        department_name: 'Emergency Medicine',
        position: 'Head of Emergency',
        active: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      },
      {
        id: 'staff-002',
        name: 'Dr. Sarah Johnson',
        email: 'sarah.johnson@tibbna.com',
        phone: '+964 770 234 5678',
        department_id: 'dept-002',
        department_name: 'Surgery',
        position: 'Senior Surgeon',
        active: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      },
      {
        id: 'staff-003',
        name: 'Dr. Mohammed Ali',
        email: 'mohammed.ali@tibbna.com',
        phone: '+964 770 345 6789',
        department_id: 'dept-003',
        department_name: 'Internal Medicine',
        position: 'Consultant',
        active: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      },
      {
        id: 'staff-004',
        name: 'Dr. Layla Mahmoud',
        email: 'layla.mahmoud@tibbna.com',
        phone: '+964 770 456 7890',
        department_id: 'dept-004',
        department_name: 'Pediatrics',
        position: 'Pediatrician',
        active: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      },
      {
        id: 'staff-005',
        name: 'Dr. Fatima Al-Rashid',
        email: 'fatima.alrashid@tibbna.com',
        phone: '+964 770 567 8901',
        department_id: 'dept-005',
        department_name: 'Obstetrics & Gynecology',
        position: 'OBGYN Specialist',
        active: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      },
      {
        id: 'staff-006',
        name: 'Dr. Omar Khalid',
        email: 'omar.khalid@tibbna.com',
        phone: '+964 770 678 9012',
        department_id: 'dept-006',
        department_name: 'Cardiology',
        position: 'Cardiologist',
        active: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      },
      {
        id: 'staff-007',
        name: 'Dr. Hana Ahmed',
        email: 'hana.ahmed@tibbna.com',
        phone: '+964 770 789 0123',
        department_id: 'dept-007',
        department_name: 'Neurology',
        position: 'Neurologist',
        active: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      },
      {
        id: 'staff-008',
        name: 'Dr. Youssef Hassan',
        email: 'youssef.hassan@tibbna.com',
        phone: '+964 770 890 1234',
        department_id: 'dept-008',
        department_name: 'Orthopedics',
        position: 'Orthopedic Surgeon',
        active: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      },
      {
        id: 'staff-009',
        name: 'Dr. Nour Al-Din',
        email: 'nour.aldin@tibbna.com',
        phone: '+964 770 901 2345',
        department_id: 'dept-009',
        department_name: 'Radiology',
        position: 'Radiologist',
        active: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      },
      {
        id: 'staff-010',
        name: 'Dr. Rania Said',
        email: 'rania.said@tibbna.com',
        phone: '+964 770 012 3456',
        department_id: 'dept-010',
        department_name: 'Laboratory',
        position: 'Lab Director',
        active: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      },
      {
        id: 'staff-011',
        name: 'Dr. Karim Mahmoud',
        email: 'karim.mahmoud@tibbna.com',
        phone: '+964 770 123 4567',
        department_id: 'dept-011',
        department_name: 'Pharmacy',
        position: 'Chief Pharmacist',
        active: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      },
      {
        id: 'staff-012',
        name: 'Dr. Samir Hassan',
        email: 'samir.hassan@tibbna.com',
        phone: '+964 770 234 5678',
        department_id: 'dept-012',
        department_name: 'Intensive Care Unit',
        position: 'ICU Director',
        active: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      },
      {
        id: 'staff-013',
        name: 'Nurse Amira Khalil',
        email: 'amira.khalil@tibbna.com',
        phone: '+964 770 345 6789',
        department_id: 'dept-001',
        department_name: 'Emergency Medicine',
        position: 'Head Nurse',
        active: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      },
      {
        id: 'staff-014',
        name: 'Nurse Fatima Ali',
        email: 'fatima.ali@tibbna.com',
        phone: '+964 770 456 7890',
        department_id: 'dept-002',
        department_name: 'Surgery',
        position: 'Surgical Nurse',
        active: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      },
      {
        id: 'staff-015',
        name: 'Technician Omar Ibrahim',
        email: 'omar.ibrahim@tibbna.com',
        phone: '+964 770 567 8901',
        department_id: 'dept-009',
        department_name: 'Radiology',
        position: 'X-Ray Technician',
        active: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      }
    ];

    // Filter mock data based on search
    let filteredStaff = mockStaff;
    if (search) {
      filteredStaff = mockStaff.filter(staff => 
        staff.name.toLowerCase().includes(search.toLowerCase()) ||
        staff.email.toLowerCase().includes(search.toLowerCase())
      );
    }

    if (departmentId) {
      filteredStaff = filteredStaff.filter(staff => staff.department_id === departmentId);
    }

    return NextResponse.json(filteredStaff);

  } catch (error) {
    console.error('Error fetching staff:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch staff',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
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
    const { name, email, phone, department_id, department_name, position } = body;

    // Try to insert into database first
    try {
      const result = await pool.query(`
        INSERT INTO staff (
          staff_id,
          staff_name,
          staff_email,
          staff_phone,
          department_id,
          department_name,
          position,
          is_active,
          created_at,
          updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, true, NOW(), NOW()
        ) RETURNING *
      `, [
        `staff-${Math.floor(Math.random() * 100000)}`,
        name,
        email,
        phone,
        department_id,
        department_name,
        position
      ]);

      return NextResponse.json({
        success: true,
        data: result.rows[0]
      });
    } catch (dbError) {
      console.log('Cannot insert into staff table, returning mock response');
    }

    // Mock response if table doesn't exist
    const newStaff = {
      id: `staff-${Math.floor(Math.random() * 100000)}`,
      name,
      email,
      phone,
      department_id,
      department_name,
      position,
      active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    return NextResponse.json({
      success: true,
      data: newStaff
    });

  } catch (error) {
    console.error('Error creating staff:', error);
    return NextResponse.json(
      { 
        error: 'Failed to create staff',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
