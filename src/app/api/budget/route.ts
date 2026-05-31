import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('DATABASE_URL is not configured in environment variables');
}

const pool = databaseUrl ? new Pool({ connectionString: databaseUrl }) : null;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'periods';
    const status = searchParams.get('status');

    if (!pool) {
      return NextResponse.json(
        { 
          error: 'Database not configured',
          details: 'DATABASE_URL environment variable is missing'
        },
        { status: 500 }
      );
    }

    if (type === 'periods') {
      const query = status
        ? 'SELECT * FROM budget_periods WHERE status = $1 ORDER BY start_date DESC'
        : 'SELECT * FROM budget_periods ORDER BY start_date DESC';

      const params = status ? [status] : [];
      const result = await pool.query(query, params);

      // Overlay REAL actuals computed from the posted General Ledger.
      // Mapping (per product decision): revenue = REVENUE credits,
      // operational/expense = all EXPENSE debits. Capital left as stored.
      const enriched = await Promise.all(result.rows.map(async (row) => {
        try {
          const gl = await pool.query(
            `SELECT
               COALESCE(SUM(CASE WHEN a.accounttype='REVENUE' THEN l.credit - l.debit END), 0) AS revenue_actual,
               COALESCE(SUM(CASE WHEN a.accounttype='EXPENSE' THEN l.debit  - l.credit END), 0) AS expense_actual
             FROM fin_journal_lines l
             JOIN fin_journal_entries je ON l.journalid = je.journalid
             JOIN fin_accounts a ON l.accountid = a.accountid
             WHERE je.status = 'POSTED'
               AND je.journaldate BETWEEN $1 AND $2`,
            [row.start_date, row.end_date]
          );
          const revenueActual = parseFloat(gl.rows[0].revenue_actual) || 0;
          const expenseActual = parseFloat(gl.rows[0].expense_actual) || 0;
          return {
            ...row,
            total_revenue_actual: revenueActual,
            total_expense_actual: expenseActual,
            total_operational_actual: expenseActual, // all expenses → operational
            // total_capital_actual left as stored
            _actuals_source: 'general_ledger',
          };
        } catch {
          return row; // fall back to stored actuals if GL query fails
        }
      }));

      return NextResponse.json(enriched);
    } else if (type === 'categories') {
      const result = await pool.query('SELECT * FROM budget_categories ORDER BY name');
      return NextResponse.json(result.rows);
    } else if (type === 'summary') {
      const result = await pool.query(`
        SELECT 
          bp.*,
          COALESCE(SUM(ba.amount), 0) as spent_amount
        FROM budget_periods bp
        LEFT JOIN budget_allocations ba ON bp.id = bp.period_id
        GROUP BY bp.id
        ORDER BY bp.start_date DESC
      `);
      return NextResponse.json(result.rows);
    }

    return NextResponse.json([]);

  } catch (error) {
    console.error('Error fetching budget data:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch budget data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
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
    const { type, ...data } = body;

    if (type === 'period') {
      const result = await pool.query(`
        INSERT INTO budget_periods (name, start_date, end_date, total_budget, status)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `, [
        data.name,
        data.start_date,
        data.end_date,
        data.total_budget,
        data.status || 'ACTIVE'
      ]);

      return NextResponse.json({
        success: true,
        data: result.rows[0]
      });
    } else if (type === 'category') {
      const result = await pool.query(`
        INSERT INTO budget_categories (name, description, allocated_amount)
        VALUES ($1, $2, $3)
        RETURNING *
      `, [
        data.name,
        data.description,
        data.allocated_amount
      ]);

      return NextResponse.json({
        success: true,
        data: result.rows[0]
      });
    }

    return NextResponse.json(
      { error: 'Invalid type specified' },
      { status: 400 }
    );

  } catch (error) {
    console.error('Error creating budget data:', error);
    return NextResponse.json(
      { 
        error: 'Failed to create budget data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
