import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db/pool';


// GET - Fetch national drugs with search and filters
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const category = searchParams.get('category') || '';
    const dosageForm = searchParams.get('dosage_form') || '';
    const route = searchParams.get('route') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = (page - 1) * limit;

    let query = `
      SELECT 
        id, national_code, drug_name, inn, strength, dosage_form, route,
        category, edl, biological_products, biosimilar, medical_device,
        active, created_at, updated_at
      FROM national_drugs
      WHERE active = true
    `;

    const params: any[] = [];
    let paramIndex = 1;

    // Search filter
    if (search) {
      query += ` AND (
        drug_name ILIKE $${paramIndex} OR
        inn ILIKE $${paramIndex} OR
        national_code ILIKE $${paramIndex}
      )`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    // Category filter
    if (category) {
      query += ` AND category = $${paramIndex}`;
      params.push(category);
      paramIndex++;
    }

    // Dosage form filter
    if (dosageForm) {
      query += ` AND dosage_form ILIKE $${paramIndex}`;
      params.push(`%${dosageForm}%`);
      paramIndex++;
    }

    // Route filter
    if (route) {
      query += ` AND route ILIKE $${paramIndex}`;
      params.push(`%${route}%`);
      paramIndex++;
    }

    // Add ordering and pagination
    query += ` ORDER BY drug_name ASC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    // Get total count
    let countQuery = `SELECT COUNT(*) FROM national_drugs WHERE active = true`;
    const countParams: any[] = [];
    let countParamIndex = 1;

    if (search) {
      countQuery += ` AND (drug_name ILIKE $${countParamIndex} OR inn ILIKE $${countParamIndex} OR national_code ILIKE $${countParamIndex})`;
      countParams.push(`%${search}%`);
      countParamIndex++;
    }
    if (category) {
      countQuery += ` AND category = $${countParamIndex}`;
      countParams.push(category);
      countParamIndex++;
    }
    if (dosageForm) {
      countQuery += ` AND dosage_form ILIKE $${countParamIndex}`;
      countParams.push(`%${dosageForm}%`);
      countParamIndex++;
    }
    if (route) {
      countQuery += ` AND route ILIKE $${countParamIndex}`;
      countParams.push(`%${route}%`);
    }

    const countResult = await pool.query(countQuery, countParams);
    const totalCount = parseInt(countResult.rows[0].count);

    return NextResponse.json({
      success: true,
      data: result.rows,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit)
      }
    });

  } catch (error) {
    console.error('Error fetching national drugs:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch national drugs' },
      { status: 500 }
    );
  }
}

// POST - Add new drug (admin only)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const result = await pool.query(`
      INSERT INTO national_drugs (
        national_code, drug_name, inn, strength, dosage_form, route,
        category, subcategory, biological_products, biosimilar,
        medical_device, edl, orphan, notes, active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *
    `, [
      body.national_code,
      body.drug_name,
      body.inn,
      body.strength,
      body.dosage_form,
      body.route,
      body.category,
      body.subcategory,
      body.biological_products,
      body.biosimilar,
      body.medical_device,
      body.edl,
      body.orphan,
      body.notes,
      body.active !== false
    ]);

    return NextResponse.json({
      success: true,
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Error creating drug:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create drug' },
      { status: 500 }
    );
  }
}
