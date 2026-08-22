import { NextRequest, NextResponse } from 'next/server';
import { getWorkspaceId } from '@/lib/workspace';
import { pool } from '@/lib/db/pool';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('DATABASE_URL is not configured in environment variables');
}


export async function GET(request: NextRequest) {
  try {
    // Insurers a facility has contracts with are that facility's own list.
    const workspaceId = getWorkspaceId(request);
    if (!workspaceId) {
      return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
    }

    if (!pool) {
      return NextResponse.json(
        { 
          error: 'Database not configured',
          details: 'DATABASE_URL environment variable is missing'
        },
        { status: 500 }
      );
    }

    // Check if insurance_companies table exists
    const tableExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'insurance_companies'
      )
    `);

    if (!tableExists.rows[0].exists) {
      // Return mock data if table doesn't exist
      return NextResponse.json([
        { id: 'INS-001', name: 'National Insurance Company', code: 'NAT001' },
        { id: 'INS-002', name: 'HealthCare Plus', code: 'HCP002' },
        { id: 'INS-003', name: 'MediShield Insurance', code: 'MSI003' },
        { id: 'INS-004', name: 'Global Health Coverage', code: 'GHC004' },
        { id: 'INS-005', name: 'Premium Medical Insurance', code: 'PMI005' }
      ]);
    }

    // Self-migrate: contract/policy detail columns used by the Edit Insurance
    // Company form's "Pricing Configuration" and "Contract Details" sections
    // (discount/copay %, payment terms, contract dates, coverage limit) and by
    // the Insurance Pre-Approval report, which reads contract dates as the
    // policy's Effective/Expiration Date.
    await pool.query(`
      ALTER TABLE insurance_companies
        ADD COLUMN IF NOT EXISTS discount_percentage NUMERIC(5,2) DEFAULT 0,
        ADD COLUMN IF NOT EXISTS copay_percentage NUMERIC(5,2) DEFAULT 0,
        ADD COLUMN IF NOT EXISTS payment_terms_days INTEGER DEFAULT 30,
        ADD COLUMN IF NOT EXISTS contract_start_date DATE,
        ADD COLUMN IF NOT EXISTS contract_end_date DATE,
        ADD COLUMN IF NOT EXISTS coverage_limit NUMERIC(14,2),
        ADD COLUMN IF NOT EXISTS website VARCHAR(255),
        ADD COLUMN IF NOT EXISTS city VARCHAR(100),
        ADD COLUMN IF NOT EXISTS province VARCHAR(100),
        ADD COLUMN IF NOT EXISTS notes TEXT
    `).catch(() => { /* non-fatal — falls back to whatever columns already exist */ });

    // First check what columns exist in the table
    const columnsResult = await pool.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'insurance_companies'
      ORDER BY ordinal_position
    `);

    const columns = columnsResult.rows.map(row => row.column_name);
    console.log('Available columns in insurance_companies:', columns);

    // Build dynamic query based on available columns
    let selectColumns = [];
    if (columns.includes('id')) selectColumns.push('id');
    if (columns.includes('company_id')) selectColumns.push('company_id as id');
    if (columns.includes('company_name')) selectColumns.push('company_name as name');
    if (columns.includes('company_name_ar')) selectColumns.push('company_name_ar');
    if (columns.includes('company_code')) selectColumns.push('company_code as code');
    if (columns.includes('contact_person')) selectColumns.push('contact_person');
    if (columns.includes('contact_phone')) selectColumns.push('contact_phone');
    if (columns.includes('contact_email')) selectColumns.push('contact_email');
    if (columns.includes('address')) selectColumns.push('address');
    if (columns.includes('coverage_percentage')) selectColumns.push('coverage_percentage');
    if (columns.includes('active')) selectColumns.push('active');
    if (columns.includes('discount_percentage')) selectColumns.push('discount_percentage');
    if (columns.includes('copay_percentage')) selectColumns.push('copay_percentage');
    if (columns.includes('payment_terms_days')) selectColumns.push('payment_terms_days');
    if (columns.includes('contract_start_date')) selectColumns.push('contract_start_date');
    if (columns.includes('contract_end_date')) selectColumns.push('contract_end_date');
    if (columns.includes('coverage_limit')) selectColumns.push('coverage_limit');
    if (columns.includes('website')) selectColumns.push('website');
    if (columns.includes('city')) selectColumns.push('city');
    if (columns.includes('province')) selectColumns.push('province');
    if (columns.includes('notes')) selectColumns.push('notes');

    if (selectColumns.length === 0) {
      // If no columns exist, return mock data
      return NextResponse.json([
        { id: 'INS-001', name: 'National Insurance Company', code: 'NAT001' },
        { id: 'INS-002', name: 'HealthCare Plus', code: 'HCP002' },
        { id: 'INS-003', name: 'MediShield Insurance', code: 'MSI003' },
        { id: 'INS-004', name: 'Global Health Coverage', code: 'GHC004' },
        { id: 'INS-005', name: 'Premium Medical Insurance', code: 'PMI005' }
      ]);
    }

    const query = `
      SELECT ${selectColumns.join(', ')}
      FROM insurance_companies
      WHERE workspaceid = $1
      ORDER BY company_name
    `;

    const result = await pool.query(query, [workspaceId]);

    // Nest flat DB columns into the contact/address/metadata shape the
    // Insurance Company UI (finance/insurance) and Pre-Approval report expect.
    const shaped = result.rows.map((row: any) => ({
      ...row,
      contact: {
        contact_person: row.contact_person,
        phone: row.contact_phone,
        email: row.contact_email,
        website: row.website,
      },
      address: {
        address_line1: row.address,
        city: row.city,
        province: row.province,
      },
      metadata: {
        default_discount_percentage: row.discount_percentage,
        default_copay_percentage: row.copay_percentage,
        claim_payment_terms_days: row.payment_terms_days,
        contract_start_date: row.contract_start_date,
        contract_end_date: row.contract_end_date,
        coverage_limit: row.coverage_limit,
        notes: row.notes,
      },
    }));

    return NextResponse.json(shaped);

  } catch (error) {
    console.error('Error fetching insurance companies:', error);
    
    // Return mock data on error
    return NextResponse.json([
      { id: 'INS-001', name: 'National Insurance Company', code: 'NAT001' },
      { id: 'INS-002', name: 'HealthCare Plus', code: 'HCP002' },
      { id: 'INS-003', name: 'MediShield Insurance', code: 'MSI003' },
      { id: 'INS-004', name: 'Global Health Coverage', code: 'GHC004' },
      { id: 'INS-005', name: 'Premium Medical Insurance', code: 'PMI005' }
    ]);
  }
}

