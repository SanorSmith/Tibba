// =============================================================================
// FINANCE MODULE TYPES
// =============================================================================

// ============= SHARED =============

export type Currency = 'IQD' | 'USD';

export interface ArabicEnglish {
  ar: string;
  en?: string;
}

// ============= PATIENTS (FINANCE) =============

export interface FinancePatient {
  patient_id: string;
  patient_number: string; // P-2024-00001
  first_name_ar: string;
  first_name_en?: string;
  last_name_ar: string;
  last_name_en?: string;
  full_name_ar: string;
  full_name_en?: string;
  date_of_birth: string;
  gender: 'MALE' | 'FEMALE';
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
  total_balance: number;
  is_active: boolean;
  created_at: string;
}

// ============= INSURANCE =============

export type InsuranceProviderType = 'PRIVATE_INSURANCE' | 'GOVERNMENT' | 'MOH';
export type SupportFrequency = 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'SEMI_ANNUAL' | 'ANNUAL';
export type InsuranceStatus = 'ACTIVE' | 'EXPIRED' | 'SUSPENDED' | 'CANCELLED';
export type CoverageType = 'FULL' | 'PARTIAL' | 'SPECIFIC_SERVICES';

export interface InsuranceProvider {
  provider_id: string;
  provider_code: string;
  provider_name_ar: string;
  provider_name_en?: string;
  provider_type: InsuranceProviderType;
  phone?: string;
  email?: string;
  address_ar?: string;
  support_frequency?: SupportFrequency;
  total_annual_budget?: number;
  price?: number;
  is_active: boolean;
  created_at: string;
}

export interface PatientInsurance {
  insurance_id: string;
  patient_id: string;
  provider_id: string;
  policy_number: string;
  policy_start_date: string;
  policy_end_date?: string;
  coverage_type: CoverageType;
  coverage_percentage: number;
  coverage_amount_limit?: number;
  coverage_amount_used: number;
  covered_services?: string[];
  exclusions?: string;
  status: InsuranceStatus;
  is_primary: boolean;
  created_at: string;
}

// ============= STAKEHOLDERS (REVENUE SHARING) =============

export type StakeholderRole =
  | 'HOSPITAL'
  | 'DOCTOR'
  | 'NURSE'
  | 'ANESTHESIOLOGIST'
  | 'LAB_TECHNICIAN'
  | 'PHARMACIST'
  | 'OUTSOURCE_DOCTOR'
  | 'OTHER_HEALTHCARE_WORKER';

export type ShareType = 'PERCENTAGE' | 'FIXED_AMOUNT';

export interface Stakeholder {
  stakeholder_id: string;
  stakeholder_code: string; // SH-2024-00001
  name_ar: string;
  name_en?: string;
  role: StakeholderRole;
  specialty_ar?: string;
  specialty_en?: string;
  phone?: string;
  mobile: string;
  email?: string;
  department_id?: string;
  license_number?: string;
  license_expiry_date?: string;
  bank_name_ar?: string;
  account_number?: string;
  iban?: string;
  service_type?: string; // Type of service provided by stakeholder
  default_share_type: ShareType;
  default_share_percentage?: number;
  default_share_amount?: number;
  is_active: boolean;
  created_at: string;
}

// ============= SERVICE PAYMENTS =============

export type ServicePaymentMethod = 'BANK_TRANSFER' | 'CASH' | 'CHECK';
export type ServicePaymentStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'CANCELLED';

export interface ServiceBalanceSheet {
  id: string;
  service_provider_id: string;
  service_type: string;
  total_earned: number;
  total_paid: number;
  balance_due: number;
  last_payment_date?: string;
  created_at: string;
  updated_at: string;
}

export interface ServiceInvoiceItem {
  id: string;
  invoice_id: string;
  service_provider_id: string;
  service_type: string;
  service_name: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
  service_fee: number; // Fee charged by service provider
  hospital_earnings: number; // What hospital keeps
  is_paid: boolean;
  payment_id?: string;
  invoice_date: string;
  patient_name: string;
  patient_id?: string;
  created_at: string;
}

