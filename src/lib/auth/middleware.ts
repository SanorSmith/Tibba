/**
 * Authentication and Authorization Middleware
 */

import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export type UserRole = 'employee' | 'supervisor' | 'hr_manager' | 'admin';

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  employee_id?: string;
}

/**
 * Extract user from request headers
 */
export async function getUserFromRequest(request: NextRequest): Promise<AuthUser | null> {
  try {
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }

    const token = authHeader.substring(7);
    
    // Verify token with Supabase
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return null;
    }

    // Get user role from user metadata or database
    const role = (user.user_metadata?.role as UserRole) || 'employee';
    const employee_id = user.user_metadata?.employee_id;

    return {
      id: user.id,
      email: user.email!,
      role,
      employee_id,
    };
  } catch (error) {
    console.error('Auth error:', error);
    return null;
  }
}

/**
 * Check if user has required role
 */
export function hasRole(user: AuthUser, requiredRoles: UserRole[]): boolean {
  return requiredRoles.includes(user.role);
}

/**
 * Check if user can access employee data
 */
export function canAccessEmployee(user: AuthUser, employeeId: string): boolean {
  // Admin and HR managers can access all employees
  if (user.role === 'admin' || user.role === 'hr_manager') {
    return true;
  }

  // Employees can only access their own data
  if (user.role === 'employee') {
    return user.employee_id === employeeId;
  }

  // Supervisors can access their team members (would need to check department)
  if (user.role === 'supervisor') {
    // TODO: Implement department-based access control
    return true;
  }

  return false;
}

/**
 * Require authentication
 */
export async function requireAuth(request: NextRequest): Promise<{ user: AuthUser } | { error: string; status: number }> {
  const user = await getUserFromRequest(request);

  if (!user) {
    return {
      error: 'Unauthorized - Please login',
      status: 401,
    };
  }

  return { user };
}

/**
 * Require specific roles
 */
export async function requireRoles(
  request: NextRequest,
  roles: UserRole[]
): Promise<{ user: AuthUser } | { error: string; status: number }> {
  const authResult = await requireAuth(request);

  if ('error' in authResult) {
    return authResult;
  }

  if (!hasRole(authResult.user, roles)) {
    return {
      error: 'Forbidden - Insufficient permissions',
      status: 403,
    };
  }

  return authResult;
}

/**
 * Log audit trail
 */
export async function logAudit(params: {
  user_id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  changes?: any;
}) {
  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    await supabase.from('audit_logs').insert({
      user_id: params.user_id,
      action: params.action,
      entity_type: params.entity_type,
      entity_id: params.entity_id,
      changes: params.changes,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Audit log error:', error);
    // Don't fail the request if audit logging fails
  }
}
