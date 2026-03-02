// Job Categories Types
export interface JobCategory {
  id: string;
  code: string;
  title: string;
  title_ar?: string;
  description?: string;
  category: 'MEDICAL_STAFF' | 'NURSING' | 'ADMINISTRATIVE' | 'SUPPORT' | 'TECHNICAL';
  level: number; // 1=Junior, 2=Mid, 3=Senior, 4=Lead, 5=Manager
  department_id?: string;
  is_active: boolean;
  requirements?: JobRequirements;
  responsibilities?: string[];
  salary_range?: SalaryRange;
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
}

export interface JobRequirements {
  education?: string[];
  experience?: string;
  certifications?: string[];
  skills?: string[];
  languages?: string[];
}

export interface SalaryRange {
  min?: number;
  max?: number;
  average?: number;
  currency?: string;
}

export interface JobCategoryFormData {
  code: string;
  title: string;
  title_ar?: string;
  description?: string;
  category: 'MEDICAL_STAFF' | 'NURSING' | 'ADMINISTRATIVE' | 'SUPPORT' | 'TECHNICAL';
  level: number;
  department_id?: string;
  is_active: boolean;
  requirements?: JobRequirements;
  responsibilities?: string[];
  salary_range?: SalaryRange;
}

export interface JobCategoryFilter {
  category?: string;
  level?: number;
  department_id?: string;
  is_active?: boolean;
  search?: string;
  page?: number;
  limit?: number;
}

export interface JobCategoryListResponse {
  data: JobCategory[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Category options with labels
export const JOB_CATEGORY_OPTIONS = [
  { value: 'MEDICAL_STAFF', label: 'Medical Staff', label_ar: 'الطاقم الطبي' },
  { value: 'NURSING', label: 'Nursing', label_ar: 'التمريض' },
  { value: 'ADMINISTRATIVE', label: 'Administrative', label_ar: 'إداري' },
  { value: 'SUPPORT', label: 'Support Staff', label_ar: 'موظفو الدعم' },
  { value: 'TECHNICAL', label: 'Technical', label_ar: 'فني' },
];

// Level options with labels
export const JOB_LEVEL_OPTIONS = [
  { value: 1, label: 'Junior', label_ar: 'مبتدئ' },
  { value: 2, label: 'Mid-Level', label_ar: 'متوسط' },
  { value: 3, label: 'Senior', label_ar: 'أقدم' },
  { value: 4, label: 'Lead', label_ar: 'رئيس فريق' },
  { value: 5, label: 'Manager', label_ar: 'مدير' },
];