export interface ServicePayment {
  id: string;
  payment_number: string; // SP-2024-001 format
  service_provider_id: string;
  total_amount: number;
  payment_date: string;
  payment_method: ServicePaymentMethod;
  status: ServicePaymentStatus;
  notes?: string;
  processed_by?: string;
  processed_at?: string;
  created_at: string;
  updated_at: string;
}

// ============= MEDICAL SERVICES =============

export type ServiceCategory =
  | 'CONSULTATION'
  | 'SURGERY'
  | 'EXAMINATION'
  | 'LAB_TEST'
  | 'RADIOLOGY'
  | 'PHARMACY'
  | 'TELEMEDICINE'
  | 'PROCEDURE';

export interface MedicalService {
  service_id: string;
  service_code: string;
  service_name_ar: string;
  service_name_en?: string;
  service_category: ServiceCategory;
  base_price: number;
  currency: Currency;
  description_ar?: string;
  duration_minutes?: number;
  covered_by_insurance: boolean;
  insurance_coverage_percentage?: number;
  department_id?: string;
  is_active: boolean;
  created_at: string;
}

export interface ServiceShareTemplate {
  template_id: string;
  service_id: string;
  stakeholder_id: string;
  share_type: ShareType;
  share_percentage?: number;
  share_amount?: number;
  display_order: number;
}

// ============= INVOICES =============

export type InvoiceStatus =
  | 'PENDING'
  | 'PAID'
  | 'PARTIALLY_PAID'
  | 'UNPAID'
  | 'CANCELLED'
  | 'REFUNDED';

export type PaymentMethod = 'CASH' | 'CARD' | 'BANK_TRANSFER';

export type ResponsibleEntityType = 'PATIENT' | 'INSURANCE' | 'GOVERNMENT' | 'EMPLOYER';

export interface MedicalInvoice {
  invoice_id: string;
  invoice_number: string; // INV-2024-00001
  invoice_date: string;
  patient_id: string;
  patient_name_ar: string;
  subtotal: number;
  discount_percentage: number;
  discount_amount: number;
  total_amount: number;
  insurance_provider_id?: string;
  insurance_coverage_amount: number;
  insurance_coverage_percentage: number;
  patient_responsibility: number;
  status: InvoiceStatus;
  amount_paid: number;
  balance_due: number;
  payment_method?: PaymentMethod;
  payment_date?: string;
  payment_reference?: string;
  responsible_entity_type?: ResponsibleEntityType;
  responsible_entity_id?: string;
  notes?: string;
  created_at: string;
  created_by?: string;
}

export interface InvoiceItem {
  item_id: string;
  invoice_id: string;
  service_id: string;
  service_name_ar: string;
  service_name_en?: string;
  service_category?: ServiceCategory;
  quantity: number;
  unit_price: number;
  line_total: number;
  service_provider_id?: string;
  department_id?: string;
  notes?: string;
}

export interface InvoiceShare {
  share_id: string;
  invoice_id: string;
  invoice_item_id?: string;
  stakeholder_id: string;
  stakeholder_name_ar: string;
  stakeholder_role: StakeholderRole;
  share_type: ShareType;
  share_percentage?: number;
  share_amount: number;
  payment_status: 'PENDING' | 'PAID' | 'PARTIALLY_PAID';
  amount_paid: number;
  payment_date?: string;
  notes?: string;
}

// ============= RETURNS & REFUNDS =============

export type RefundMethod = 'CASH' | 'BANK_TRANSFER' | 'CREDIT_TO_ACCOUNT';
export type RefundStatus = 'PENDING' | 'APPROVED' | 'PROCESSED' | 'REJECTED';

export interface InvoiceReturn {
  return_id: string;
  return_number: string; // RET-2024-00001
  return_date: string;
  original_invoice_id: string;
  original_invoice_number: string;
  patient_id: string;
  patient_name_ar: string;
  return_reason_ar: string;
  return_reason_en?: string;
  total_return_amount: number;
  refund_method?: RefundMethod;
  refund_status: RefundStatus;
  refund_date?: string;
  refund_reference?: string;
  approved_by?: string;
  approved_at?: string;
  notes?: string;
  created_at: string;
  created_by?: string;
}

