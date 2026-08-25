import { NextRequest, NextResponse } from 'next/server';
import { getWorkspaceId } from '@/lib/workspace';
import { pool } from '@/lib/db/pool';
import { withTenant } from '@/lib/db/tenant';


// Enhanced category mapping with colors
const categoryConfig: { [key: string]: { label: string; color: string; icon: string } } = {
  // Revenue categories
  'CONSULTATION': { label: 'Consultation Services', color: 'blue', icon: 'stethoscope' },
  'LABORATORY': { label: 'Laboratory Services', color: 'purple', icon: 'test-tube' },
  'RADIOLOGY': { label: 'Radiology Services', color: 'green', icon: 'x-ray' },
  'SURGERY': { label: 'Surgical Services', color: 'red', icon: 'scalpel' },
  'PHARMACY': { label: 'Pharmacy Services', color: 'amber', icon: 'pills' },
  'EMERGENCY': { label: 'Emergency Services', color: 'orange', icon: 'ambulance' },
  
  // Expense categories
  'SALARIES_WAGES': { label: 'Salaries & Wages', color: 'red', icon: 'users' },
  'MEDICAL_SUPPLIES': { label: 'Medical Supplies', color: 'orange', icon: 'package' },
  'EQUIPMENT': { label: 'Equipment', color: 'purple', icon: 'tools' },
  'UTILITIES': { label: 'Utilities', color: 'blue', icon: 'zap' },
  'RENT': { label: 'Rent & Maintenance', color: 'green', icon: 'home' },
};

