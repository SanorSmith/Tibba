import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';

const DEFAULT_ORG_ID = '00000000-0000-0000-0000-000000000001';

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('departments')
      .select('id, name, code, type')
      .eq('organization_id', DEFAULT_ORG_ID)
      .eq('active', true)
      .order('name');

    if (error) {
      console.error('Database error fetching departments:', error);
      throw error;
    }

    return NextResponse.json({ success: true, data: data || [] });
  } catch (error) {
    console.error('Error fetching departments:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch departments', data: [] },
      { status: 500 }
    );
  }
}
