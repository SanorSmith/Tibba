import { NextRequest, NextResponse } from 'next/server';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

const databaseUrl = process.env.TIBBNA_DATABASE_URL || process.env.DATABASE_URL || "postgresql://neondb_owner:npg_RBybikcu3tz5@ep-long-river-allaqs25.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

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

export async function GET(request: NextRequest) {
  try {
    const db = await getDbConnection();
    const searchParams = request.nextUrl.searchParams;
    const searchTerm = searchParams.get('q') || '';
    const occupation = searchParams.get('occupation');
    const department = searchParams.get('department');

    console.log('Fetching staff from database...');
    console.log('Search term:', searchTerm);
    console.log('Occupation filter:', occupation);
    console.log('Department filter:', department);

    // Build dynamic query based on filters
    let query;
    
    if (searchTerm || occupation || department) {
      // Build WHERE conditions
      const conditions = [];
      const params: any = {};
      
      if (searchTerm) {
        conditions.push(`(
          s.name ILIKE ${'%' + searchTerm + '%'} OR 
          s.email ILIKE ${'%' + searchTerm + '%'} OR 
          s.phone ILIKE ${'%' + searchTerm + '%'}
        )`);
      }
      
      if (occupation && occupation !== 'all') {
        conditions.push(`s.occupation = ${occupation}`);
      }
      
      if (department && department !== 'all') {
        conditions.push(`s.unit = ${department}`);
      }

      const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';
      
      query = db`
        SELECT 
          s.staffid,
          s.name,
          s.occupation,
          s.unit,
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
      query = db`
        SELECT 
          s.staffid,
          s.name,
          s.occupation,
          s.unit,
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

    const staff = await query;

    console.log(`Found ${staff.length} staff members`);

    return NextResponse.json({ 
      staff,
      count: staff.length 
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
