/**
 * Zod Validation Schemas for HR APIs
 */

import { z } from 'zod';

// ============================================================================
// EMPLOYEE SCHEMAS
// ============================================================================

export const createEmployeeSchema = z.object({
  employee_number: z.string().min(1, 'Employee number is required'),
  first_name: z.string().min(1, 'First name is required'),
  middle_name: z.string().optional(),
  last_name: z.string().min(1, 'Last name is required'),
  first_name_ar: z.string().optional(),
  last_name_ar: z.string().optional(),
  date_of_birth: z.string().optional(),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER', 'UNKNOWN']).optional(),
  marital_status: z.string().optional(),
  nationality: z.string().default('Iraqi'),
  national_id: z.string().optional(),
  passport_number: z.string().optional(),
  department_id: z.string().uuid().optional(),
  job_title: z.string().optional(),
  employment_type: z.enum(['FULL_TIME', 'PART_TIME', 'CONTRACT']).optional(),
  employment_status: z.enum(['ACTIVE', 'ON_LEAVE', 'SUSPENDED', 'TERMINATED']).default('ACTIVE'),
  hire_date: z.string().optional(),
  salary_grade: z.string().optional(),
  base_salary: z.number().min(0).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  emergency_contact: z.object({
    name: z.string(),
    relationship: z.string(),
    phone: z.string(),
  }).optional(),
  address: z.any().optional(),
});

export const updateEmployeeSchema = createEmployeeSchema.partial();

