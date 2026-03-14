import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_RBybikcu3tz5@ep-long-river-allaqs25.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require',
  ssl: { rejectUnauthorized: false }
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      first_name,
      last_name,
      email,
      phone,
      gender,
      nationality,
      education,
      university,
      specialization,
      experience_years,
      current_employer,
      expected_salary,
      source,
      referral_employee,
      vacancy_id,
      resume_url,
      notes
    } = body;

    // Validate required fields
    if (!first_name || !last_name || !email || !vacancy_id) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: first_name, last_name, email, vacancy_id' },
        { status: 400 }
      );
    }

    // Generate unique candidate number
    const candidateNumber = `CAND-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;

    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Insert candidate with explicit column mapping
      const result = await client.query(`
        INSERT INTO job_candidates (
          candidate_number, 
          first_name, 
          last_name, 
          email, 
          phone, 
          gender, 
          nationality, 
          education, 
          university, 
          specialization, 
          experience_years, 
          current_employer, 
          expected_salary, 
          source, 
          referral_employee, 
          status, 
          vacancy_id, 
          resume_url, 
          notes,
          created_at,
          updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, NOW(), NOW()
        )
        RETURNING *
      `, [
        candidateNumber,
        first_name,
        last_name,
        email,
        phone || null,
        gender || null,
        nationality || null,
        education || null,
        university || null,
        specialization || null,
        experience_years ? parseInt(experience_years) : null,
        current_employer || null,
        expected_salary || null,
        source || null,
        referral_employee || null,
        'NEW',
        vacancy_id,
        resume_url || null,
        notes || null
      ]);

      await client.query('COMMIT');

      return NextResponse.json({
        success: true,
        data: result.rows[0],
        message: 'Candidate created successfully'
      });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error: any) {
    console.error('Candidate Creation Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to create candidate',
        details: error.stack
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const vacancyId = searchParams.get('vacancy_id');

    const client = await pool.connect();
    
    try {
      let query = `
        SELECT c.*, v.position as vacancy_position, v.department as vacancy_department
        FROM job_candidates c
        LEFT JOIN job_vacancies v ON c.vacancy_id = v.id
        WHERE 1=1
      `;
      
      const params = [];
      
      if (vacancyId) {
        query += ' AND c.vacancy_id = $1';
        params.push(vacancyId);
      }
      
      query += ' ORDER BY c.created_at DESC';

      const result = await client.query(query, params);

      return NextResponse.json({
        success: true,
        data: result.rows
      });

    } finally {
      client.release();
    }

  } catch (error: any) {
    console.error('Get Candidates Error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
