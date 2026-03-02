/**
 * Shift Scheduling API
 * GET /api/hr/shift-schedules - Get shift schedules with filters
 * POST /api/hr/shift-schedules - Assign employee to shift for date range
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { successResponse, errorResponse, paginationInfo } from '@/lib/api-response';
import { requireAuth, requireRoles, logAudit } from '@/lib/auth/middleware';
import { z } from 'zod';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const createScheduleSchema = z.object({
  employee_id: z.string().uuid('Invalid employee ID'),
  shift_id: z.string().uuid('Invalid shift ID'),
  start_date: z.string().min(1, 'Start date is required'),
  end_date: z.string().min(1, 'End date is required'),
  notes: z.string().optional(),
});

const scheduleFilterSchema = z.object({
  employee_id: z.string().uuid().optional(),
  shift_id: z.string().uuid().optional(),
  shift_type: z.enum(['day', 'night', 'evening', 'split']).optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  status: z.enum(['scheduled', 'completed', 'cancelled', 'no_show']).optional(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(50),
});

// GET /api/hr/shift-schedules
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if ('error' in authResult) {
      return NextResponse.json(errorResponse(authResult.error), { status: authResult.status });
    }

    const { searchParams } = new URL(request.url);

    const filters = scheduleFilterSchema.parse({
      employee_id: searchParams.get('employee_id') || undefined,
      shift_id: searchParams.get('shift_id') || undefined,
      shift_type: searchParams.get('shift_type') as any || undefined,
      start_date: searchParams.get('start_date') || undefined,
      end_date: searchParams.get('end_date') || undefined,
      status: searchParams.get('status') as any || undefined,
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '50'),
    });

    const supabase = createClient(supabaseUrl, supabaseKey);

    let query = supabase
      .from('shift_schedules')
      .select(`
        *,
        employees(id, employee_number, first_name, last_name, departments(name)),
        shifts(id, name, shift_type, start_time, end_time, differential_rate)
      `, { count: 'exact' });

    if (filters.employee_id) {
      query = query.eq('employee_id', filters.employee_id);
    }

    if (filters.shift_id) {
      query = query.eq('shift_id', filters.shift_id);
    }

    if (filters.start_date) {
      query = query.gte('schedule_date', filters.start_date);
    }

    if (filters.end_date) {
      query = query.lte('schedule_date', filters.end_date);
    }

    if (filters.status) {
      query = query.eq('status', filters.status);
    }

    // Filter by shift_type through the shifts table
    if (filters.shift_type) {
      query = query.eq('shifts.shift_type', filters.shift_type);
    }

    const from = (filters.page - 1) * filters.limit;
    const to = from + filters.limit - 1;
    query = query.range(from, to);

    query = query.order('schedule_date', { ascending: false });

    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching shift schedules:', error);
      return NextResponse.json(errorResponse('Failed to fetch shift schedules'), { status: 500 });
    }

    return NextResponse.json(
      successResponse(data, paginationInfo(filters.page, filters.limit, count || 0))
    );
  } catch (error: any) {
    console.error('GET /api/hr/shift-schedules error:', error);

    if (error.name === 'ZodError') {
      return NextResponse.json(
        errorResponse(`Validation error: ${error.errors.map((e: any) => e.message).join(', ')}`),
        { status: 400 }
      );
    }

    return NextResponse.json(errorResponse(error.message || 'Internal server error'), { status: 500 });
  }
}

// POST /api/hr/shift-schedules
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireRoles(request, ['hr_manager', 'admin', 'supervisor']);
    if ('error' in authResult) {
      return NextResponse.json(errorResponse(authResult.error), { status: authResult.status });
    }

    const { user } = authResult;
    const body = await request.json();

    const validatedData = createScheduleSchema.parse(body);

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Validate employee exists
    const { data: employee, error: empError } = await supabase
      .from('employees')
      .select('id, organization_id')
      .eq('id', validatedData.employee_id)
      .single();

    if (empError || !employee) {
      return NextResponse.json(errorResponse('Employee not found'), { status: 404 });
    }

    // Validate shift exists
    const { data: shift, error: shiftError } = await supabase
      .from('shifts')
      .select('*')
      .eq('id', validatedData.shift_id)
      .single();

    if (shiftError || !shift) {
      return NextResponse.json(errorResponse('Shift not found'), { status: 404 });
    }

    // Validate dates
    const startDate = new Date(validatedData.start_date);
    const endDate = new Date(validatedData.end_date);

    if (endDate < startDate) {
      return NextResponse.json(
        errorResponse('End date must be after start date'),
        { status: 400 }
      );
    }

    // Generate schedules for date range
    const schedules = [];
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split('T')[0];

      // Check for existing schedule on this date
      const { data: existing } = await supabase
        .from('shift_schedules')
        .select('id')
        .eq('employee_id', validatedData.employee_id)
        .eq('schedule_date', dateStr)
        .single();

      if (!existing) {
        schedules.push({
          organization_id: employee.organization_id,
          employee_id: validatedData.employee_id,
          shift_id: validatedData.shift_id,
          schedule_date: dateStr,
          start_time: shift.start_time,
          end_time: shift.end_time,
          status: 'scheduled',
          notes: validatedData.notes || null,
          created_by: user.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    if (schedules.length === 0) {
      return NextResponse.json(
        errorResponse('All dates in range already have schedules'),
        { status: 400 }
      );
    }

    // Insert schedules
    const { data: newSchedules, error } = await supabase
      .from('shift_schedules')
      .insert(schedules)
      .select(`
        *,
        employees(id, employee_number, first_name, last_name),
        shifts(id, name, shift_type)
      `);

    if (error) {
      console.error('Error creating shift schedules:', error);
      return NextResponse.json(errorResponse('Failed to create shift schedules'), { status: 500 });
    }

    await logAudit({
      user_id: user.id,
      action: 'CREATE',
      entity_type: 'shift_schedule',
      entity_id: newSchedules[0]?.id || 'bulk',
      changes: {
        employee_id: validatedData.employee_id,
        shift_id: validatedData.shift_id,
        date_range: `${validatedData.start_date} to ${validatedData.end_date}`,
        count: schedules.length,
      },
    });

    return NextResponse.json(
      successResponse({
        schedules: newSchedules,
        count: schedules.length,
        message: `Created ${schedules.length} shift schedule(s)`,
      }),
      { status: 201 }
    );
  } catch (error: any) {
    console.error('POST /api/hr/shift-schedules error:', error);

    if (error.name === 'ZodError') {
      return NextResponse.json(
        errorResponse(`Validation error: ${error.errors.map((e: any) => e.message).join(', ')}`),
        { status: 400 }
      );
    }

    return NextResponse.json(errorResponse(error.message || 'Internal server error'), { status: 500 });
  }
}
