/**
 * Job Categories API - CRUD Operations
 * GET /api/hr/job-categories - List job categories with pagination and filtering
 * POST /api/hr/job-categories - Create new job category
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { successResponse, errorResponse, paginationInfo } from '@/lib/api-response';
import { createJobCategorySchema, jobCategoryFilterSchema } from '@/lib/validations/hr-schemas';
import { requireAuth, requireRoles, logAudit } from '@/lib/auth/middleware';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// GET /api/hr/job-categories - List job categories
export async function GET(request: NextRequest) {
  try {
    // Require authentication
    const authResult = await requireAuth(request);
    if ('error' in authResult) {
      return NextResponse.json(errorResponse(authResult.error), { status: authResult.status });
    }

    const { user } = authResult;
    const { searchParams } = new URL(request.url);

    // Parse and validate query parameters
    const filters = jobCategoryFilterSchema.parse({
      category: searchParams.get('category') || undefined,
      level: searchParams.get('level') ? parseInt(searchParams.get('level')!) : undefined,
      department_id: searchParams.get('department_id') || undefined,
      is_active: searchParams.get('is_active') ? searchParams.get('is_active') === 'true' : undefined,
      search: searchParams.get('search') || undefined,
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '20'),
    });

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Build query
    let query = supabase
      .from('job_categories')
      .select('*, departments(id, name, code)', { count: 'exact' });

    // Apply filters
    if (filters.category) {
      query = query.eq('category', filters.category);
    }
    if (filters.level) {
      query = query.eq('level', filters.level);
    }
    if (filters.department_id) {
      query = query.eq('department_id', filters.department_id);
    }
    if (filters.is_active !== undefined) {
      query = query.eq('is_active', filters.is_active);
    }
    if (filters.search) {
      query = query.or(`title.ilike.%${filters.search}%,code.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
    }

    // Apply pagination and ordering
    const from = (filters.page! - 1) * filters.limit!;
    const to = from + filters.limit! - 1;

    query = query
      .order('category')
      .order('level')
      .order('title')
      .range(from, to);

    const { data: jobCategories, error, count } = await query;

    if (error) {
      console.error('Job categories fetch error:', error);
      return NextResponse.json(errorResponse('Failed to fetch job categories'), { status: 500 });
    }

    const pagination = paginationInfo(filters.page!, filters.limit!, count || 0);

    return NextResponse.json(successResponse({
      jobCategories,
      pagination,
    }));

  } catch (error) {
    console.error('Job categories API error:', error);
    return NextResponse.json(errorResponse('Internal server error'), { status: 500 });
  }
}

// POST /api/hr/job-categories - Create new job category
export async function POST(request: NextRequest) {
  try {
    // Require authentication and HR role
    const authResult = await requireAuth(request);
    if ('error' in authResult) {
      return NextResponse.json(errorResponse(authResult.error), { status: authResult.status });
    }

    const roleCheck = await requireRoles(request, ['admin', 'hr_manager']);
    if ('error' in roleCheck) {
      return NextResponse.json(errorResponse(roleCheck.error), { status: roleCheck.status });
    }

    const { user } = authResult;
    const body = await request.json();

    // Validate request body
    const validatedData = createJobCategorySchema.parse(body);

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check if code already exists
    const { data: existingCategory } = await supabase
      .from('job_categories')
      .select('id')
      .eq('code', validatedData.code)
      .single();

    if (existingCategory) {
      return NextResponse.json(errorResponse('Job category with this code already exists'), { status: 409 });
    }

    // Create job category
    const { data: jobCategory, error } = await supabase
      .from('job_categories')
      .insert({
        ...validatedData,
        created_by: user.id,
        updated_by: user.id,
      })
      .select()
      .single();

    if (error) {
      console.error('Job category creation error:', error);
      return NextResponse.json(errorResponse('Failed to create job category'), { status: 500 });
    }

    // Log audit
    await logAudit({
      user_id: user.id,
      action: 'CREATE',
      entity_type: 'job_categories',
      entity_id: jobCategory.id,
      changes: {
        code: jobCategory.code,
        title: jobCategory.title,
      }
    });

    return NextResponse.json(successResponse(jobCategory, 'Job category created successfully'), { status: 201 });

  } catch (error) {
    console.error('Job category creation API error:', error);
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(errorResponse('Invalid request data'), { status: 400 });
    }
    return NextResponse.json(errorResponse('Internal server error'), { status: 500 });
  }
}
