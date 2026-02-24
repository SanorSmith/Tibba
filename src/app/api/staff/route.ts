import { NextRequest, NextResponse } from 'next/server';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

const databaseUrl = process.env.TIBBNA_DATABASE_URL || process.env.DATABASE_URL || "postgresql://neondb_owner:npg_RBybikcu3tz5@ep-long-river-allaqs25.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

// EHRbase connection details
const EHRBASE_URL = process.env.EHRBASE_URL || 'https://base.tibbna.com';
const EHRBASE_USER = process.env.EHRBASE_USER || 'auto-speed-ranting';
const EHRBASE_PASSWORD = process.env.EHRBASE_PASSWORD || 'KivLWsQgN4f8aiHAvwuq';
const EHRBASE_API_KEY = process.env.EHRBASE_API_KEY || 'BgMxGMZk5isfCWezE5CF';

// Singleton connection for serverless
let postgres: any;
let sql: any;

async function getDbConnection() {
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is not defined');
  }
  if (!postgres) {
    postgres = (await import('postgres')).default;
    sql = postgres(databaseUrl, {
      ssl: 'require',
      max: 10,
      idle_timeout: 20,
      connect_timeout: 10,
    });
  }
  return sql;
}

async function fetchEHRbaseStaff() {
  try {
    console.log('Fetching staff from EHRbase...');
    
    // Fetch staff from EHRbase REST API
    const response = await fetch(`${EHRBASE_URL}/rest/v1/staff`, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${EHRBASE_USER}:${EHRBASE_PASSWORD}`).toString('base64')}`,
        'X-API-Key': EHRBASE_API_KEY,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error('EHRbase API error:', response.status, response.statusText);
      return [];
    }

    const ehrbaseStaff = await response.json();
    console.log(`Found ${ehrbaseStaff.length} staff members from EHRbase`);
    
    return ehrbaseStaff.map((staff: any) => ({
      staffid: staff.staff_id || staff.id,
      name: staff.name || `${staff.first_name} ${staff.last_name}`,
      occupation: staff.role || staff.occupation,
      unit: staff.department || staff.unit,
      specialty: staff.specialty,
      phone: staff.phone,
      email: staff.email,
      userid: staff.user_id,
      source: 'ehrbase'
    }));
  } catch (error) {
    console.error('Error fetching EHRbase staff:', error);
    return [];
  }
}

export async function GET(request: NextRequest) {
  try {
    const db = await getDbConnection();
    const searchParams = request.nextUrl.searchParams;
    const searchTerm = searchParams.get('q') || '';
    const specialty = searchParams.get('occupation'); // Still using 'occupation' param for compatibility
    const department = searchParams.get('department');

    console.log('Fetching staff from database...');
    console.log('Search term:', searchTerm);
    console.log('Specialty filter:', specialty);
    console.log('Department filter:', department);

    // Build the query with filters
    let staff;
    
    if (searchTerm || specialty || department) {
      // Build WHERE conditions
      const conditions = [];
      
      if (searchTerm) {
        conditions.push(`(
          s.name ILIKE '%${searchTerm}%' OR 
          s.email ILIKE '%${searchTerm}%' OR 
          s.phone ILIKE '%${searchTerm}%'
        )`);
      }
      
      if (specialty && specialty !== 'all') {
        conditions.push(`s.specialty = '${specialty}'`);
      }
      
      if (department && department !== 'all') {
        conditions.push(`s.unit = '${department}'`);
      }

      const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';
      
      staff = await db`
        SELECT 
          s.staffid,
          s.name,
          s.occupation,
          s.unit,
          s.specialty,
          s.phone,
          s.email,
          s.userid,
          u.name as username,
          u.email as useremail
        FROM staff s
        LEFT JOIN users u ON s.userid = u.userid
        ${whereClause ? db.unsafe(whereClause) : db``}
        ORDER BY s.name ASC
        LIMIT 100
      `;
    } else {
      // No filters - get all staff
      staff = await db`
        SELECT 
          s.staffid,
          s.name,
          s.occupation,
          s.unit,
          s.specialty,
          s.phone,
          s.email,
          s.userid,
          u.name as username,
          u.email as useremail
        FROM staff s
        LEFT JOIN users u ON s.userid = u.userid
        ORDER BY s.name ASC
        LIMIT 100
      `;
    }

    console.log(`Found ${staff.length} staff members from local database`);

    // Also fetch from EHRbase
    const ehrbaseStaff = await fetchEHRbaseStaff();
    
    // Combine staff from both sources
    const allStaff = [...staff, ...ehrbaseStaff];
    
    // Remove duplicates based on staffid or email
    const uniqueStaff = allStaff.filter((staff, index, self) => 
      index === self.findIndex((s) => 
        s.staffid === staff.staffid || s.email === staff.email
      )
    );

    console.log(`Total unique staff members: ${uniqueStaff.length}`);

    return NextResponse.json({ 
      staff: uniqueStaff,
      count: uniqueStaff.length 
    });

  } catch (error) {
    console.error('Error fetching staff from database:', error);
    console.error('Database URL:', databaseUrl ? 'SET' : 'NOT SET');
    console.error('Error details:', error instanceof Error ? error.stack : 'Unknown error');
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch staff',
        details: error instanceof Error ? error.message : 'Unknown error',
        staff: [],
        count: 0
      },
      { status: 500 }
    );
  }
}
