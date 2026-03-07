import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const databaseUrl = process.env.OPENEHR_DATABASE_URL;

  if (!databaseUrl) {
    return NextResponse.json(
      { error: 'Database not configured' },
      { status: 500 }
    );
  }

  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
  });

  try {
    const { searchParams } = new URL(request.url);
    const year = searchParams.get('year');
    const type = searchParams.get('type');

    let query = `
      SELECT 
        id,
        name,
        date,
        type,
        recurring,
        applicable_departments,
        is_active,
        created_at,
        updated_at
      FROM holidays
      WHERE is_active = true
    `;

    const params: any[] = [];
    let paramIndex = 1;

    if (year) {
      query += ` AND EXTRACT(YEAR FROM date) = $${paramIndex}`;
      params.push(year);
      paramIndex++;
    }

    if (type) {
      query += ` AND type = $${paramIndex}`;
      params.push(type);
      paramIndex++;
    }

    query += ` ORDER BY date ASC`;

    const result = await pool.query(query, params);

    await pool.end();

    return NextResponse.json({
      success: true,
      data: result.rows,
      count: result.rows.length
    });

  } catch (error) {
    console.error('Error fetching holidays:', error);
    await pool.end();
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch holidays',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const databaseUrl = process.env.OPENEHR_DATABASE_URL;

  if (!databaseUrl) {
    return NextResponse.json(
      { error: 'Database not configured' },
      { status: 500 }
    );
  }

  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
  });

  try {
    const body = await request.json();
    const { name, date, type, recurring, applicable_departments } = body;

    if (!name || !date || !type) {
      return NextResponse.json(
        { error: 'Missing required fields: name, date, type' },
        { status: 400 }
      );
    }

    const result = await pool.query(`
      INSERT INTO holidays (
        name, date, type, recurring, applicable_departments, is_active
      ) VALUES ($1, $2, $3, $4, $5, true)
      RETURNING *
    `, [
      name,
      date,
      type,
      recurring || false,
      applicable_departments ? JSON.stringify(applicable_departments) : null
    ]);

    await pool.end();

    return NextResponse.json({
      success: true,
      message: 'Holiday created successfully',
      data: result.rows[0]
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating holiday:', error);
    await pool.end();
    
    return NextResponse.json(
      { 
        error: 'Failed to create holiday',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