export interface ReturnItem {
  return_item_id: string;
  return_id: string;
  original_item_id: string;
  service_name_ar: string;
  quantity_returned: number;
  unit_price: number;
  return_amount: number;
}

// ============= SUPPLIERS =============

export type SupplierCategory =
  | 'MEDICAL_SUPPLIES'
  | 'PHARMACEUTICALS'
  | 'EQUIPMENT'
  | 'SERVICES';

export interface Supplier {
  supplier_id: string;
  supplier_code: string;
  company_name_ar: string;
  company_name_en?: string;
  contact_person_ar?: string;
  contact_person_en?: string;
  phone: string;
  mobile?: string;
  email?: string;
  governorate?: string;
  district?: string;
  address_ar?: string;
  tax_registration_number?: string;
  bank_name_ar?: string;
  account_number?: string;
  iban?: string;
  payment_terms_ar?: string;
  credit_limit?: number;
  supplier_category: SupplierCategory;
  is_active: boolean;
  is_approved: boolean;
  created_at: string;
}

// ============= PURCHASE REQUESTS =============

export type PRPriority = 'URGENT' | 'HIGH' | 'NORMAL' | 'LOW';
export type PRStatus = 'DRAFT' | 'SUBMITTED' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

export interface PurchaseRequest {
  pr_id: string;
  pr_number: string; // PR-2024-00001
  pr_date: string;
  requested_by: string;
  requested_by_name: string;
  department_id: string;
  department_name: string;
  purpose_ar: string;
  priority: PRPriority;
  required_by_date?: string;
  cost_center_id?: string;
  estimated_total: number;
  suggested_supplier_id?: string;
  status: PRStatus;
  current_approver_id?: string;
  converted_to_po: boolean;
  purchase_order_id?: string;
  notes?: string;
  created_at: string;
}

export interface PRItem {
  pr_item_id: string;
  pr_id: string;
  item_name_ar: string;
  item_name_en?: string;
  item_description_ar?: string;
  quantity: number;
  unit_of_measure: string;
  estimated_unit_price: number;
  estimated_total_price: number;
  specifications_ar?: string;
}

export interface PRApproval {
  approval_id: string;
  pr_id: string;
  approver_id: string;
  approver_name: string;
  approver_role: string;
  action: 'APPROVED' | 'REJECTED' | 'RETURNED_FOR_EDIT';
  comments?: string;
  created_at: string;
}

// ============= PURCHASE ORDERS =============

export type POStatus =
  | 'DRAFT'
  | 'APPROVED'
  | 'SENT_TO_SUPPLIER'
  | 'PARTIALLY_RECEIVED'
  | 'RECEIVED'
  | 'COMPLETED'
  | 'CANCELLED';

export type POPaymentStatus = 'UNPAID' | 'PARTIALLY_PAID' | 'PAID' | 'CANCELLED';

export interface PurchaseOrder {
  po_id: string;
  po_number: string; // PO-2024-00001
  po_date: string;
  pr_id?: string;
  supplier_id: string;
  supplier_name_ar: string;
  delivery_location_ar?: string;
  expected_delivery_date?: string;
  actual_delivery_date?: string;
  payment_terms_ar?: string;
  subtotal: number;
  tax_amount: number;
  shipping_cost: number;
  total_amount: number;
  invoice_received: boolean;
  invoice_number?: string;
  invoice_date?: string;
  payment_status: POPaymentStatus;
  amount_paid: number;
  balance_due: number;
  status: POStatus;
  approved_by?: string;
  approved_at?: string;
  notes?: string;
  created_at: string;
  created_by?: string;
}

export interface POItem {
  po_item_id: string;
  po_id: string;
  item_name_ar: string;
  item_description_ar?: string;
  ordered_quantity: number;
  received_quantity: number;
  unit_of_measure: string;
  unit_price: number;
  line_total: number;
}

