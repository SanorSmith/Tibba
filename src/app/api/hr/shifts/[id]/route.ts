/**
 * Single Shift API
 * GET /api/hr/shifts/:id - Get single shift
 * PUT /api/hr/shifts/:id - Update shift
 * DELETE /api/hr/shifts/:id - Delete shift
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { successResponse, errorResponse } from '@/lib/api-response';
import { requireAuth, requireRoles, logAudit } from '@/lib/auth/middleware';
import { z } from 'zod';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const updateShiftSchema = z.object({
  name: z.string().min(1).optional(),
  shift_type: z.enum(['day', 'night', 'evening', 'split']).optional(),
  start_time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/).optional(),
  end_time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/).optional(),
  differential_rate: z.number().min(0).max(1).optional(),
  description: z.string().optional(),
  is_active: z.boolean().optional(),
});

// GET /api/hr/shifts/:id
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await requireAuth(request);
    if ('error' in authResult) {
      return NextResponse.json(errorResponse(authResult.error), { status: authResult.status });
    }

    const { id } = params;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data, error } = await supabase
      .from('shifts')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      return NextResponse.json(errorResponse('Shift not found'), { status: 404 });
    }

    return NextResponse.json(successResponse(data));
  } catch (error: any) {
    console.error('GET /api/hr/shifts/:id error:', error);
    return NextResponse.json(errorResponse(error.message || 'Internal server error'), { status: 500 });
  }
}

// PUT /api/hr/shifts/:id
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await requireRoles(request, ['hr_manager', 'admin']);
    if ('error' in authResult) {
      return NextResponse.json(errorResponse(authResult.error), { status: authResult.status });
    }

    const { user } = authResult;
    const { id } = params;
    const body = await request.json();

    const validatedData = updateShiftSchema.parse(body);

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: existing } = await supabase
      .from('shifts')
      .select('*')
      .eq('id', id)
      .single();

    if (!existing) {
      return NextResponse.json(errorResponse('Shift not found'), { status: 404 });
    }

    const updateData = {
      ...validatedData,
      updated_at: new Date().toISOString(),
    };

    const { data: updated, error } = await supabase
      .from('shifts')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating shift:', error);
      return NextResponse.json(errorResponse('Failed to update shift'), { status: 500 });
    }

    await logAudit({
      user_id: user.id,
      action: 'UPDATE',
      entity_type: 'shift',
      entity_id: id,
      changes: { before: existing, after: updated },
    });

    return NextResponse.json(successResponse(updated));
  } catch (error: any) {
    console.error('PUT /api/hr/shifts/:id error:', error);

    if (error.name === 'ZodError') {
      return NextResponse.json(
        errorResponse(`Validation error: ${error.errors.map((e: any) => e.message).join(', ')}`),
        { status: 400 }
      );
    }

    return NextResponse.json(errorResponse(error.message || 'Internal server error'), { status: 500 });
  }
}

// DELETE /api/hr/shifts/:id
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await requireRoles(request, ['hr_manager', 'admin']);
    if ('error' in authResult) {
      return NextResponse.json(errorResponse(authResult.error), { status: authResult.status });
    }

    const { user } = authResult;
    const { id } = params;

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: existing } = await supabase
      .from('shifts')
      .select('*')
      .eq('id', id)
      .single();

    if (!existing) {
      return NextResponse.json(errorResponse('Shift not found'), { status: 404 });
    }

    // Check if shift is being used in schedules
    const { data: schedules } = await supabase
      .from('shift_schedules')
      .select('id')
      .eq('shift_id', id)
      .limit(1);

    if (schedules && schedules.length > 0) {
      return NextResponse.json(
        errorResponse('Cannot delete shift that is being used in schedules. Deactivate it instead.'),
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('shifts')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting shift:', error);
      return NextResponse.json(errorResponse('Failed to delete shift'), { status: 500 });
    }

    await logAudit({
      user_id: user.id,
      action: 'DELETE',
      entity_type: 'shift',
      entity_id: id,
      changes: { deleted: existing },
    });

    return NextResponse.json(successResponse({ message: 'Shift deleted successfully' }));
  } catch (error: any) {
    console.error('DELETE /api/hr/shifts/:id error:', error);
    return NextResponse.json(errorResponse(error.message || 'Internal server error'), { status: 500 });
  }
}
