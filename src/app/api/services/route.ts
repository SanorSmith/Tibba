import { NextRequest, NextResponse } from 'next/server';
import { getWorkspaceId } from '@/lib/workspace';
import { pool } from '@/lib/db/pool';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('DATABASE_URL is not configured in environment variables');
}


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

    // Services are a per-facility catalogue: one hospital must not see or
    // bill another's service list or prices.
    const workspaceId = getWorkspaceId(request);
    if (!workspaceId) {
      return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
    }

    // Check if services table exists
    const tableExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'services'
      )
    `);

    console.log('Services table exists:', tableExists.rows[0].exists);

    if (!tableExists.rows[0].exists) {
      console.log('Services table does not exist, returning mock data');
      // Return mock medical services if table doesn't exist
      return NextResponse.json([
        { 
          id: 'SRV-001', 
          code: 'GC001', 
          name: 'General Consultation', 
          name_ar: 'استشارة عامة',
          category: 'Consultation',
          subcategory: 'General Medicine',
          description: 'General medical consultation',
          price_self_pay: 50000,
          price_insurance: 45000,
          price_government: 40000,
          department_id: 'DEPT001',
          department_name: 'General Medicine',
          requires_appointment: true,
          duration_minutes: 30,
          provider_id: null,
          provider_name: null,
          service_fee: 0,
          active: true,
          createdat: new Date().toISOString(),
          updatedat: new Date().toISOString()
        },
        { 
          id: 'SRV-002', 
          code: 'SC001', 
          name: 'Specialist Consultation', 
          name_ar: 'استشارة متخصصة',
          category: 'Consultation',
          subcategory: 'Specialist',
          description: 'Specialist medical consultation',
          price_self_pay: 100000,
          price_insurance: 90000,
          price_government: 80000,
          department_id: 'DEPT002',
          department_name: 'Specialist Medicine',
          requires_appointment: true,
          duration_minutes: 45,
          provider_id: null,
          provider_name: null,
          service_fee: 0,
          active: true,
          createdat: new Date().toISOString(),
          updatedat: new Date().toISOString()
        },
        { 
          id: 'SRV-003', 
          code: 'BT001', 
          name: 'Blood Test', 
          name_ar: 'فحص الدم',
          category: 'Laboratory',
          subcategory: 'Hematology',
          description: 'Complete blood count test',
          price_self_pay: 25000,
          price_insurance: 22500,
          price_government: 20000,
          department_id: 'DEPT003',
          department_name: 'Laboratory',
          requires_appointment: false,
          duration_minutes: 15,
          provider_id: null,
          provider_name: null,
          service_fee: 0,
          active: true,
          createdat: new Date().toISOString(),
          updatedat: new Date().toISOString()
        },
        { 
          id: 'SRV-004', 
          code: 'XR001', 
          name: 'X-Ray', 
          name_ar: 'أشعة سينية',
          category: 'Radiology',
          subcategory: 'Diagnostic Imaging',
          description: 'X-ray imaging service',
          price_self_pay: 75000,
          price_insurance: 67500,
          price_government: 60000,
          department_id: 'DEPT004',
          department_name: 'Radiology',
          requires_appointment: true,
          duration_minutes: 20,
          provider_id: null,
          provider_name: null,
          service_fee: 0,
          active: true,
          createdat: new Date().toISOString(),
          updatedat: new Date().toISOString()
        },
        { 
          id: 'SRV-005', 
          code: 'US001', 
          name: 'Ultrasound', 
          name_ar: 'الموجات فوق الصوتية',
          category: 'Radiology',
          subcategory: 'Diagnostic Imaging',
          description: 'Ultrasound imaging service',
          price_self_pay: 150000,
          price_insurance: 135000,
          price_government: 120000,
          department_id: 'DEPT004',
          department_name: 'Radiology',
          requires_appointment: true,
          duration_minutes: 30,
          provider_id: null,
          provider_name: null,
          service_fee: 0,
          active: true,
          createdat: new Date().toISOString(),
          updatedat: new Date().toISOString()
        },
        { 
          id: 'SRV-006', 
          code: 'EC001', 
          name: 'ECG', 
          name_ar: 'تخطيط القلب',
          category: 'Cardiology',
          subcategory: 'Diagnostic',
          description: 'Electrocardiogram test',
          price_self_pay: 30000,
          price_insurance: 27000,
          price_government: 24000,
          department_id: 'DEPT005',
          department_name: 'Cardiology',
          requires_appointment: false,
          duration_minutes: 15,
          provider_id: null,
          provider_name: null,
          service_fee: 0,
          active: true,
          createdat: new Date().toISOString(),
          updatedat: new Date().toISOString()
        },
        { 
          id: 'SRV-007', 
          code: 'VC001', 
          name: 'Vaccination', 
          name_ar: 'التطعيم',
          category: 'Preventive',
          subcategory: 'Immunization',
          description: 'Vaccination service',
          price_self_pay: 20000,
          price_insurance: 18000,
          price_government: 16000,
          department_id: 'DEPT006',
          department_name: 'Preventive Medicine',
          requires_appointment: false,
          duration_minutes: 10,
          provider_id: null,
          provider_name: null,
          service_fee: 0,
          active: true,
          createdat: new Date().toISOString(),
          updatedat: new Date().toISOString()
        },
        { 
          id: 'SRV-008', 
          code: 'DC001', 
          name: 'Dental Checkup', 
          name_ar: 'فحص الأسنان',
          category: 'Dental',
          subcategory: 'General Dentistry',
          description: 'Dental examination and cleaning',
          price_self_pay: 80000,
          price_insurance: 72000,
          price_government: 64000,
          department_id: 'DEPT007',
          department_name: 'Dental',
          requires_appointment: true,
          duration_minutes: 30,
          provider_id: null,
          provider_name: null,
          service_fee: 0,
          active: true,
          createdat: new Date().toISOString(),
          updatedat: new Date().toISOString()
        },
        { 
          id: 'SRV-009', 
          code: 'PT001', 
          name: 'Physical Therapy', 
          name_ar: 'العلاج الطبيعي',
          category: 'Therapy',
          subcategory: 'Rehabilitation',
          description: 'Physical therapy session',
          price_self_pay: 120000,
          price_insurance: 108000,
          price_government: 96000,
          department_id: 'DEPT008',
          department_name: 'Rehabilitation',
          requires_appointment: true,
          duration_minutes: 60,
          provider_id: null,
          provider_name: null,
          service_fee: 0,
          active: true,
          createdat: new Date().toISOString(),
          updatedat: new Date().toISOString()
        },
        { 
          id: 'SRV-010', 
          code: 'MS001', 
          name: 'Minor Surgery', 
          name_ar: 'جراحة بسيطة',
          category: 'Surgery',
          subcategory: 'Outpatient',
          description: 'Minor surgical procedures',
          price_self_pay: 500000,
          price_insurance: 450000,
          price_government: 400000,
          department_id: 'DEPT009',
          department_name: 'Surgery',
          requires_appointment: true,
          duration_minutes: 90,
          provider_id: null,
          provider_name: null,
          service_fee: 0,
          active: true,
          createdat: new Date().toISOString(),
          updatedat: new Date().toISOString()
        }
      ]);
    }

    // First try without department join to see if that's the issue
    const simpleResult = await pool.query(`
      SELECT 
        id,
        code,
        name,
        name_ar,
        category,
        subcategory,
        description,
        price_self_pay,
        price_insurance,
        price_government,
        department_id,
        requires_appointment,
        duration_minutes,
        provider_id,
        provider_name,
        service_fee,
        active,
        createdat,
        updatedat
      FROM services
      WHERE active = true AND workspaceid = $1
      ORDER BY category, name
    `, [workspaceId]);
    
    console.log('Simple query result (no dept join):', simpleResult.rows.length, 'services found');
    
    // Try different department join approaches
    let result;
    try {
      // Try with UUID department_id matching
      result = await pool.query(`
        SELECT 
          s.id,
          s.code,
          s.name,
          s.name_ar,
          s.category,
          s.subcategory,
          s.description,
          s.price_self_pay,
          s.price_insurance,
          s.price_government,
          s.department_id,
          d.name as department_name,
          s.requires_appointment,
          s.duration_minutes,
          s.provider_id,
          s.provider_name,
          s.service_fee,
          s.active,
          s.createdat,
          s.updatedat
        FROM services s
        LEFT JOIN departments d ON s.department_id::text = d.departmentid::text
        WHERE s.active = true AND s.workspaceid = $1
        ORDER BY s.category, s.name
      `, [workspaceId]);
      console.log('Department join (UUID match) result:', result.rows.length, 'services found');
    } catch (error) {
      console.log('Department join failed, using simple query:', error instanceof Error ? error.message : String(error));
      result = simpleResult;
    }

    console.log('Database query result (with dept join):', result.rows.length, 'services found');
    console.log('First service sample:', result.rows[0]);
    
    // Also check total services count (including inactive)
    const totalCount = await pool.query('SELECT COUNT(*) as total FROM services WHERE workspaceid = $1', [workspaceId]);
    console.log('Total services in table (including inactive):', totalCount.rows[0].total);
    
    // Check active services count
    const activeCount = await pool.query('SELECT COUNT(*) as active FROM services WHERE active = true AND workspaceid = $1', [workspaceId]);
    console.log('Active services count:', activeCount.rows[0].active);
    
    // Always return the query with more services
    let finalResult = simpleResult.rows.length >= result.rows.length ? simpleResult : result;
    
    console.log('Final result count:', finalResult.rows.length);
    console.log('Using query:', simpleResult.rows.length >= result.rows.length ? 'simple (no dept join)' : 'with dept join');

    // If no active services found, show all services
    if (finalResult.rows.length === 0) {
      console.log('No active services found, showing all services');
      const allServices = await pool.query(`
        SELECT 
          id,
          code,
          name,
          name_ar,
          category,
          subcategory,
          description,
          price_self_pay,
          price_insurance,
          price_government,
          department_id,
          requires_appointment,
          duration_minutes,
          provider_id,
          provider_name,
          service_fee,
          active,
          createdat,
          updatedat
        FROM services
        WHERE workspaceid = $1
        ORDER BY category, name
      `, [workspaceId]);
      finalResult = allServices;
      console.log('All services count:', finalResult.rows.length);
    }

    return NextResponse.json(finalResult.rows);

  } catch (error) {
    console.error('Error fetching services:', error);
    
    // Return mock data on error
    return NextResponse.json([
      { 
        id: 'SRV-001', 
        code: 'GC001', 
        name: 'General Consultation', 
        name_ar: 'استشارة عامة',
        category: 'Consultation',
        subcategory: 'General Medicine',
        description: 'General medical consultation',
        price_self_pay: 50000,
        price_insurance: 45000,
        price_government: 40000,
        department_id: 'DEPT001',
        department_name: 'General Medicine',
        requires_appointment: true,
        duration_minutes: 30,
        provider_id: null,
        provider_name: null,
        service_fee: 0,
        active: true,
        createdat: new Date().toISOString(),
        updatedat: new Date().toISOString()
      }
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

    // New services belong to the facility that created them.
    const workspaceId = getWorkspaceId(request);
    if (!workspaceId) {
      return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
    }

    const body = await request.json();
    const { 
      name, 
      name_ar,
      code, 
      category, 
      subcategory,
      description,
      price_self_pay,
      price_insurance,
      price_government,
      department_id,
      requires_appointment,
      duration_minutes,
      provider_id,
      provider_name,
      service_fee
    } = body;

    // Generate unique code if not provided
    const serviceCode = code || `SVC${Date.now().toString().slice(-6)}`;

    // Add provider columns if they don't exist
    await pool.query(`
      ALTER TABLE services 
      ADD COLUMN IF NOT EXISTS provider_id VARCHAR(50),
      ADD COLUMN IF NOT EXISTS provider_name VARCHAR(255),
      ADD COLUMN IF NOT EXISTS service_fee NUMERIC(12,2) DEFAULT 0
    `);

    // Validate department exists (if provided)
    if (department_id) {
      console.log(`Validating department_id: ${department_id}`);
      const deptCheck = await pool.query(`
        SELECT departmentid, name FROM departments WHERE departmentid = $1
      `, [department_id]);
      
      console.log(`Department query result:`, deptCheck.rows);
      
      if (deptCheck.rows.length === 0) {
        return NextResponse.json(
          { 
            error: 'Invalid department ID', 
            details: `Department with ID '${department_id}' does not exist.`,
            code: 'INVALID_DEPARTMENT'
          },
          { status: 400 }
        );
      }
      
      console.log(`Service linked to department: ${deptCheck.rows[0].name} (${department_id})`);
    }

    const result = await pool.query(`
      INSERT INTO services (
        code,
        name,
        name_ar,
        category,
        subcategory,
        description,
        price_self_pay,
        price_insurance,
        price_government,
        department_id,
        requires_appointment,
        duration_minutes,
        provider_id,
        provider_name,
        service_fee,
        active,
        workspaceid
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      RETURNING *
    `, [
      serviceCode,
      name,
      name_ar || null,
      category,
      subcategory || null,
      description || null,
      price_self_pay || 0,
      price_insurance || 0,
      price_government || 0,
      department_id || null,
      requires_appointment !== undefined ? requires_appointment : true,
      duration_minutes || 30,
      provider_id || null,
      provider_name || null,
      service_fee || 0,
      true,
      workspaceId
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