// ============= WAREHOUSES & INVENTORY =============

export type WarehouseType = 'MAIN' | 'DEPARTMENT' | 'PHARMACY' | 'LAB' | 'SURGERY';

export interface Warehouse {
  warehouse_id: string;
  warehouse_code: string;
  warehouse_name_ar: string;
  warehouse_name_en?: string;
  warehouse_type: WarehouseType;
  department_id?: string;
  location_ar?: string;
  manager_id?: string;
  manager_name?: string;
  is_active: boolean;
  created_at: string;
}

export type ItemCategory =
  | 'MEDICAL_SUPPLY'
  | 'PHARMACEUTICAL'
  | 'SURGICAL_INSTRUMENT'
  | 'LAB_REAGENT'
  | 'CONSUMABLE';

export interface InventoryItem {
  item_id: string;
  item_code: string;
  item_name_ar: string;
  item_name_en?: string;
  item_category: ItemCategory;
  description_ar?: string;
  unit_of_measure: string;
  primary_supplier_id?: string;
  unit_cost: number;
  unit_price: number;
  reorder_level: number;
  reorder_quantity: number;
  has_expiry: boolean;
  is_active: boolean;
  created_at: string;
}

export type StockStatus = 'AVAILABLE' | 'LOW_STOCK' | 'OUT_OF_STOCK' | 'EXPIRED' | 'QUARANTINED';

export interface Stock {
  stock_id: string;
  item_id: string;
  item_name_ar: string;
  warehouse_id: string;
  warehouse_name_ar: string;
  quantity_on_hand: number;
  quantity_available: number;
  quantity_reserved: number;
  batch_number?: string;
  lot_number?: string;
  manufacture_date?: string;
  expiry_date?: string;
  unit_cost: number;
  total_value: number;
  stock_status: StockStatus;
}

export type MovementType = 'RECEIPT' | 'ISSUE' | 'TRANSFER' | 'ADJUSTMENT' | 'RETURN' | 'DISPOSAL';

export interface StockMovement {
  movement_id: string;
  movement_number: string; // SM-2024-00001
  movement_date: string;
  item_id: string;
  item_name_ar: string;
  from_warehouse_id?: string;
  from_warehouse_name?: string;
  to_warehouse_id?: string;
  to_warehouse_name?: string;
  movement_type: MovementType;
  quantity: number;
  unit_cost: number;
  batch_number?: string;
  patient_id?: string;
  invoice_id?: string;
  reference_type?: string;
  reference_id?: string;
  reason_ar?: string;
  notes?: string;
  performed_by?: string;
  created_at: string;
}

// ============= CHART OF ACCOUNTS & JOURNAL =============

export type AccountType = 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';
export type NormalBalance = 'DEBIT' | 'CREDIT';

export interface ChartOfAccount {
  account_id: string;
  account_number: string;
  account_name_ar: string;
  account_name_en?: string;
  account_type: AccountType;
  account_category?: string;
  parent_account_id?: string;
  normal_balance: NormalBalance;
  is_active: boolean;
  allow_posting: boolean;
  balance: number;
}

export type CostCenterType = 'REVENUE_CENTER' | 'COST_CENTER' | 'PROFIT_CENTER';

export interface CostCenter {
  cost_center_id: string;
  cost_center_code: string;
  name_ar: string;
  name_en?: string;
  center_type: CostCenterType;
  department_id?: string;
  manager_id?: string;
  manager_name?: string;
  annual_budget: number;
  actual_spending: number;
  is_active: boolean;
}

export type JournalEntryType = 'STANDARD' | 'ADJUSTING' | 'CLOSING' | 'REVERSING';
export type JournalEntryStatus = 'DRAFT' | 'POSTED' | 'REVERSED';

export interface JournalEntry {
  entry_id: string;
  entry_number: string; // JE-2024-00001
  entry_date: string;
  posting_date: string;
  entry_type: JournalEntryType;
  source_type?: string;
  source_document_id?: string;
  description_ar: string;
  total_debits: number;
  total_credits: number;
  is_balanced: boolean;
  fiscal_year: number;
  fiscal_month: number;
  status: JournalEntryStatus;
  posted: boolean;
  posted_by?: string;
  posted_at?: string;
  created_at: string;
  created_by?: string;
}

