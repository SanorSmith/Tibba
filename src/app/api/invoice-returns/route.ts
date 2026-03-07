import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('DATABASE_URL is not configured in environment variables');
}

const pool = databaseUrl ? new Pool({
  connectionString: databaseUrl,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
}) : null;

export async function GET(request: NextRequest) {
  try {
    console.log('GET /api/invoice-returns - Request received');
    
    if (!pool) {
      console.error('Database pool not configured');
      return NextResponse.json(
        { 
          error: 'Database not configured',
          details: 'DATABASE_URL environment variable is missing'
        },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const invoice_id = searchParams.get('invoice_id');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = (page - 1) * limit;

    console.log('Query params:', { status, invoice_id, page, limit, offset });

    let query = `
      SELECT 
        id,
        return_number,
        return_date,
        invoice_id,
        invoice_number,
        patient_id,
        patient_name,
        patient_name_ar,
        reason_ar,
        reason_en,
        return_amount,
        refund_method,
        refund_date,
        refund_reference,
        status,
        approved_by,
        approved_at,
        notes,
        items,
        created_at,
        updated_at
      FROM invoice_returns
      WHERE 1=1
    `;
    
    const params = [];
    let paramIndex = 1;

    if (invoice_id) {
      query += ` AND invoice_id = $${paramIndex}`;
      params.push(invoice_id);
      paramIndex++;
    }

    if (status) {
      query += ` AND status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    query += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    console.log('Executing query:', query);
    console.log('With params:', params);

    const result = await pool.query(query, params);

    // Get total count
    let countQuery = 'SELECT COUNT(*) as total FROM invoice_returns WHERE 1=1';
    const countParams = [];
    let countParamIndex = 1;

    if (invoice_id) {
      countQuery += ` AND invoice_id = $${countParamIndex}`;
      countParams.push(invoice_id);
      countParamIndex++;
    }

    if (status) {
      countQuery += ` AND status = $${countParamIndex}`;
      countParams.push(status);
    }

    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].total);

    console.log(`Found ${result.rows.length} returns out of ${total} total`);

    // Parse JSON items for each return
    const returnsWithItems = result.rows.map(row => {
      try {
        // Handle different formats of items data
        let items = [];
        if (row.items) {
          if (typeof row.items === 'string') {
            items = JSON.parse(row.items);
          } else if (Array.isArray(row.items)) {
            items = row.items;
          } else if (typeof row.items === 'object') {
            // PostgreSQL might return JSONB as object
            items = Array.isArray(row.items) ? row.items : [row.items];
          }
        }
        return {
          ...row,
          items: items
        };
      } catch (parseError) {
        console.log('Error parsing items for return:', row.id, parseError);
        console.log('Raw items type:', typeof row.items);
        console.log('Raw items value:', row.items);
        return {
          ...row,
          items: []
        };
      }
    });

    return NextResponse.json({
      success: true,
      data: returnsWithItems,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Error fetching invoice returns:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch invoice returns',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('POST /api/invoice-returns - Request received');
    
    if (!pool) {
      console.error('Database pool not configured');
      return NextResponse.json(
        { 
          error: 'Database not configured',
          details: 'DATABASE_URL environment variable is missing'
        },
        { status: 500 }
      );
    }

    const body = await request.json();
    console.log('Request body:', JSON.stringify(body, null, 2));

    // Generate return number if not provided
    const returnNumber = body.return_number || `RET-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;

    // Start transaction
    await pool.query('BEGIN');

    // Insert the return with items
    const result = await pool.query(`
      INSERT INTO invoice_returns (
        organization_id,
        return_number,
        return_date,
        invoice_id,
        invoice_number,
        patient_id,
        patient_name,
        patient_name_ar,
        reason_ar,
        reason_en,
        return_amount,
        refund_method,
        refund_date,
        refund_reference,
        status,
        approved_by,
        approved_at,
        notes,
        items,
        created_by,
        updated_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
      RETURNING *
    `, [
      body.organization_id || '00000000-0000-0000-0000-000000000001', // Default org ID
      returnNumber,
      body.return_date || new Date().toISOString().split('T')[0],
      body.invoice_id,
      body.invoice_number,
      body.patient_id,
      body.patient_name,
      body.patient_name_ar,
      body.reason_ar,
      body.reason_en,
      body.return_amount,
      body.refund_method,
      body.refund_date,
      body.refund_reference,
      body.status,
      body.approved_by,
      body.approved_at,
      body.notes,
      JSON.stringify(body.items || []), // Store items as JSON
      'system', // created_by
      'system'  // updated_by
    ]);

    const newReturn = result.rows[0];

    // Commit transaction
    await pool.query('COMMIT');

    console.log(`✅ Invoice return created: ${returnNumber}`);

    return NextResponse.json({
      success: true,
      message: 'Invoice return created successfully',
      data: newReturn
    }, { status: 201 });

  } catch (error) {
    // Rollback on error
    if (pool) {
      await pool.query('ROLLBACK');
    }
    
    console.error('Error creating invoice return:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json(
      { 
        error: 'Failed to create invoice return',
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: process.env.NODE_ENV === 'development' && error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}
