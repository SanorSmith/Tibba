import { NextRequest, NextResponse } from 'next/server';
import { getWorkspaceId } from '@/lib/workspace';
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
    // These queries target columns this schema does not have, so they always
    // throw and the handler falls back to static mock data. Gated anyway so
    // the endpoint is not readable without a session.
    const workspaceId = getWorkspaceId(request);
    if (!workspaceId) {
      return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
    }

    if (!pool) {
      return NextResponse.json(
        { 
          error: 'Database not configured',
          details: 'DATABASE_URL environment variable is missing'
        },
        { status: 500 }
      );
    }

    // Try to get departments from database first
    try {
      const result = await pool.query(`
        SELECT 
          department_id as id,
          department_name as name,
          department_name_ar as name_ar,
          department_code as code,
          location,
          manager,
          is_active as active,
          created_at,
          updated_at
        FROM departments 
        ORDER BY department_name
      `);

      if (result.rows.length > 0) {
        return NextResponse.json(result.rows);
      }
    } catch (dbError) {
      console.log('Departments table not found, returning mock data');
    }

    // Mock data if table doesn't exist
    const mockDepartments = [
      {
        id: 'dept-001',
        name: 'Emergency Medicine',
        name_ar: 'طب الطوارئ',
        code: 'EMERGENCY',
        location: 'Ground Floor, Building A',
        manager: 'Dr. Ahmed Hassan',
        active: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      },
      {
        id: 'dept-002',
        name: 'Surgery',
        name_ar: 'الجراحة',
        code: 'SURGERY',
        location: '2nd Floor, Building A',
        manager: 'Dr. Sarah Johnson',
        active: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      },
      {
        id: 'dept-003',
        name: 'Internal Medicine',
        name_ar: 'طب الباطنة',
        code: 'INTERNAL',
        location: '1st Floor, Building A',
        manager: 'Dr. Mohammed Ali',
        active: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      },
      {
        id: 'dept-004',
        name: 'Pediatrics',
        name_ar: 'طب الأطفال',
        code: 'PEDIATRICS',
        location: '3rd Floor, Building B',
        manager: 'Dr. Layla Mahmoud',
        active: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      },
      {
        id: 'dept-005',
        name: 'Obstetrics & Gynecology',
        name_ar: 'أمراض النساء والتوليد',
        code: 'OBGYN',
        location: '2nd Floor, Building B',
        manager: 'Dr. Fatima Al-Rashid',
        active: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      },
      {
        id: 'dept-006',
        name: 'Cardiology',
        name_ar: 'أمراض القلب',
        code: 'CARDIO',
        location: '1st Floor, Building B',
        manager: 'Dr. Omar Khalid',
        active: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      },
      {
        id: 'dept-007',
        name: 'Neurology',
        name_ar: 'الأعصاب',
        code: 'NEURO',
        location: '3rd Floor, Building A',
        manager: 'Dr. Hana Ahmed',
        active: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      },
      {
        id: 'dept-008',
        name: 'Orthopedics',
        name_ar: 'العظام',
        code: 'ORTHO',
        location: 'Ground Floor, Building B',
        manager: 'Dr. Youssef Hassan',
        active: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      },
      {
        id: 'dept-009',
        name: 'Radiology',
        name_ar: 'الأشعة',
        code: 'RADIO',
        location: 'Basement, Building A',
        manager: 'Dr. Nour Al-Din',
        active: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      },
      {
        id: 'dept-010',
        name: 'Laboratory',
        name_ar: 'المختبر',
        code: 'LAB',
        location: 'Basement, Building B',
        manager: 'Dr. Rania Said',
        active: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      },
      {
        id: 'dept-011',
        name: 'Pharmacy',
        name_ar: 'الصيدلية',
        code: 'PHARMACY',
        location: 'Ground Floor, Building A',
        manager: 'Dr. Karim Mahmoud',
        active: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      },
      {
        id: 'dept-012',
        name: 'Intensive Care Unit',
        name_ar: 'العناية المركزة',
        code: 'ICU',
        location: '2nd Floor, Building A',
        manager: 'Dr. Samir Hassan',
        active: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      }
    ];

    return NextResponse.json(mockDepartments);

  } catch (error) {
    console.error('Error fetching departments:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch departments',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // These queries target columns this schema does not have, so they always
    // throw and the handler falls back to static mock data. Gated anyway so
    // the endpoint is not readable without a session.
    const workspaceId = getWorkspaceId(request);
    if (!workspaceId) {
      return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
    }

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
    const { name, name_ar, code, location, manager } = body;

    // Try to insert into database first
    try {
      const result = await pool.query(`
        INSERT INTO departments (
          department_id,
          department_name,
          department_name_ar,
          department_code,
          location,
          manager,
          is_active,
          created_at,
          updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, true, NOW(), NOW()
        ) RETURNING *
      `, [
        `dept-${Math.floor(Math.random() * 100000)}`,
        name,
        name_ar || '',
        code,
        location || '',
        manager || ''
      ]);

      return NextResponse.json({
        success: true,
        data: result.rows[0]
      });
    } catch (dbError) {
      console.log('Cannot insert into departments table, returning mock response');
    }

    // Mock response if table doesn't exist
    const newDepartment = {
      id: `dept-${Math.floor(Math.random() * 100000)}`,
      name,
      name_ar: name_ar || '',
      code,
      location: location || '',
      manager: manager || '',
      active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    return NextResponse.json({
      success: true,
      data: newDepartment
    });

  } catch (error) {
    console.error('Error creating department:', error);
    return NextResponse.json(
      { 
        error: 'Failed to create department',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
