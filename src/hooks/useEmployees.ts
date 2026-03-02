/**
 * Custom hook for fetching and managing employees
 */

import useSWR from 'swr';
import { useState } from 'react';

interface EmployeeFilters {
  department_id?: string;
  employment_status?: string;
  employment_type?: string;
  search?: string;
  page?: number;
  limit?: number;
}

interface Employee {
  id: string;
  employee_number: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  employment_status: string;
  employment_type: string;
  department_id?: string;
  departments?: {
    id: string;
    name: string;
    code: string;
  };
  [key: string]: any;
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

interface UseEmployeesReturn {
  employees: Employee[];
  pagination: PaginationInfo | null;
  loading: boolean;
  error: any;
  refresh: () => void;
  mutate: (data?: any) => Promise<any>;
}

const fetcher = async (url: string) => {
  const res = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    const error: any = new Error('Failed to fetch employees');
    error.status = res.status;
    error.info = await res.json();
    throw error;
  }

  return res.json();
};

export function useEmployees(filters: EmployeeFilters = {}): UseEmployeesReturn {
  const [queryParams, setQueryParams] = useState(filters);

  // Build query string
  const params = new URLSearchParams();
  if (queryParams.department_id) params.append('department_id', queryParams.department_id);
  if (queryParams.employment_status) params.append('employment_status', queryParams.employment_status);
  if (queryParams.employment_type) params.append('employment_type', queryParams.employment_type);
  if (queryParams.search) params.append('search', queryParams.search);
  if (queryParams.page) params.append('page', queryParams.page.toString());
  if (queryParams.limit) params.append('limit', queryParams.limit.toString());

  const queryString = params.toString();
  const url = `/api/hr/employees${queryString ? `?${queryString}` : ''}`;

  const { data, error, mutate, isValidating } = useSWR(url, fetcher, {
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
    dedupingInterval: 5 * 60 * 1000, // 5 minutes cache
    errorRetryCount: 3,
    errorRetryInterval: 1000,
    onErrorRetry: (error, key, config, revalidate, { retryCount }) => {
      // Exponential backoff
      setTimeout(() => revalidate({ retryCount }), Math.min(1000 * 2 ** retryCount, 10000));
    },
  });

  const refresh = () => {
    mutate();
  };

  return {
    employees: data?.data || [],
    pagination: data?.pagination || null,
    loading: !error && !data,
    error,
    refresh,
    mutate,
  };
}

/**
 * Hook for creating a new employee
 */
export function useCreateEmployee() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<any>(null);

  const createEmployee = async (employeeData: Partial<Employee>) => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/hr/employees', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(employeeData),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to create employee');
      }

      const result = await res.json();
      setLoading(false);
      return result.data;
    } catch (err: any) {
      setError(err);
      setLoading(false);
      throw err;
    }
  };

  return { createEmployee, loading, error };
}

/**
 * Hook for updating an employee
 */
export function useUpdateEmployee() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<any>(null);

  const updateEmployee = async (id: string, employeeData: Partial<Employee>) => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/hr/employees/${id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(employeeData),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to update employee');
      }

      const result = await res.json();
      setLoading(false);
      return result.data;
    } catch (err: any) {
      setError(err);
      setLoading(false);
      throw err;
    }
  };

  return { updateEmployee, loading, error };
}

/**
 * Hook for deleting an employee (soft delete)
 */
export function useDeleteEmployee() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<any>(null);

  const deleteEmployee = async (id: string) => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/hr/employees/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
          'Content-Type': 'application/json',
        },
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to delete employee');
      }

      const result = await res.json();
      setLoading(false);
      return result.data;
    } catch (err: any) {
      setError(err);
      setLoading(false);
      throw err;
    }
  };

  return { deleteEmployee, loading, error };
}
