/**
 * Shift Management API
 * GET /api/hr/shifts - List all shifts
 * POST /api/hr/shifts - Create shift definition
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { successResponse, errorResponse, paginationInfo } from '@/lib/api-response';
import { requireAuth, requireRoles, logAudit } from '@/lib/auth/middleware';
import { z } from 'zod';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const createShiftSchema = z.object({
  name: z.string().min(1, 'Shift name is required'),
  shift_type: z.enum(['day', 'night', 'evening', 'split']),
  start_time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/, 'Invalid time format (HH:MM)'),
  end_time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/, 'Invalid time format (HH:MM)'),
  differential_rate: z.number().min(0).max(1).default(0),
  description: z.string().optional(),
  is_active: z.boolean().default(true),
});

// GET /api/hr/shifts
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if ('error' in authResult) {
      return NextResponse.json(errorResponse(authResult.error), { status: authResult.status });
    }

    const { searchParams } = new URL(request.url);
    const shiftType = searchParams.get('shift_type');
    const isActive = searchParams.get('is_active');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    const supabase = createClient(supabaseUrl, supabaseKey);

    let query = supabase
      .from('shifts')
      .select('*', { count: 'exact' });

    if (shiftType) {
      query = query.eq('shift_type', shiftType);
    }

    if (isActive !== null) {
      query = query.eq('is_active', isActive === 'true');
    }

    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    query = query.order('shift_type').order('start_time');

    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching shifts:', error);
      return NextResponse.json(errorResponse('Failed to fetch shifts'), { status: 500 });
    }

    return NextResponse.json(
      successResponse(data, paginationInfo(page, limit, count || 0))
    );
  } catch (error: any) {
    console.error('GET /api/hr/shifts error:', error);
    return NextResponse.json(errorResponse(error.message || 'Internal server error'), { status: 500 });
  }
}

// POST /api/hr/shifts
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireRoles(request, ['hr_manager', 'admin']);
    if ('error' in authResult) {
      return NextResponse.json(errorResponse(authResult.error), { status: authResult.status });
    }

    const { user } = authResult;
    const body = await request.json();

    const validatedData = createShiftSchema.parse(body);

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get organization ID
    const { data: org } = await supabase
      .from('organizations')
      .select('id')
      .limit(1)
      .single();

    if (!org) {
      return NextResponse.json(errorResponse('Organization not found'), { status: 500 });
    }

    // Check for duplicate shift name
    const { data: existing } = await supabase
      .from('shifts')
      .select('id')
      .eq('organization_id', org.id)
      .eq('name', validatedData.name)
      .single();

    if (existing) {
      return NextResponse.json(
        errorResponse('Shift with this name already exists'),
        { status: 400 }
      );
    }

    // Create shift
    const shiftData = {
      ...validatedData,
      organization_id: org.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data: newShift, error } = await supabase
      .from('shifts')
      .insert(shiftData)
      .select()
      .single();

    if (error) {
      console.error('Error creating shift:', error);
      return NextResponse.json(errorResponse('Failed to create shift'), { status: 500 });
    }

    await logAudit({
      user_id: user.id,
      action: 'CREATE',
      entity_type: 'shift',
      entity_id: newShift.id,
      changes: shiftData,
    });

    return NextResponse.json(successResponse(newShift), { status: 201 });
  } catch (error: any) {
    console.error('POST /api/hr/shifts error:', error);

    if (error.name === 'ZodError') {
      return NextResponse.json(
        errorResponse(`Validation error: ${error.errors.map((e: any) => e.message).join(', ')}`),
        { status: 400 }
      );
    }

    return NextResponse.json(errorResponse(error.message || 'Internal server error'), { status: 500 });
  }
}
