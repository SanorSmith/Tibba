import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

const pool = new Pool({
  connectionString: process.env.OPENEHR_DATABASE_URL,
});

export async function POST() {
  try {
    await pool.query('BEGIN');
    
    // Add items column if it doesn't exist
    await pool.query(`
      ALTER TABLE invoice_returns 
      ADD COLUMN IF NOT EXISTS items JSONB
    `);
    
    // Add comment
    await pool.query(`
      COMMENT ON COLUMN invoice_returns.items IS 'Return items stored as JSON'
    `);
    
    await pool.query('COMMIT');
    
    return NextResponse.json({
      success: true,
      message: 'Items column added successfully'
    });
    
  } catch (error) {
    await pool.query('ROLLBACK');
    console.error('Error adding items column:', error);
    return NextResponse.json(
      { error: 'Failed to add items column' },
      { status: 500 }
    );
  }
}