export async function POST(request: NextRequest) {
  try {
    const workspaceId = getWorkspaceId(request);
    if (!workspaceId) {
      return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
    }

    if (!pool) {
      return NextResponse.json(
        { 
          error: 'Database not configured',
          details: 'DATABASE_URL environment variable is missing'
        },
        { status: 500 }
      );
    }

    const body = await request.json();
    const {
      name,
      code,
      name_ar,
      // The Edit Insurance Company form (finance/insurance) submits nested
      // contact/address/metadata objects — accept those, falling back to
      // flat fields for any other caller still using the old shape.
      contact = {},
      address: addressObj = {},
      metadata = {},
      contact_person = contact.contact_person,
      contact_phone = contact.phone,
      contact_email = contact.email,
      website = contact.website,
      address = addressObj.address_line1,
      city = addressObj.city,
      province = addressObj.province,
      coverage_percentage,
      active,
    } = body;
    const discount_percentage = metadata.default_discount_percentage ?? 0;
    const copay_percentage = metadata.default_copay_percentage ?? 0;
    const payment_terms_days = metadata.claim_payment_terms_days ?? 30;
    const contract_start_date = metadata.contract_start_date || null;
    const contract_end_date = metadata.contract_end_date || null;
    const coverage_limit = metadata.coverage_limit ?? null;
    const notes = metadata.notes || null;

    // Check if table exists, create if not
    await pool.query(`
      CREATE TABLE IF NOT EXISTS insurance_companies (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        code VARCHAR(50) UNIQUE,
        contact_email VARCHAR(255),
        contact_phone VARCHAR(50),
        address TEXT,
        createdat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedat TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await pool.query(`
      ALTER TABLE insurance_companies
        ADD COLUMN IF NOT EXISTS discount_percentage NUMERIC(5,2) DEFAULT 0,
        ADD COLUMN IF NOT EXISTS copay_percentage NUMERIC(5,2) DEFAULT 0,
        ADD COLUMN IF NOT EXISTS payment_terms_days INTEGER DEFAULT 30,
        ADD COLUMN IF NOT EXISTS contract_start_date DATE,
        ADD COLUMN IF NOT EXISTS contract_end_date DATE,
        ADD COLUMN IF NOT EXISTS coverage_limit NUMERIC(14,2),
        ADD COLUMN IF NOT EXISTS website VARCHAR(255),
        ADD COLUMN IF NOT EXISTS city VARCHAR(100),
        ADD COLUMN IF NOT EXISTS province VARCHAR(100),
        ADD COLUMN IF NOT EXISTS notes TEXT
    `).catch(() => {});

    const result = await pool.query(`
      INSERT INTO insurance_companies (
        company_id, company_code, company_name, company_name_ar,
        contact_person, contact_phone, contact_email, address, coverage_percentage, active,
        discount_percentage, copay_percentage, payment_terms_days,
        contract_start_date, contract_end_date, coverage_limit,
        website, city, province, notes, workspaceid
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
      RETURNING *
    `, [
      `INS-${Math.floor(Math.random() * 100000)}`,
      code,
      name,
      name_ar || '',
      contact_person || '',
      contact_phone || '',
      contact_email || '',
      address || '',
      coverage_percentage || 0,
      active !== false,
      discount_percentage,
      copay_percentage,
      payment_terms_days,
      contract_start_date,
      contract_end_date,
      coverage_limit,
      website || '',
      city || '',
      province || '',
      notes,
      workspaceId,
    ]);

    return NextResponse.json({
      success: true,
      message: 'Insurance company created successfully',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Error creating insurance company:', error);
    return NextResponse.json(
      { 
        error: 'Failed to create insurance company',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