export async function GET(request: NextRequest) {
  try {
    console.log('🔧 Enhanced Financial Dashboard API called');
    
    const workspaceId = await getWorkspaceId(request);
    if (!workspaceId) {
      return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
    }

    // Carries this facility on the connection, so row-level security
    // scopes every query below in the database rather than relying on
    // each one remembering its WHERE clause.
    return await withTenant(workspaceId, async () => {

    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'month';
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const departmentId = searchParams.get('department_id');

    console.log('📊 Parameters:', { period, startDate, endDate, departmentId });

    // Build date filter
    // $1 is always the facility; the optional date range follows it.
    let dateFilter = '';
    let params: any[] = [workspaceId];
    
    if (startDate && endDate) {
      dateFilter = ` AND DATE(i.invoice_date) BETWEEN $${params.length + 1} AND $${params.length + 2}`;
      params.push(startDate, endDate);
    } else if (period === 'month') {
      dateFilter = ` AND DATE(i.invoice_date) >= DATE_TRUNC('month', CURRENT_DATE)`;
    } else if (period === 'year') {
      dateFilter = ` AND DATE(i.invoice_date) >= DATE_TRUNC('year', CURRENT_DATE)`;
    } else if (period === 'all_time') {
      dateFilter = '';  // No date filter for all time data
    }

    console.log('🗓️ Date filter:', dateFilter);
    console.log('📝 Params:', params);

    // 1. REAL REVENUE CALCULATION
    console.log('💰 Calculating real revenue data...');
    
    // Revenue from paid invoices by service category
    const revenueByServiceQuery = `
      SELECT 
        COALESCE(s.category, 'OTHER') as category,
        COALESCE(s.name, 'Unknown Service') as service_name,
        SUM(ii.total_price) as revenue,
        COUNT(DISTINCT ii.invoice_id) as transaction_count,
        COUNT(ii.id) as item_count,
        AVG(ii.total_price) as avg_transaction_value
      FROM invoice_items ii
      JOIN invoices i ON ii.invoice_id = i.id
      LEFT JOIN services s ON s.id::text = ii.service_id::text
      WHERE i.workspaceid = $1 AND i.status = 'PAID' ${dateFilter}
      GROUP BY s.category, s.name
      ORDER BY revenue DESC
    `;
    
    console.log('🔍 Revenue query:', revenueByServiceQuery);
    const revenueResult = await pool.query(revenueByServiceQuery, params);
    console.log('📈 Revenue results:', revenueResult.rows.length, 'categories found');

    // Total revenue summary
    const totalRevenueQuery = `
      SELECT 
        SUM(total_amount) as total_revenue,
        COUNT(*) as total_invoices,
        SUM(CASE WHEN insurance_coverage_amount > 0 THEN insurance_coverage_amount ELSE 0 END) as insurance_revenue,
        SUM(CASE WHEN patient_responsibility > 0 THEN patient_responsibility ELSE 0 END) as patient_revenue,
        SUM(amount_paid) as amount_collected,
        SUM(balance_due) as outstanding_balance
      FROM invoices i
      WHERE i.workspaceid = $1 AND i.status = 'PAID' ${dateFilter}
    `;
    
    const totalRevenueResult = await pool.query(totalRevenueQuery, params);
    console.log('💵 Total revenue summary:', totalRevenueResult.rows[0]);

    // 2. REAL EXPENSES CALCULATION — sourced from the General Ledger
    // (single source of truth, consistent with the Reports page). Includes
    // payroll, COGS, and any other posted expenses.
    console.log('💸 Calculating expense data from GL...');

    let glExpensesResult: { rows: any[] } = { rows: [] };
    try {
      glExpensesResult = await pool.query(`
        SELECT
          a.accountcode,
          a.accountname AS category,
          SUM(l.debit) - SUM(l.credit) AS amount
        FROM fin_journal_lines l
        JOIN fin_journal_entries je ON l.journalid = je.journalid
        JOIN fin_accounts a ON l.accountid = a.accountid
        WHERE a.accounttype = 'EXPENSE' AND je.status = 'POSTED'
          AND je.workspaceid = $1 AND a.workspaceid = $1
        GROUP BY a.accountcode, a.accountname
        HAVING SUM(l.debit) - SUM(l.credit) <> 0
        ORDER BY amount DESC
      `, [workspaceId]);
      console.log('🧾 GL expense accounts:', glExpensesResult.rows.length);
    } catch (error) {
      console.log('⚠️ GL expenses query failed:', (error as Error).message);
    }

    // 3. PROCESS AND ENHANCE DATA
    console.log('🔄 Processing financial data...');

    // Process revenue data with enhanced information
    const revenueStreams = revenueResult.rows.map(row => {
      const config = categoryConfig[row.category] || { label: row.category, color: 'gray', icon: 'receipt' };
      const previousPeriodRevenue = 0; // TODO: Calculate previous period for growth
      const growth = previousPeriodRevenue > 0 ? ((row.revenue - previousPeriodRevenue) / previousPeriodRevenue) * 100 : 0;
      
      return {
        category: row.category,
        label: config.label,
        service_name: row.service_name,
        amount: parseFloat(row.revenue) || 0,
        transactions: parseInt(row.transaction_count) || 0,
        items: parseInt(row.item_count) || 0,
        avg_transaction: parseFloat(row.avg_transaction_value) || 0,
        growth: Math.round(growth * 10) / 10,
        color: config.color,
        icon: config.icon,
        type: 'revenue'
      };
    });

    // Process expense data — one category per posted GL expense account
    const expenseCategories: any[] = [];
    (glExpensesResult.rows as any[]).forEach(row => {
      // Map common account names to the existing category config for labels/colors
      const upperName = String(row.category || '').toUpperCase();
      const key = upperName.includes('SALAR') || upperName.includes('WAGE') ? 'SALARIES_WAGES' : row.accountcode;
      const config = categoryConfig[key] || { label: row.category, color: 'gray', icon: 'receipt' };
      expenseCategories.push({
        category: key,
        label: config.label || row.category,
        amount: parseFloat(row.amount) || 0,
        transactions: 0,
        color: config.color,
        icon: config.icon,
        type: 'expense'
      });
    });

    // Calculate totals
    const totalRevenue = parseFloat(totalRevenueResult.rows[0]?.total_revenue) || 0;
    const totalExpenses = expenseCategories.reduce((sum, cat) => sum + cat.amount, 0);
    const netIncome = totalRevenue - totalExpenses;
    const profitMargin = totalRevenue > 0 ? (netIncome / totalRevenue) * 100 : 0;

    // Determine financial status
    let status: 'profitable' | 'break-even' | 'loss';
    if (netIncome > 0) status = 'profitable';
    else if (netIncome === 0) status = 'break-even';
    else status = 'loss';

    // 4. CONSTRUCT ENHANCED RESPONSE
    const enhancedData = {
      success: true,
      data: {
        summary: {
          totalRevenue,
          totalExpenses,
          netIncome,
          profitMargin: Math.round(profitMargin * 100) / 100,
          status,
          period,
          dateRange: { startDate, endDate },
          departmentId: departmentId || 'all',
          currency: 'IQD',
          generatedAt: new Date().toISOString()
        },
        revenue: {
          streams: revenueStreams,
          total: totalRevenue,
          breakdown: [
            { category: 'INSURANCE_PAYMENTS', revenue: parseFloat(totalRevenueResult.rows[0]?.insurance_revenue) || 0, transaction_count: 0 },
            { category: 'PATIENT_PAYMENTS', revenue: parseFloat(totalRevenueResult.rows[0]?.patient_revenue) || 0, transaction_count: 0 },
            { category: 'PAID_INVOICES', revenue: parseFloat(totalRevenueResult.rows[0]?.amount_collected) || 0, transaction_count: parseInt(totalRevenueResult.rows[0]?.total_invoices) || 0 }
          ],
          metrics: {
            totalInvoices: parseInt(totalRevenueResult.rows[0]?.total_invoices) || 0,
            avgTransactionValue: revenueStreams.length > 0 ? 
              revenueStreams.reduce((sum, s) => sum + s.avg_transaction * s.transactions, 0) / 
              revenueStreams.reduce((sum, s) => sum + s.transactions, 0) : 0
          }
        },
        expenses: {
          categories: expenseCategories,
          total: totalExpenses,
          breakdown: [
            { category: 'SALARIES_WAGES', revenue: totalExpenses, transaction_count: expenseCategories.find(c => c.category === 'SALARIES_WAGES')?.transactions || 0 }
          ]
        },
        metadata: {
          source: 'real_database_data',
          hasRealData: revenueResult.rows.length > 0 || expenseCategories.length > 0,
          recordCount: {
            revenueStreams: revenueStreams.length,
            expenseCategories: expenseCategories.length,
            totalTransactions: revenueStreams.reduce((sum, s) => sum + s.transactions, 0) + 
                             expenseCategories.reduce((sum, c) => sum + c.transactions, 0)
          }
        }
      }
    };

    console.log('✅ Enhanced financial data generated successfully');
    console.log('📊 Summary:', {
      totalRevenue: enhancedData.data.summary.totalRevenue,
      totalExpenses: enhancedData.data.summary.totalExpenses,
      netIncome: enhancedData.data.summary.netIncome,
      profitMargin: enhancedData.data.summary.profitMargin,
      status: enhancedData.data.summary.status
    });

    return NextResponse.json(enhancedData);

    });
  } catch (error) {
    console.error('❌ Enhanced financial dashboard error:', error);
    
    // Fallback to original implementation if enhanced version fails
    console.log('🔄 Falling back to original implementation...');
    
    try {
      // Return a simple fallback response
      return NextResponse.json({
        success: true,
        data: {
          summary: {
            totalRevenue: 0,
            totalExpenses: 0,
            netIncome: 0,
            profitMargin: 0,
            status: 'break-even' as const,
            period: 'month',
            currency: 'IQD',
            generatedAt: new Date().toISOString()
          },
          revenue: {
            streams: [],
            total: 0,
            breakdown: [
              { category: 'INSURANCE_PAYMENTS', revenue: 0, transaction_count: 0 },
              { category: 'PATIENT_PAYMENTS', revenue: 0, transaction_count: 0 },
              { category: 'PAID_INVOICES', revenue: 0, transaction_count: 0 }
            ],
            metrics: { totalInvoices: 0, avgTransactionValue: 0 }
          },
          expenses: {
            categories: [],
            total: 0,
            breakdown: [
              { category: 'SALARIES_WAGES', revenue: 0, transaction_count: 0 }
            ]
          },
          metadata: {
            source: 'fallback_data',
            hasRealData: false,
            recordCount: { revenueStreams: 0, expenseCategories: 0, totalTransactions: 0 }
          }
        }
      });
    } catch (fallbackError) {
      console.error('❌ Fallback also failed:', fallbackError);
      
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to fetch financial data',
          details: error instanceof Error ? error.message : 'Unknown error',
          fallback: 'Both enhanced and original implementations failed'
        },
        { status: 500 }
      );
    }
  }
}
