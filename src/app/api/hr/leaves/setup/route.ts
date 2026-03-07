import { NextResponse } from 'next/server';
import { Pool } from 'pg';

export const dynamic = 'force-dynamic';

export async function POST() {
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
    // Create leave_types table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS leave_types (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        code VARCHAR(50) UNIQUE NOT NULL,
        name VARCHAR(100) NOT NULL,
        category VARCHAR(20) NOT NULL,
        max_days INTEGER NOT NULL,
        max_consecutive INTEGER,
        carry_forward BOOLEAN DEFAULT false,
        max_carry_forward_days INTEGER DEFAULT 0,
        accrual_method VARCHAR(20),
        accrual_rate DECIMAL(5,2),
        notice_days INTEGER DEFAULT 0,
        requires_documentation BOOLEAN DEFAULT false,
        gender_specific VARCHAR(10),
        applicable_to_roles JSONB,
        color VARCHAR(7),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Create leave_balances table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS leave_balances (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        employee_id VARCHAR(50) NOT NULL,
        leave_type_id UUID REFERENCES leave_types(id) ON DELETE CASCADE,
        year INTEGER NOT NULL,
        opening_balance DECIMAL(5,2) DEFAULT 0,
        accrued DECIMAL(5,2) DEFAULT 0,
        used DECIMAL(5,2) DEFAULT 0,
        pending DECIMAL(5,2) DEFAULT 0,
        carried_forward DECIMAL(5,2) DEFAULT 0,
        encashed DECIMAL(5,2) DEFAULT 0,
        closing_balance DECIMAL(5,2) DEFAULT 0,
        last_accrual_date DATE,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(employee_id, leave_type_id, year)
      )
    `);

    // Create leave_requests table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS leave_requests (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        request_number VARCHAR(50) UNIQUE NOT NULL,
        employee_id VARCHAR(50) NOT NULL,
        leave_type_id UUID REFERENCES leave_types(id) ON DELETE RESTRICT,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        total_days DECIMAL(5,2) NOT NULL,
        reason TEXT,
        emergency_contact VARCHAR(100),
        emergency_phone VARCHAR(20),
        handover_to VARCHAR(50),
        attachment_url TEXT,
        status VARCHAR(20) DEFAULT 'PENDING',
        requested_at TIMESTAMP DEFAULT NOW(),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Create leave_approvals table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS leave_approvals (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        leave_request_id UUID REFERENCES leave_requests(id) ON DELETE CASCADE,
        approver_id VARCHAR(50) NOT NULL,
        approval_level INTEGER NOT NULL,
        status VARCHAR(20) NOT NULL,
        comments TEXT,
        approved_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(leave_request_id, approval_level)
      )
    `);

    // Create leave_transactions table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS leave_transactions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        employee_id VARCHAR(50) NOT NULL,
        leave_type_id UUID REFERENCES leave_types(id) ON DELETE RESTRICT,
        leave_request_id UUID REFERENCES leave_requests(id) ON DELETE SET NULL,
        transaction_type VARCHAR(20) NOT NULL,
        transaction_date DATE NOT NULL,
        days DECIMAL(5,2) NOT NULL,
        balance_before DECIMAL(5,2),
        balance_after DECIMAL(5,2),
        description TEXT,
        created_by VARCHAR(50),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Create holidays table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS holidays (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(100) NOT NULL,
        date DATE NOT NULL,
        type VARCHAR(20) NOT NULL,
        recurring BOOLEAN DEFAULT false,
        applicable_departments JSONB,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Create leave_policies table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS leave_policies (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(100) NOT NULL,
        description TEXT,
        department_id VARCHAR(50),
        employee_category VARCHAR(50),
        policy_rules JSONB NOT NULL,
        effective_from DATE NOT NULL,
        effective_to DATE,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Create indexes for better performance
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_leave_balances_employee ON leave_balances(employee_id);
      CREATE INDEX IF NOT EXISTS idx_leave_balances_year ON leave_balances(year);
      CREATE INDEX IF NOT EXISTS idx_leave_requests_employee ON leave_requests(employee_id);
      CREATE INDEX IF NOT EXISTS idx_leave_requests_status ON leave_requests(status);
      CREATE INDEX IF NOT EXISTS idx_leave_requests_dates ON leave_requests(start_date, end_date);
      CREATE INDEX IF NOT EXISTS idx_leave_approvals_request ON leave_approvals(leave_request_id);
      CREATE INDEX IF NOT EXISTS idx_leave_approvals_approver ON leave_approvals(approver_id);
      CREATE INDEX IF NOT EXISTS idx_leave_transactions_employee ON leave_transactions(employee_id);
      CREATE INDEX IF NOT EXISTS idx_holidays_date ON holidays(date);
    `);

    await pool.end();

    return NextResponse.json({
      success: true,
      message: 'Leave management database schema created successfully',
      tables: [
        'leave_types',
        'leave_balances',
        'leave_requests',
        'leave_approvals',
        'leave_transactions',
        'holidays',
        'leave_policies'
      ]
    });

  } catch (error) {
    console.error('Error creating leave management schema:', error);
    await pool.end();
    
    return NextResponse.json(
      { 
        error: 'Failed to create leave management schema',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