export const employeeFilterSchema = z.object({
  department_id: z.string().uuid().optional(),
  employment_status: z.string().optional(),
  employment_type: z.string().optional(),
  search: z.string().optional(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
});

// ============================================================================
// JOB CATEGORY SCHEMAS
// ============================================================================

export const createJobCategorySchema = z.object({
  code: z.string().min(1, 'Code is required').max(20, 'Code must be less than 20 characters'),
  title: z.string().min(1, 'Title is required').max(100, 'Title must be less than 100 characters'),
  title_ar: z.string().max(100, 'Arabic title must be less than 100 characters').optional(),
  description: z.string().max(1000, 'Description must be less than 1000 characters').optional(),
  category: z.enum(['MEDICAL_STAFF', 'NURSING', 'ADMINISTRATIVE', 'SUPPORT', 'TECHNICAL']),
  level: z.number().int().min(1, 'Level must be between 1 and 5').max(5, 'Level must be between 1 and 5'),
  department_id: z.string().uuid().optional(),
  is_active: z.boolean().default(true),
  requirements: z.object({
    education: z.array(z.string()).optional(),
    experience: z.string().optional(),
    certifications: z.array(z.string()).optional(),
    skills: z.array(z.string()).optional(),
    languages: z.array(z.string()).optional(),
  }).optional(),
  responsibilities: z.array(z.string()).optional(),
  salary_range: z.object({
    min: z.number().min(0).optional(),
    max: z.number().min(0).optional(),
    average: z.number().min(0).optional(),
    currency: z.string().optional(),
  }).optional(),
});

export const updateJobCategorySchema = createJobCategorySchema.partial();

export const jobCategoryFilterSchema = z.object({
  category: z.enum(['MEDICAL_STAFF', 'NURSING', 'ADMINISTRATIVE', 'SUPPORT', 'TECHNICAL']).optional(),
  level: z.number().int().min(1).max(5).optional(),
  department_id: z.string().uuid().optional(),
  is_active: z.boolean().optional(),
  search: z.string().optional(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
});

// ============================================================================
// ATTENDANCE SCHEMAS
// ============================================================================

export const checkInSchema = z.object({
  employee_id: z.string().uuid('Invalid employee ID'),
  device_id: z.string().optional(),
  location: z.object({
    latitude: z.number().optional(),
    longitude: z.number().optional(),
    address: z.string().optional(),
  }).optional(),
  notes: z.string().optional(),
});

export const checkOutSchema = z.object({
  attendance_id: z.string().uuid('Invalid attendance ID'),
  device_id: z.string().optional(),
  location: z.object({
    latitude: z.number().optional(),
    longitude: z.number().optional(),
    address: z.string().optional(),
  }).optional(),
  notes: z.string().optional(),
});

export const attendanceFilterSchema = z.object({
  employee_id: z.string().uuid().optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  status: z.string().optional(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
});

export const updateAttendanceSchema = z.object({
  check_in: z.string().optional(),
  check_out: z.string().optional(),
  status: z.string().optional(),
  notes: z.string().optional(),
  correction_reason: z.string().min(1, 'Correction reason is required'),
});

// ============================================================================
// LEAVE SCHEMAS
// ============================================================================

export const createLeaveRequestSchema = z.object({
  employee_id: z.string().uuid('Invalid employee ID'),
  leave_type_id: z.string().uuid('Leave type is required').optional(),
  start_date: z.string().min(1, 'Start date is required'),
  end_date: z.string().min(1, 'End date is required'),
  total_days: z.number().min(0.5, 'Total days must be at least 0.5'),
  reason: z.string().optional(),
  supporting_document_url: z.string().url().optional().or(z.literal('')),
  contact_number: z.string().optional(),
});

export const leaveFilterSchema = z.object({
  employee_id: z.string().uuid().optional(),
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED']).optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  leave_type_id: z.string().uuid().optional(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
});

export const approveLeaveSchema = z.object({
  approver_id: z.string().uuid('Invalid approver ID'),
  remarks: z.string().optional(),
});

export const rejectLeaveSchema = z.object({
  rejected_by: z.string().uuid('Invalid user ID'),
  rejection_reason: z.string().min(1, 'Rejection reason is required'),
});

// ============================================================================
// PAYROLL SCHEMAS
// ============================================================================

export const payrollFilterSchema = z.object({
  period_id: z.string().uuid().optional(),
  employee_id: z.string().uuid().optional(),
  status: z.enum(['DRAFT', 'PENDING', 'APPROVED', 'PAID']).optional(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
});

export const calculatePayrollSchema = z.object({
  period_id: z.string().uuid('Period ID is required'),
  employee_ids: z.array(z.string().uuid()).optional(),
});

export const approvePayrollSchema = z.object({
  approved_by: z.string().uuid('Invalid approver ID'),
  remarks: z.string().optional(),
});

export const generatePayslipsSchema = z.object({
  period_id: z.string().uuid('Period ID is required'),
  employee_ids: z.array(z.string().uuid()).optional(),
  format: z.enum(['PDF', 'EMAIL']).default('PDF'),
});

// ============================================================================
// PAGINATION SCHEMA
// ============================================================================

export const paginationSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
});

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>;
export type UpdateEmployeeInput = z.infer<typeof updateEmployeeSchema>;
export type EmployeeFilter = z.infer<typeof employeeFilterSchema>;

export type CheckInInput = z.infer<typeof checkInSchema>;
export type CheckOutInput = z.infer<typeof checkOutSchema>;
export type AttendanceFilter = z.infer<typeof attendanceFilterSchema>;
export type UpdateAttendanceInput = z.infer<typeof updateAttendanceSchema>;

export type CreateLeaveRequestInput = z.infer<typeof createLeaveRequestSchema>;
export type LeaveFilter = z.infer<typeof leaveFilterSchema>;
export type ApproveLeaveInput = z.infer<typeof approveLeaveSchema>;
export type RejectLeaveInput = z.infer<typeof rejectLeaveSchema>;

export type PayrollFilter = z.infer<typeof payrollFilterSchema>;
export type CalculatePayrollInput = z.infer<typeof calculatePayrollSchema>;
export type ApprovePayrollInput = z.infer<typeof approvePayrollSchema>;
export type GeneratePayslipsInput = z.infer<typeof generatePayslipsSchema>;