export interface JournalEntryLine {
  line_id: string;
  entry_id: string;
  account_id: string;
  account_number: string;
  account_name_ar: string;
  debit_amount: number;
  credit_amount: number;
  cost_center_id?: string;
  line_description_ar?: string;
}

// ============= FINANCIAL REPORTS =============

export interface IncomeStatementData {
  period: { year: number; month: number; date_from: string; date_to: string };
  revenue: {
    medical_services: number;
    surgical_operations: number;
    laboratory: number;
    pharmacy: number;
    radiology: number;
    other_revenue: number;
    total_revenue: number;
  };
  expenses: {
    salaries_wages: number;
    medical_supplies: number;
    pharmaceuticals: number;
    utilities: number;
    depreciation: number;
    maintenance: number;
    other_expenses: number;
    total_expenses: number;
  };
  net_income: number;
}

export interface BalanceSheetData {
  as_of_date: string;
  assets: {
    current_assets: {
      cash_and_bank: number;
      accounts_receivable_patients: number;
      accounts_receivable_insurance: number;
      inventory: number;
      prepaid_expenses: number;
      total_current_assets: number;
    };
    non_current_assets: {
      medical_equipment: number;
      furniture_fixtures: number;
      vehicles: number;
      building: number;
      accumulated_depreciation: number;
      total_non_current_assets: number;
    };
    total_assets: number;
  };
  liabilities: {
    current_liabilities: {
      accounts_payable_suppliers: number;
      accrued_expenses: number;
      stakeholder_shares_payable: number;
      taxes_payable: number;
      total_current_liabilities: number;
    };
    non_current_liabilities: {
      long_term_loans: number;
      total_non_current_liabilities: number;
    };
    total_liabilities: number;
  };
  equity: {
    paid_in_capital: number;
    retained_earnings: number;
    current_year_profit: number;
    total_equity: number;
  };
}

export interface CashFlowData {
  period: { year: number; month: number; date_from: string; date_to: string };
  operating_activities: {
    net_income: number;
    depreciation: number;
    change_in_receivables: number;
    change_in_inventory: number;
    change_in_payables: number;
    net_operating: number;
  };
  investing_activities: {
    equipment_purchases: number;
    equipment_sales: number;
    net_investing: number;
  };
  financing_activities: {
    loan_proceeds: number;
    loan_repayments: number;
    dividends_paid: number;
    net_financing: number;
  };
  net_change_in_cash: number;
  beginning_cash: number;
  ending_cash: number;
}

export interface TrialBalanceRow {
  account_number: string;
  account_name_ar: string;
  account_name_en?: string;
  account_type: AccountType;
  debit_balance: number;
  credit_balance: number;
}

// ============= FINANCE DATA STORE SHAPE =============

export interface FinanceDataStore {
  patients: FinancePatient[];
  insurance_providers: InsuranceProvider[];
  patient_insurances: PatientInsurance[];
  stakeholders: Stakeholder[];
  medical_services: MedicalService[];
  service_share_templates: ServiceShareTemplate[];
  invoices: MedicalInvoice[];
  invoice_items: InvoiceItem[];
  invoice_shares: InvoiceShare[];
  returns: InvoiceReturn[];
  return_items: ReturnItem[];
  suppliers: Supplier[];
  purchase_requests: PurchaseRequest[];
  pr_items: PRItem[];
  pr_approvals: PRApproval[];
  purchase_orders: PurchaseOrder[];
  po_items: POItem[];
  warehouses: Warehouse[];
  inventory_items: InventoryItem[];
  stock: Stock[];
  stock_movements: StockMovement[];
  chart_of_accounts: ChartOfAccount[];
  cost_centers: CostCenter[];
  journal_entries: JournalEntry[];
  journal_entry_lines: JournalEntryLine[];
  version: number;
  lastUpdated: string;
}
