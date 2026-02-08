export const APP_NAME = 'Tibbna-EHR';
export const APP_DESCRIPTION = 'Hospital Management System';

export const ROUTES = {
  LOGIN: '/login',
  DASHBOARD: '/dashboard',
  SERVICES: '/services',
  INVENTORY: '/inventory',
  FINANCE: '/finance',
  INSURANCE: '/insurance',
  HR: '/hr',
  BILLING: '/billing',
  PATIENTS: '/patients',
  APPOINTMENTS: '/appointments',
  STAFF: '/staff',
  LABORATORIES: '/laboratories',
  PHARMACIES: '/pharmacies',
  DEPARTMENTS: '/departments',
} as const;

export const STATUS_COLORS = {
  active: 'bg-success-100 text-success-700 border-success-200',
  inactive: 'bg-secondary-100 text-secondary-700 border-secondary-200',
  pending: 'bg-warning-100 text-warning-700 border-warning-200',
  approved: 'bg-success-100 text-success-700 border-success-200',
  denied: 'bg-error-100 text-error-700 border-error-200',
  completed: 'bg-success-100 text-success-700 border-success-200',
  paid: 'bg-success-100 text-success-700 border-success-200',
  partial: 'bg-warning-100 text-warning-700 border-warning-200',
  overdue: 'bg-error-100 text-error-700 border-error-200',
  'in-stock': 'bg-success-100 text-success-700 border-success-200',
  'low-stock': 'bg-warning-100 text-warning-700 border-warning-200',
  'out-of-stock': 'bg-error-100 text-error-700 border-error-200',
} as const;
