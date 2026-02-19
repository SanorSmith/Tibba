// FILE: src/app/api/budget/route.ts
// Budget API endpoints - GET all budgets, POST create budget

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = supabaseAdmin;
    const { searchParams } = new URL(request.url);
    
    const type = searchParams.get('type'); // periods, allocations, categories, transactions
    const periodId = searchParams.get('period_id');
    const fiscalYear = searchParams.get('fiscal_year');
    const status = searchParams.get('status');
    const department = searchParams.get('department');
    const categoryType = searchParams.get('category_type');

    console.log('📊 Budget API GET:', { type, periodId, fiscalYear, status, department, categoryType });

    // Get Budget Periods
    if (type === 'periods' || !type) {
      let query = supabase
        .from('budget_periods')
        .select('*')
        .order('fiscal_year', { ascending: false })
        .order('start_date', { ascending: false });

      if (fiscalYear) query = query.eq('fiscal_year', parseInt(fiscalYear));
      if (status) query = query.eq('status', status);

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching budget periods:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json(data);
    }

    // Get Budget Categories
    if (type === 'categories') {
      let query = supabase
        .from('budget_categories')
        .select('*')
        .eq('is_active', true)
        .order('category_code');

      if (categoryType) query = query.eq('category_type', categoryType);

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching budget categories:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json(data);
    }

    // Get Budget Allocations
    if (type === 'allocations') {
      let query = supabase
        .from('budget_allocations')
        .select(`
          *,
          period:budget_periods(*),
          category:budget_categories(*)
        `)
        .order('created_at', { ascending: false });

      if (periodId) query = query.eq('period_id', periodId);
      if (status) query = query.eq('status', status);
      if (department) query = query.eq('department', department);

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching budget allocations:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json(data);
    }

    // Get Budget Transactions
    if (type === 'transactions') {
      let query = supabase
        .from('budget_transactions')
        .select(`
          *,
          allocation:budget_allocations(
            *,
            category:budget_categories(*),
            period:budget_periods(*)
          )
        `)
        .order('transaction_date', { ascending: false })
        .limit(100);

      if (status) query = query.eq('status', status);

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching budget transactions:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json(data);
    }

    return NextResponse.json({ error: 'Invalid type parameter' }, { status: 400 });

  } catch (error: unknown) {
    console.error('GET budget error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch budget data';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = supabaseAdmin;
    const body = await request.json();
    const { type } = body;

    console.log('📝 Budget API POST:', type);

    // Create Budget Period
    if (type === 'period') {
      const periodData = {
        period_name: body.period_name,
        period_name_ar: body.period_name_ar,
        fiscal_year: body.fiscal_year,
        start_date: body.start_date,
        end_date: body.end_date,
        period_type: body.period_type,
        quarter: body.quarter || null,
        month: body.month || null,
        total_revenue_budget: body.total_revenue_budget || 0,
        total_expense_budget: body.total_expense_budget || 0,
        total_capital_budget: body.total_capital_budget || 0,
        total_operational_budget: body.total_operational_budget || 0,
        status: body.status || 'DRAFT',
        notes: body.notes || null,
        created_by: body.created_by,
      };

      const { data, error } = await supabase
        .from('budget_periods')
        .insert(periodData)
        .select()
        .single();

      if (error) {
        console.error('Error creating budget period:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      console.log('✅ Budget period created:', data.id);
      return NextResponse.json(data);
    }

    // Create Budget Allocation
    if (type === 'allocation') {
      const allocationData = {
        period_id: body.period_id,
        category_id: body.category_id,
        department: body.department,
        department_ar: body.department_ar || null,
        cost_center: body.cost_center || null,
        allocated_amount: body.allocated_amount,
        justification: body.justification || null,
        notes: body.notes || null,
        status: body.status || 'ACTIVE',
        created_by: body.created_by,
      };

      const { data, error } = await supabase
        .from('budget_allocations')
        .insert(allocationData)
        .select()
        .single();

      if (error) {
        console.error('Error creating budget allocation:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      console.log('✅ Budget allocation created:', data.id);
      return NextResponse.json(data);
    }

    // Create Budget Transaction
    if (type === 'transaction') {
      const transactionData = {
        transaction_date: body.transaction_date || new Date().toISOString().split('T')[0],
        allocation_id: body.allocation_id,
        transaction_type: body.transaction_type,
        amount: body.amount,
        reference_type: body.reference_type || null,
        reference_number: body.reference_number || null,
        reference_id: body.reference_id || null,
        description: body.description,
        description_ar: body.description_ar || null,
        vendor_name: body.vendor_name || null,
        vendor_id: body.vendor_id || null,
        status: body.status || 'POSTED',
        created_by: body.created_by,
      };

      const { data, error } = await supabase
        .from('budget_transactions')
        .insert(transactionData)
        .select()
        .single();

      if (error) {
        console.error('Error creating budget transaction:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      console.log('✅ Budget transaction created:', data.id);
      return NextResponse.json(data);
    }

    return NextResponse.json({ error: 'Invalid type parameter' }, { status: 400 });

  } catch (error: unknown) {
    console.error('POST budget error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to create budget data';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
