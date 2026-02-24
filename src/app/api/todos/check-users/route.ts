import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const TIBBNA_DATABASE_URL = process.env.TIBBNA_DATABASE_URL || process.env.DATABASE_URL || "postgresql://neondb_owner:npg_RBybikcu3tz5@ep-long-river-allaqs25.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

async function getDbConnection() {
  const postgres = (await import('postgres')).default;
  return postgres(TIBBNA_DATABASE_URL, {
    ssl: 'require',
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
  });
}

export async function GET(request: NextRequest) {
  try {
    const db = await getDbConnection();
    
    // Get first 10 users
    const users = await db`
      SELECT userid, email, name 
      FROM users 
      LIMIT 10
    `;

    return NextResponse.json({ 
      success: true,
      users,
      count: users.length
    });

  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch users',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
