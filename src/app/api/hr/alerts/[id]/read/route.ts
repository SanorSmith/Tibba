/**
 * Mark Alert as Read API
 * PUT /api/hr/alerts/:id/read - Mark alert as read
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { successResponse, errorResponse } from '@/lib/api-response';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await requireAuth(request);
    if ('error' in authResult) {
      return NextResponse.json(errorResponse(authResult.error), { status: authResult.status });
    }

    const { user } = authResult;
    const { id } = params;

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get employee ID
    const { data: employee } = await supabase
      .from('employees')
      .select('id')
      .eq('email', user.email)
      .single();

    if (!employee) {
      return NextResponse.json(errorResponse('Employee not found'), { status: 404 });
    }

    // Verify alert belongs to user
    const { data: alert } = await supabase
      .from('alerts')
      .select('*')
      .eq('id', id)
      .eq('employee_id', employee.id)
      .single();

    if (!alert) {
      return NextResponse.json(errorResponse('Alert not found'), { status: 404 });
    }

    // Mark as read
    const { data: updated, error } = await supabase
      .from('alerts')
      .update({
        is_read: true,
        read_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating alert:', error);
      return NextResponse.json(errorResponse('Failed to mark alert as read'), { status: 500 });
    }

    return NextResponse.json(successResponse(updated));
  } catch (error: any) {
    console.error('PUT /api/hr/alerts/:id/read error:', error);
    return NextResponse.json(errorResponse(error.message || 'Internal server error'), { status: 500 });
  }
}
