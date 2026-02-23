// =============================================================================
// RECEPTION MODULE TYPES
// =============================================================================

export interface ReceptionUser {
  id: string;
  username: string;
  full_name: string;
  role: 'RECEPTIONIST' | 'RECEPTION_MANAGER';
  permissions: string[];
  is_active: boolean;
  created_at: string;
  last_login?: string;
}

export interface ReceptionPatient {
  patient_id: string;
  patient_number: string; // P-2024-00001
  first_name_ar: string;
  first_name_en?: string;
  middle_name?: string;
  last_name_ar: string;
  last_name_en?: string;
  full_name_ar: string;
  full_name_en?: string;
  date_of_birth: string;
  gender: 'MALE' | 'FEMALE';
  blood_group?: string;
  national_id?: string;
  phone: string;
  mobile?: string;
  email?: string;
  governorate?: string;
  district?: string;
  neighborhood?: string;
  emergency_contact_name_ar?: string;
  emergency_contact_phone?: string;
  emergency_contact_relationship_ar?: string;
  medical_history?: string;
  total_balance: number;
  is_active: boolean;
  created_at: string;
}

export interface ReceptionInvoice {
  invoice_id: string;
  invoice_number: string; // INV-2024-00001
  invoice_date: string;
  patient_id: string;
  patient_name_ar: string;
  patient_name_en?: string;
  subtotal: number;
  discount_percentage: number;
  discount_amount: number;
  total_amount: number;
  amount_paid: number;
  balance_due: number;
  status: 'PENDING' | 'PAID' | 'PARTIALLY_PAID' | 'CANCELLED';
  payment_method?: 'CASH' | 'CARD' | 'BANK_TRANSFER';
  payment_date?: string;
  payment_reference?: string;
  created_by: string;
  created_at: string;
  notes?: string;
}

export interface ConsultationService {
  service_id: string;
  service_code: string;
  service_name_ar: string;
  service_name_en?: string;
  service_category: 'CONSULTATION' | 'EXAMINATION' | 'LAB_TEST' | 'RADIOLOGY' | 'PROCEDURE';
  base_price: number;
  currency: 'IQD' | 'USD';
  description_ar?: string;
  duration_minutes?: number;
  is_active: boolean;
}

export interface ConsultationBooking {
  booking_id: string;
  booking_number: string; // BK-2024-00001
  patient_id: string;
  patient_name_ar: string;
  service_id: string;
  service_name_ar: string;
  booking_date: string;
  booking_time: string;
  status: 'SCHEDULED' | 'CHECKED_IN' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
  consultation_fee: number;
  amount_paid: number;
  balance_due: number;
  notes?: string;
  created_by: string;
  created_at: string;
}

export interface PaymentTransaction {
  transaction_id: string;
  transaction_number: string; // TXN-2024-00001
  invoice_id?: string;
  booking_id?: string;
  patient_id: string;
  patient_name_ar: string;
  amount: number;
  payment_method: 'CASH' | 'CARD' | 'BANK_TRANSFER';
  payment_status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED';
  transaction_date: string;
  reference_number?: string;
  notes?: string;
  created_by: string;
  created_at: string;
}

export interface ReceptionStats {
  total_patients: number;
  total_invoices: number;
  total_bookings: number;
  total_revenue: number;
  today_bookings: number;
  today_revenue: number;
  pending_payments: number;
}
