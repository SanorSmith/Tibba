import { NextRequest, NextResponse } from 'next/server';

async function getDbConnection() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is not defined');
  }
  const postgres = (await import('postgres')).default;
  const sql = postgres(databaseUrl, {
    ssl: 'require',
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
  });
  return sql;
}

export async function GET(request: NextRequest) {
  try {
    const db = await getDbConnection();
    const searchParams = request.nextUrl.searchParams;
    const workspaceid = searchParams.get('workspaceid');

    if (!workspaceid) {
      return NextResponse.json(
        { error: 'workspaceid is required' },
        { status: 400 }
      );
    }

    // Query users with role 'doctor' in the workspace
    // This assumes there's a users table and workspace_members table
    // Adjust the query based on your actual schema
    const doctors = await db`
      SELECT 
        u.userid,
        u.name,
        u.email,
        s.unit
      FROM users u
      LEFT JOIN staff s ON u.userid = s.userid
      INNER JOIN workspace_members wm ON u.userid = wm.userid
      WHERE wm.workspaceid = ${workspaceid}
      AND wm.role = 'doctor'
      ORDER BY u.name
    `;

    return NextResponse.json({ doctors });
  } catch (error) {
    console.error('Error fetching doctors:', error);
    return NextResponse.json(
      { error: 'Failed to fetch doctors', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
