import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

export const dynamic = 'force-dynamic';

const pool = new Pool({
  connectionString: process.env.OPENEHR_DATABASE_URL,
});

export async function GET() {
  try {
    const result = await pool.query(`
      SELECT return_number, items, created_at 
      FROM invoice_returns 
      WHERE invoice_id = $1 
      ORDER BY created_at DESC
    `, ['46270afc-6a40-43ca-966e-4473e25d4e6d']);
    
    return NextResponse.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error checking items:', error);
    return NextResponse.json(
      { error: 'Failed to check items' },
      { status: 500 }
    );
  }
}
