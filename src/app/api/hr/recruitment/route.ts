import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_RBybikcu3tz5@ep-long-river-allaqs25.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require',
  ssl: { rejectUnauthorized: false }
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type'); // 'vacancies' or 'candidates'
    
    if (type === 'vacancies') {
      // Get all vacancies
      const result = await pool.query(`
        SELECT 
          id,
          vacancy_number,
          position,
          department,
          department_id,
          openings,
          posting_date,
          deadline,
          status,
          priority,
          grade,
          salary_min,
          salary_max,
          recruiter,
          created_at,
          updated_at
        FROM job_vacancies 
        ORDER BY posting_date DESC
      `);
      
      return NextResponse.json({
        success: true,
        data: result.rows
      });
    }
    
    if (type === 'candidates') {
      // Get all candidates with vacancy info
      const result = await pool.query(`
        SELECT 
          c.id,
          c.candidate_number,
          c.first_name,
          c.last_name,
          c.email,
          c.phone,
          c.gender,
          c.nationality,
          c.education,
          c.university,
          c.specialization,
          c.experience_years,
          c.current_employer,
          c.expected_salary,
          c.source,
          c.referral_employee,
          c.status,
          c.vacancy_id,
          c.rejection_reason,
          c.created_at,
          c.updated_at,
          v.position as vacancy_position,
          v.department as vacancy_department
        FROM job_candidates c
        LEFT JOIN job_vacancies v ON c.vacancy_id = v.id
        ORDER BY c.created_at DESC
      `);
      
      return NextResponse.json({
        success: true,
        data: result.rows
      });
    }
    
    // Get recruitment summary
    const [vacancyStats, candidateStats, timeToHire] = await Promise.all([
      pool.query(`
        SELECT 
          COUNT(*) as total_vacancies,
          COUNT(*) FILTER (WHERE status = 'OPEN') as open_vacancies
        FROM job_vacancies
      `),
      pool.query(`
        SELECT 
          COUNT(*) as total_candidates,
          COUNT(*) FILTER (WHERE status = 'NEW') as new_count,
          COUNT(*) FILTER (WHERE status = 'SCREENING') as screening_count,
          COUNT(*) FILTER (WHERE status = 'INTERVIEWING') as interviewing_count,
          COUNT(*) FILTER (WHERE status = 'OFFERED') as offered_count,
          COUNT(*) FILTER (WHERE status = 'HIRED') as hired_count,
          COUNT(*) FILTER (WHERE status = 'REJECTED') as rejected_count
        FROM job_candidates
      `),
      pool.query(`
        SELECT 
          AVG(EXTRACT(EPOCH FROM (updated_at - created_at))/86400) as avg_days
        FROM job_candidates 
        WHERE status = 'HIRED' AND created_at > NOW() - INTERVAL '6 months'
      `)
    ]);
    
    const vacancyData = vacancyStats.rows[0];
    const candidateData = candidateStats.rows[0];
    const timeData = timeToHire.rows[0];
    
    const summary = {
      total_vacancies: parseInt(vacancyData.total_vacancies),
      open_vacancies: parseInt(vacancyData.open_vacancies),
      total_candidates: parseInt(candidateData.total_candidates),
      by_status: {
        NEW: parseInt(candidateData.new_count),
        SCREENING: parseInt(candidateData.screening_count),
        INTERVIEWING: parseInt(candidateData.interviewing_count),
        OFFERED: parseInt(candidateData.offered_count),
        HIRED: parseInt(candidateData.hired_count),
        REJECTED: parseInt(candidateData.rejected_count)
      },
      avg_time_to_hire_days: Math.round(parseFloat(timeData.avg_days) || 35),
      offer_acceptance_rate: 85 // Calculate this based on offered vs hired
    };
    
    return NextResponse.json({
      success: true,
      data: {
        summary,
        vacancies: [],
        candidates: []
      }
    });
    
  } catch (error: any) {
    console.error('Recruitment API Error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, data } = body;
    
    if (type === 'vacancy') {
      // Create new vacancy
      const result = await pool.query(`
        INSERT INTO job_vacancies (
          vacancy_number, position, department, department_id, openings,
          posting_date, deadline, status, priority, grade, salary_min, salary_max, recruiter
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING *
      `, [
        data.vacancy_number,
        data.position,
        data.department,
        data.department_id,
        data.openings,
        data.posting_date,
        data.deadline,
        data.status || 'OPEN',
        data.priority || 'NORMAL',
        data.grade,
        data.salary_min,
        data.salary_max,
        data.recruiter
      ]);
      
      return NextResponse.json({
        success: true,
        data: result.rows[0]
      });
    }
    
    if (type === 'candidate') {
      // Create new candidate
      const result = await pool.query(`
        INSERT INTO job_candidates (
          candidate_number, first_name, last_name, email, phone, gender,
          nationality, education, university, specialization, experience_years,
          current_employer, expected_salary, source, referral_employee, status, vacancy_id, resume_url, notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
        RETURNING *
      `, [
        data.candidate_number,
        data.first_name,
        data.last_name,
        data.email,
        data.phone,
        data.gender,
        data.nationality,
        data.education,
        data.university,
        data.specialization,
        data.experience_years,
        data.current_employer,
        data.expected_salary,
        data.source,
        data.referral_employee,
        data.status || 'NEW',
        data.vacancy_id,
        data.resume_url,
        data.notes
      ]);
      
      return NextResponse.json({
        success: true,
        data: result.rows[0]
      });
    }
    
    return NextResponse.json(
      { success: false, error: 'Invalid type specified' },
      { status: 400 }
    );
    
  } catch (error: any) {
    console.error('Recruitment POST Error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, id, data } = body;
    
    if (type === 'vacancy') {
      // Update vacancy
      const updateFields = [];
      const values = [];
      let paramCount = 1;
      
      if (data.position !== undefined) {
        updateFields.push(`position = $${paramCount}`);
        values.push(data.position);
        paramCount++;
      }
      if (data.department !== undefined) {
        updateFields.push(`department = $${paramCount}`);
        values.push(data.department);
        paramCount++;
      }
      if (data.status !== undefined) {
        updateFields.push(`status = $${paramCount}`);
        values.push(data.status);
        paramCount++;
      }
      if (data.priority !== undefined) {
        updateFields.push(`priority = $${paramCount}`);
        values.push(data.priority);
        paramCount++;
      }
      if (data.salary_min !== undefined) {
        updateFields.push(`salary_min = $${paramCount}`);
        values.push(data.salary_min);
        paramCount++;
      }
      if (data.salary_max !== undefined) {
        updateFields.push(`salary_max = $${paramCount}`);
        values.push(data.salary_max);
        paramCount++;
      }
      if (data.deadline !== undefined) {
        updateFields.push(`deadline = $${paramCount}`);
        values.push(data.deadline);
        paramCount++;
      }
      
      updateFields.push(`updated_at = NOW()`);
      values.push(id);
      
      const result = await pool.query(`
        UPDATE job_vacancies 
        SET ${updateFields.join(', ')}
        WHERE id = $${paramCount}
        RETURNING *
      `, values);
      
      return NextResponse.json({
        success: true,
        data: result.rows[0]
      });
    }
    
    if (type === 'candidate') {
      // Update candidate
      const updateFields = [];
      const values = [];
      let paramCount = 1;
      
      if (data.first_name !== undefined) {
        updateFields.push(`first_name = $${paramCount}`);
        values.push(data.first_name);
        paramCount++;
      }
      if (data.last_name !== undefined) {
        updateFields.push(`last_name = $${paramCount}`);
        values.push(data.last_name);
        paramCount++;
      }
      if (data.email !== undefined) {
        updateFields.push(`email = $${paramCount}`);
        values.push(data.email);
        paramCount++;
      }
      if (data.phone !== undefined) {
        updateFields.push(`phone = $${paramCount}`);
        values.push(data.phone);
        paramCount++;
      }
      if (data.gender !== undefined) {
        updateFields.push(`gender = $${paramCount}`);
        values.push(data.gender);
        paramCount++;
      }
      if (data.nationality !== undefined) {
        updateFields.push(`nationality = $${paramCount}`);
        values.push(data.nationality);
        paramCount++;
      }
      if (data.education !== undefined) {
        updateFields.push(`education = $${paramCount}`);
        values.push(data.education);
        paramCount++;
      }
      if (data.university !== undefined) {
        updateFields.push(`university = $${paramCount}`);
        values.push(data.university);
        paramCount++;
      }
      if (data.specialization !== undefined) {
        updateFields.push(`specialization = $${paramCount}`);
        values.push(data.specialization);
        paramCount++;
      }
      if (data.experience_years !== undefined) {
        updateFields.push(`experience_years = $${paramCount}`);
        values.push(data.experience_years);
        paramCount++;
      }
      if (data.current_employer !== undefined) {
        updateFields.push(`current_employer = $${paramCount}`);
        values.push(data.current_employer);
        paramCount++;
      }
      if (data.expected_salary !== undefined) {
        updateFields.push(`expected_salary = $${paramCount}`);
        values.push(data.expected_salary);
        paramCount++;
      }
      if (data.source !== undefined) {
        updateFields.push(`source = $${paramCount}`);
        values.push(data.source);
        paramCount++;
      }
      if (data.referral_employee !== undefined) {
        updateFields.push(`referral_employee = $${paramCount}`);
        values.push(data.referral_employee);
        paramCount++;
      }
      if (data.status !== undefined) {
        updateFields.push(`status = $${paramCount}`);
        values.push(data.status);
        paramCount++;
      }
      if (data.vacancy_id !== undefined) {
        updateFields.push(`vacancy_id = $${paramCount}`);
        values.push(data.vacancy_id);
        paramCount++;
      }
      if (data.rejection_reason !== undefined) {
        updateFields.push(`rejection_reason = $${paramCount}`);
        values.push(data.rejection_reason);
        paramCount++;
      }
      
      updateFields.push(`updated_at = NOW()`);
      values.push(id);
      
      const result = await pool.query(`
        UPDATE job_candidates 
        SET ${updateFields.join(', ')}
        WHERE id = $${paramCount}
        RETURNING *
      `, values);
      
      return NextResponse.json({
        success: true,
        data: result.rows[0]
      });
    }
    
    return NextResponse.json(
      { success: false, error: 'Invalid type specified' },
      { status: 400 }
    );
    
  } catch (error: any) {
    console.error('Recruitment PATCH Error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const id = searchParams.get('id');
    
    if (type === 'vacancy' && id) {
      // Delete vacancy
      await pool.query('DELETE FROM job_vacancies WHERE id = $1', [id]);
      
      return NextResponse.json({
        success: true,
        message: 'Vacancy deleted successfully'
      });
    }
    
    if (type === 'candidate' && id) {
      // Delete candidate
      await pool.query('DELETE FROM job_candidates WHERE id = $1', [id]);
      
      return NextResponse.json({
        success: true,
        message: 'Candidate deleted successfully'
      });
    }
    
    return NextResponse.json(
      { success: false, error: 'Invalid parameters' },
      { status: 400 }
    );
    
  } catch (error: any) {
    console.error('Recruitment DELETE Error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
