'use server';

import { supabaseAdmin } from '@/lib/supabase/server';
import { getSession } from '@/lib/supabase/auth';
import { revalidatePath } from 'next/cache';

export async function getEmployees() {
  try {
    const session = await getSession();
    if (!session) throw new Error('Unauthorized');

    const { data, error } = await supabaseAdmin
      .from('employees')
      .select(`
        *,
        department:departments!employees_department_id_fkey(id, name, code)
      `)
      .eq('organization_id', session.organizationId)
      .eq('active', true)
      .order('employee_number');

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error fetching employees:', error);
    return { success: false, error: 'Failed to fetch employees', data: [] };
  }
}

export async function getEmployeeById(id: string) {
  try {
    const session = await getSession();
    if (!session) throw new Error('Unauthorized');

    const { data, error } = await supabaseAdmin
      .from('employees')
      .select(`
        *,
        department:departments!employees_department_id_fkey(id, name, code),
        organization:organizations(id, name)
      `)
      .eq('id', id)
      .eq('organization_id', session.organizationId)
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error fetching employee:', error);
    return { success: false, error: 'Employee not found', data: null };
  }
}

export async function createEmployee(employeeData: any) {
  try {
    const session = await getSession();
    if (!session) throw new Error('Unauthorized');

    const { data, error } = await supabaseAdmin
      .from('employees')
      .insert({
        ...employeeData,
        organization_id: session.organizationId,
      })
      .select()
      .single();

    if (error) throw error;

    revalidatePath('/hr/employees');

    return { success: true, data };
  } catch (error) {
    console.error('Error creating employee:', error);
    return { success: false, error: 'Failed to create employee', data: null };
  }
}

export async function updateEmployee(id: string, employeeData: any) {
  try {
    const session = await getSession();
    if (!session) throw new Error('Unauthorized');

    const { data, error } = await supabaseAdmin
      .from('employees')
      .update(employeeData)
      .eq('id', id)
      .eq('organization_id', session.organizationId)
      .select()
      .single();

    if (error) throw error;

    revalidatePath('/hr/employees');
    revalidatePath(`/hr/employees/${id}`);

    return { success: true, data };
  } catch (error) {
    console.error('Error updating employee:', error);
    return { success: false, error: 'Failed to update employee', data: null };
  }
}

export async function deleteEmployee(id: string) {
  try {
    const session = await getSession();
    if (!session) throw new Error('Unauthorized');

    const { error } = await supabaseAdmin
      .from('employees')
      .update({ active: false })
      .eq('id', id)
      .eq('organization_id', session.organizationId);

    if (error) throw error;

    revalidatePath('/hr/employees');

    return { success: true };
  } catch (error) {
    console.error('Error deleting employee:', error);
    return { success: false, error: 'Failed to delete employee' };
  }
}
