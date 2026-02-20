export interface Service {
  id: string;
  name: string;
  category: string;
  specialty: string;
  duration: number;
  price: {
    insurance: number;
    selfPay: number;
    government: number;
  };
  cptCode: string;
  icd10Code: string;
  description: string;
  status: 'active' | 'inactive';
  requiresAppointment: boolean;
  equipmentNeeded: string[];
  suppliesNeeded: string[];
  staffRequired: {
    [key: string]: number;
  };
  provider_id?: string;
  provider_name?: string;
  service_fee?: number;
}

export interface ServiceProvider {
  id: string;
  name: string;
  contact?: string;
  phone?: string;
  email?: string;
}

export interface ServicePayment {
  id: string;
  service_id: string;
  service_name: string;
  provider_id: string;
  provider_name: string;
  invoice_id: string;
  invoice_number: string;
  patient_name: string;
  invoice_date: string;
  service_fee: number;
  quantity: number;
  total_fee: number;
  payment_status: 'PENDING' | 'PAID';
  payment_date?: string;
  payment_batch_id?: string;
}
