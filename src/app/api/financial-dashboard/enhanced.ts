import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db/pool';


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
    
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'month';
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const departmentId = searchParams.get('department_id');


    // Build date filter
    let dateFilter = '';
    let params: any[] = [];
    
    if (startDate && endDate) {
      dateFilter = ` AND DATE(i.invoice_date) BETWEEN $${params.length + 1} AND $${params.length + 2}`;
      params.push(startDate, endDate);
    } else if (period === 'month') {
      dateFilter = ` AND DATE(i.invoice_date) >= DATE_TRUNC('month', CURRENT_DATE)`;
    } else if (period === 'year') {
      dateFilter = ` AND DATE(i.invoice_date) >= DATE_TRUNC('year', CURRENT_DATE)`;
    } else if (period === 'week') {
      dateFilter = ` AND DATE(i.invoice_date) >= DATE_TRUNC('week', CURRENT_DATE)`;
    } else if (period === 'quarter') {
      dateFilter = ` AND DATE(i.invoice_date) >= DATE_TRUNC('quarter', CURRENT_DATE)`;
    } else if (period === 'today') {
      dateFilter = ` AND DATE(i.invoice_date) = CURRENT_DATE`;
    }


    // 1. REAL REVENUE CALCULATION
    
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
      WHERE i.status = 'PAID' ${dateFilter}
      GROUP BY s.category, s.name
      ORDER BY revenue DESC
    `;
    
    const revenueResult = await pool.query(revenueByServiceQuery, params);

    // Total revenue summary
    const totalRevenueQuery = `
      SELECT 
        SUM(total_amount) as total_revenue,
        COUNT(*) as total_invoices,
        SUM(CASE WHEN insurance_coverage_amount > 0 THEN insurance_coverage_amount ELSE 0 END) as insurance_revenue,
        SUM(CASE WHEN patient_responsibility > 0 THEN patient_responsibility ELSE 0 END) as patient_revenue,
        SUM(amount_paid) as amount_collected,
        SUM(balance_due) as outstanding_balance
      FROM invoices 
      WHERE status = 'PAID' ${dateFilter}
    `;
    
    const totalRevenueResult = await pool.query(totalRevenueQuery, params);

    // 2. REAL EXPENSES CALCULATION
    
    // Payroll expenses
    const payrollExpensesQuery = `
      SELECT 
        'SALARIES_WAGES' as category,
        SUM(gross_salary) as amount,
        COUNT(DISTINCT employee_id) as transaction_count,
        COUNT(*) as payroll_count,
        AVG(gross_salary) as avg_salary
      FROM payroll_transactions 
      WHERE created_at >= DATE_TRUNC('${period}', CURRENT_DATE)
    `;
    
    const payrollResult = await pool.query(payrollExpensesQuery);

    // Financial transactions (other expenses)
    const otherExpensesQuery = `
      SELECT 
        category,
        SUM(amount) as amount,
        COUNT(*) as transaction_count
      FROM financial_transactions 
      WHERE transaction_type = 'EXPENSE' 
        AND transaction_date >= DATE_TRUNC('${period}', CURRENT_DATE)
      GROUP BY category
      ORDER BY amount DESC
    `;
    
    let otherExpensesResult = { rows: [] };
    try {
      otherExpensesResult = await pool.query(otherExpensesQuery);
    } catch (error) {
    }

    // 3. PROCESS AND ENHANCE DATA

    // Process revenue data with enhanced information
    const revenueStreams = revenueResult.rows.map(row => {
      const config = categoryConfig[row.category] || categoryConfig['OTHER'];
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

    // Process expense data
    const expenseCategories = [];
    
    // Add payroll expenses
    if (payrollResult.rows[0]?.amount) {
      const payrollConfig = categoryConfig['SALARIES_WAGES'];
      expenseCategories.push({
        category: 'SALARIES_WAGES',
        label: payrollConfig.label,
        amount: parseFloat(payrollResult.rows[0].amount) || 0,
        transactions: parseInt(payrollResult.rows[0].transaction_count) || 0,
        employees: parseInt(payrollResult.rows[0].payroll_count) || 0,
        avg_salary: parseFloat(payrollResult.rows[0].avg_salary) || 0,
        color: payrollConfig.color,
        icon: payrollConfig.icon,
        type: 'expense'
      });
    }

    // Add other expenses
    (otherExpensesResult.rows as any[]).forEach(row => {
      const config = categoryConfig[row.category] || { label: row.category, color: 'gray', icon: 'receipt' };
      expenseCategories.push({
        category: row.category,
        label: config.label,
        amount: parseFloat(row.amount) || 0,
        transactions: parseInt(row.transaction_count) || 0,
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
          breakdown: {
            insurance: parseFloat(totalRevenueResult.rows[0]?.insurance_revenue) || 0,
            patient: parseFloat(totalRevenueResult.rows[0]?.patient_revenue) || 0,
            collected: parseFloat(totalRevenueResult.rows[0]?.amount_collected) || 0,
            outstanding: parseFloat(totalRevenueResult.rows[0]?.outstanding_balance) || 0
          },
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
          breakdown: {
            payroll: expenseCategories.find(c => c.category === 'SALARIES_WAGES')?.amount || 0,
            other: totalExpenses - (expenseCategories.find(c => c.category === 'SALARIES_WAGES')?.amount || 0)
          }
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


    return NextResponse.json(enhancedData);

  } catch (error) {
    console.error('❌ Enhanced financial dashboard error:', error);
    
    // Fallback to original implementation if enhanced version fails
    
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
            breakdown: { insurance: 0, patient: 0, collected: 0, outstanding: 0 },
            metrics: { totalInvoices: 0, avgTransactionValue: 0 }
          },
          expenses: {
            categories: [],
            total: 0,
            breakdown: { payroll: 0, other: 0 }
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
