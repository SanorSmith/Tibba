const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_RBybikcu3tz5@ep-long-river-allaqs25.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require'
});

async function createRecruitmentTables() {
  try {
    console.log('🔧 Creating Recruitment Tables...');
    
    const client = await pool.connect();
    
    try {
      // 1. Create job_vacancies table
      await client.query(`
        CREATE TABLE IF NOT EXISTS job_vacancies (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          vacancy_number VARCHAR(50) UNIQUE NOT NULL,
          position VARCHAR(255) NOT NULL,
          department VARCHAR(255) NOT NULL,
          department_id VARCHAR(50),
          openings INTEGER NOT NULL DEFAULT 1,
          posting_date DATE NOT NULL,
          deadline DATE NOT NULL,
          status VARCHAR(20) NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'CLOSED', 'FILLED')),
          priority VARCHAR(20) NOT NULL DEFAULT 'NORMAL' CHECK (priority IN ('LOW', 'NORMAL', 'HIGH', 'URGENT')),
          grade VARCHAR(10),
          salary_min DECIMAL(12,2),
          salary_max DECIMAL(12,2),
          recruiter VARCHAR(255),
          description TEXT,
          requirements TEXT,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `);
      
      // 2. Create job_candidates table
      await client.query(`
        CREATE TABLE IF NOT EXISTS job_candidates (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          candidate_number VARCHAR(50) UNIQUE NOT NULL,
          first_name VARCHAR(255) NOT NULL,
          last_name VARCHAR(255) NOT NULL,
          email VARCHAR(255) UNIQUE NOT NULL,
          phone VARCHAR(50),
          gender VARCHAR(10),
          nationality VARCHAR(100),
          education VARCHAR(50),
          university VARCHAR(255),
          specialization VARCHAR(255),
          experience_years INTEGER,
          current_employer VARCHAR(255),
          expected_salary DECIMAL(12,2),
          source VARCHAR(50),
          referral_employee VARCHAR(50),
          status VARCHAR(20) NOT NULL DEFAULT 'NEW' CHECK (status IN ('NEW', 'SCREENING', 'INTERVIEWING', 'OFFERED', 'HIRED', 'REJECTED')),
          vacancy_id UUID REFERENCES job_vacancies(id),
          rejection_reason TEXT,
          resume_url TEXT,
          notes TEXT,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `);
      
      // 3. Create indexes
      await client.query('CREATE INDEX IF NOT EXISTS idx_job_vacancies_status ON job_vacancies(status)');
      await client.query('CREATE INDEX IF NOT EXISTS idx_job_vacancies_department ON job_vacancies(department_id)');
      await client.query('CREATE INDEX IF NOT EXISTS idx_job_candidates_status ON job_candidates(status)');
      await client.query('CREATE INDEX IF NOT EXISTS idx_job_candidates_vacancy ON job_candidates(vacancy_id)');
      await client.query('CREATE INDEX IF NOT EXISTS idx_job_candidates_email ON job_candidates(email)');
      
      console.log('✅ Recruitment tables created successfully!');
      
      // 4. Insert sample data
      console.log('📝 Inserting sample data...');
      
      // Insert vacancies
      const vacancies = [
        {
          vacancy_number: 'VAC-2026-001',
          position: 'Emergency Physician',
          department: 'Emergency Department',
          department_id: 'DEP-007',
          openings: 2,
          posting_date: '2026-01-15',
          deadline: '2026-03-15',
          status: 'OPEN',
          priority: 'URGENT',
          grade: 'G6',
          salary_min: 2200000,
          salary_max: 2800000,
          recruiter: 'Nadia Al-Khatib'
        },
        {
          vacancy_number: 'VAC-2026-002',
          position: 'Staff Nurse - ICU',
          department: 'Intensive Care Unit',
          department_id: 'DEP-008',
          openings: 3,
          posting_date: '2026-01-20',
          deadline: '2026-03-20',
          status: 'OPEN',
          priority: 'HIGH',
          grade: 'G4',
          salary_min: 1100000,
          salary_max: 1400000,
          recruiter: 'Nadia Al-Khatib'
        },
        {
          vacancy_number: 'VAC-2026-003',
          position: 'Lab Technician',
          department: 'Laboratory',
          department_id: 'DEP-009',
          openings: 1,
          posting_date: '2026-02-01',
          deadline: '2026-03-01',
          status: 'OPEN',
          priority: 'NORMAL',
          grade: 'G4',
          salary_min: 1100000,
          salary_max: 1300000,
          recruiter: 'Nadia Al-Khatib'
        }
      ];
      
      for (const vacancy of vacancies) {
        await client.query(`
          INSERT INTO job_vacancies (vacancy_number, position, department, department_id, openings, posting_date, deadline, status, priority, grade, salary_min, salary_max, recruiter)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
          ON CONFLICT (vacancy_number) DO NOTHING
        `, Object.values(vacancy));
      }
      
      // Get vacancy IDs for candidates
      const vacancyResult = await client.query('SELECT id, vacancy_number FROM job_vacancies ORDER BY vacancy_number');
      const vacancyMap = vacancyResult.rows.reduce((acc, row) => {
        acc[row.vacancy_number] = row.id;
        return acc;
      }, {});
      
      // Insert candidates
      const candidates = [
        {
          candidate_number: 'CAND-2026-001',
          first_name: 'Mohammed',
          last_name: 'Al-Saadi',
          email: 'mohammed.saadi@email.com',
          phone: '+964-770-200-0001',
          gender: 'MALE',
          nationality: 'Iraqi',
          education: 'BACHELOR',
          university: 'University of Baghdad',
          specialization: 'Emergency Medicine',
          experience_years: 5,
          current_employer: 'Baghdad Teaching Hospital',
          expected_salary: 2500000,
          source: 'LINKEDIN',
          status: 'INTERVIEWING',
          vacancy_id: vacancyMap['VAC-2026-001']
        },
        {
          candidate_number: 'CAND-2026-002',
          first_name: 'Hala',
          last_name: 'Al-Jubouri',
          email: 'hala.jubouri@email.com',
          phone: '+964-770-200-0002',
          gender: 'FEMALE',
          nationality: 'Iraqi',
          education: 'BACHELOR',
          university: 'University of Basra',
          specialization: 'Emergency Medicine',
          experience_years: 3,
          current_employer: 'Basra General Hospital',
          expected_salary: 2300000,
          source: 'WEBSITE',
          status: 'SCREENING',
          vacancy_id: vacancyMap['VAC-2026-001']
        },
        {
          candidate_number: 'CAND-2026-003',
          first_name: 'Zaid',
          last_name: 'Al-Rawi',
          email: 'zaid.rawi@email.com',
          phone: '+964-770-200-0003',
          gender: 'MALE',
          nationality: 'Iraqi',
          education: 'BACHELOR',
          university: 'Al-Nahrain University',
          specialization: 'Nursing - Critical Care',
          experience_years: 4,
          current_employer: 'Medical City Baghdad',
          expected_salary: 1300000,
          source: 'REFERRAL',
          referral_employee: 'EMP-2024-048',
          status: 'OFFERED',
          vacancy_id: vacancyMap['VAC-2026-002']
        }
      ];
      
      for (const candidate of candidates) {
        await client.query(`
          INSERT INTO job_candidates (candidate_number, first_name, last_name, email, phone, gender, nationality, education, university, specialization, experience_years, current_employer, expected_salary, source, referral_employee, status, vacancy_id)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
          ON CONFLICT (candidate_number) DO NOTHING
        `, [
          candidate.candidate_number,
          candidate.first_name,
          candidate.last_name,
          candidate.email,
          candidate.phone,
          candidate.gender,
          candidate.nationality,
          candidate.education,
          candidate.university,
          candidate.specialization,
          candidate.experience_years,
          candidate.current_employer,
          candidate.expected_salary,
          candidate.source,
          candidate.referral_employee,
          candidate.status,
          candidate.vacancy_id
        ]);
      }
      
      console.log('✅ Sample data inserted successfully!');
      
      // 5. Verify data
      const vacancyCount = await client.query('SELECT COUNT(*) as count FROM job_vacancies');
      const candidateCount = await client.query('SELECT COUNT(*) as count FROM job_candidates');
      
      console.log(`\n📊 Database Summary:`);
      console.log(`   - Job Vacancies: ${vacancyCount.rows[0].count}`);
      console.log(`   - Job Candidates: ${candidateCount.rows[0].count}`);
      
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

createRecruitmentTables();
