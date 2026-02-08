// Core Inventory Types

export interface Item {
  id: string;
  item_code: string;
  item_name: string;
  generic_name?: string;
  brand_name?: string;
  category: string;
  subcategory: string;
  item_type: 'DRUG' | 'REAGENT' | 'SUPPLY' | 'CONSUMABLE' | 'EQUIPMENT';
  unit_of_measure: string;
  conversion_factors?: Record<string, number>;
  reorder_level: number;
  minimum_stock: number;
  maximum_stock: number;
  lead_time_days: number;
  is_controlled_substance: boolean;
  is_refrigerated: boolean;
  is_hazardous: boolean;
  storage_conditions?: {
    temperature?: string;
    humidity?: string;
    light_sensitive?: boolean;
  };
  medical_codes?: {
    snomed_ct?: string;
    rxnorm?: string;
    atc?: string;
  };
  manufacturer?: string;
  default_supplier?: string;
  unit_cost: number;
  selling_price: number;
  is_billable: boolean;
  billing_code?: string;
  is_active: boolean;
  pharmacy_ext?: PharmacyExtension;
  lab_ext?: LaboratoryExtension;
  radiology_ext?: RadiologyExtension;
  created_at: string;
  updated_at: string;
}

export interface PharmacyExtension {
  drug_class?: string;
  dosage_form?: string;
  strength?: string;
  route_of_administration?: string;
  is_high_alert_medication?: boolean;
  pregnancy_category?: string;
  schedule?: string; // For controlled substances
  requires_refrigeration?: boolean;
  shelf_life_after_opening?: number;
}

export interface LaboratoryExtension {
  reagent_type?: string;
  analyzer_compatibility?: string[];
  test_capacity?: number;
  storage_temperature?: string;
  reconstitution_required?: boolean;
  calibration_required?: boolean;
  qc_frequency?: string;
}

export interface RadiologyExtension {
  contrast_type?: string;
  osmolality?: string;
  concentration?: string;
  administration_route?: string;
  allergy_warnings?: string[];
  maximum_dose_per_patient?: number;
}

export interface Location {
  id: string;
  location_code: string;
  location_name: string;
  location_type: 'PHARMACY' | 'WARD' | 'LAB' | 'RADIOLOGY' | 'WAREHOUSE' | 'THEATER';
  department_id?: string;
  parent_location_id?: string;
  is_main_store: boolean;
  allows_negative_stock: boolean;
  manager_user_id?: string;
  is_active: boolean;
  bin_locations?: BinLocation[];
}

export interface BinLocation {
  id: string;
  bin_code: string;
  description: string;
  location_id: string;
  is_active: boolean;
}

export interface StockBalance {
  id: string;
  item_id: string;
  location_id: string;
  batch_id: string;
  quantity_on_hand: number;
  quantity_reserved: number;
  quantity_available: number;
  bin_location_id?: string;
  last_updated_at: string;
}

export interface StockBatch {
  id: string;
  item_id: string;
  batch_number: string;
  manufacturing_date: string;
  expiry_date: string;
  supplier_id: string;
  received_date: string;
  received_quantity: number;
  unit_cost: number;
  is_quarantined: boolean;
  is_recalled: boolean;
  quality_status: 'PENDING' | 'APPROVED' | 'REJECTED';
  notes?: string;
}

export interface StockTransaction {
  id: string;
  transaction_type: 'RECEIPT' | 'ISSUE' | 'TRANSFER' | 'ADJUSTMENT' | 'WASTAGE' | 'CONSUMPTION' | 'RETURN';
  item_id: string;
  batch_id: string;
  location_id: string;
  from_location_id?: string;
  to_location_id?: string;
  quantity: number;
  unit_cost?: number;
  reference_number?: string;
  reference_type?: string;
  patient_id?: string;
  performed_by: string;
  performed_at: string;
  notes?: string;
  status: 'PENDING' | 'COMPLETED' | 'CANCELLED';
}

// Procurement Types

export interface PurchaseRequisition {
  id: string;
  pr_number: string;
  requested_by: string;
  department_id: string;
  required_by_date: string;
  urgency: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  status: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'CONVERTED';
  items: PRItem[];
  justification?: string;
  total_amount: number;
  submitted_at?: string;
  approved_by?: string;
  approved_at?: string;
  notes?: string;
}

export interface PRItem {
  item_id: string;
  item_name: string;
  quantity: number;
  unit_price?: number;
  total_price?: number;
  supplier_preference?: string;
  notes?: string;
}

export interface PurchaseOrder {
  id: string;
  po_number: string;
  supplier_id: string;
  pr_id?: string;
  status: 'DRAFT' | 'SENT' | 'PARTIAL' | 'COMPLETED' | 'CANCELLED';
  order_date: string;
  expected_delivery_date: string;
  items: POItem[];
  total_amount: number;
  terms_and_conditions?: string;
  created_by: string;
  approved_by?: string;
  approved_at?: string;
  notes?: string;
}

export interface POItem {
  item_id: string;
  item_name: string;
  quantity_ordered: number;
  quantity_received: number;
  unit_price: number;
  total_price: number;
  delivery_date?: string;
  batch_number?: string;
  expiry_date?: string;
  notes?: string;
}

export interface GoodsReceiptNote {
  id: string;
  grn_number: string;
  po_id: string;
  supplier_id: string;
  received_date: string;
  received_by: string;
  status: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';
  items: GRNItem[];
  total_items: number;
  total_value: number;
  quality_inspection?: QualityInspection;
  notes?: string;
}

export interface GRNItem {
  item_id: string;
  batch_id?: string;
  batch_number: string;
  quantity_ordered: number;
  quantity_received: number;
  unit_price: number;
  total_price: number;
  manufacturing_date: string;
  expiry_date: string;
  quality_status: 'ACCEPTED' | 'REJECTED' | 'QUARANTINE';
  notes?: string;
}

export interface QualityInspection {
  inspected_by: string;
  inspected_at: string;
  temperature_check: boolean;
  visual_inspection: boolean;
  documentation_check: boolean;
  overall_status: 'PASSED' | 'FAILED' | 'PARTIAL';
  findings?: string;
}

export interface Supplier {
  id: string;
  supplier_code: string;
  supplier_name: string;
  contact_person: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  country: string;
  supplier_type: 'PHARMACEUTICAL' | 'MEDICAL_SUPPLY' | 'LAB_EQUIPMENT' | 'GENERAL';
  payment_terms: string;
  lead_time_days: number;
  is_active: boolean;
  performance_rating?: number;
  contracts?: SupplierContract[];
}

export interface SupplierContract {
  id: string;
  contract_number: string;
  start_date: string;
  end_date: string;
  items: string[]; // item_ids
  pricing: Record<string, number>; // item_id -> unit_price
  terms: string;
  is_active: boolean;
}

// Alerts Types

export interface InventoryAlert {
  id: string;
  alert_type: 'LOW_STOCK' | 'STOCK_OUT' | 'EXPIRY_30_DAYS' | 'EXPIRY_15_DAYS' | 'EXPIRED' | 'OVERSTOCK' | 'TEMPERATURE' | 'CONTROLLED_SUBSTANCE_DISCREPANCY' | 'PENDING_APPROVAL';
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  item_id?: string;
  item_name?: string;
  location_id?: string;
  location_name?: string;
  batch_id?: string;
  batch_number?: string;
  current_stock?: number;
  reorder_level?: number;
  expiry_date?: string;
  days_to_expiry?: number;
  quantity?: number;
  message: string;
  created_at: string;
  status: 'ACTIVE' | 'ACKNOWLEDGED' | 'RESOLVED' | 'DISMISSED';
  acknowledged_by?: string;
  acknowledged_at?: string;
  resolved_by?: string;
  resolved_at?: string;
  action_taken?: string;
}

// Consumption & Dispensing

export interface MedicationDispensing {
  id: string;
  prescription_id?: string;
  patient_id: string;
  patient_name: string;
  item_id: string;
  item_name: string;
  batch_id: string;
  quantity_dispensed: number;
  unit_price: number;
  total_price: number;
  dispensed_by: string;
  dispensed_at: string;
  location_id: string;
  counseling_completed: boolean;
  verified_by?: string;
  verified_at?: string;
  notes?: string;
}

export interface ControlledSubstanceLog {
  id: string;
  item_id: string;
  item_name: string;
  batch_id: string;
  transaction_type: 'RECEIPT' | 'ISSUE' | 'WASTAGE' | 'RETURN' | 'ADJUSTMENT';
  quantity: number;
  balance_before: number;
  balance_after: number;
  patient_id?: string;
  prescription_id?: string;
  performed_by: string;
  verified_by: string;
  performed_at: string;
  witness_name?: string;
  notes?: string;
}

export interface PatientConsumption {
  id: string;
  patient_id: string;
  patient_name: string;
  item_id: string;
  item_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  location_id: string;
  department_id: string;
  consumed_at: string;
  performed_by: string;
  service_id?: string;
  billing_charge_id?: string;
  notes?: string;
}

// Reports & Analytics

export interface StockStatusReport {
  item_id: string;
  item_name: string;
  location_id: string;
  location_name: string;
  on_hand: number;
  reserved: number;
  available: number;
  reorder_level: number;
  minimum_stock: number;
  maximum_stock: number;
  unit_cost: number;
  total_value: number;
  status: 'GOOD' | 'LOW' | 'CRITICAL' | 'OVERSTOCK';
}

export interface ExpiryReport {
  item_id: string;
  item_name: string;
  batch_id: string;
  batch_number: string;
  location_id: string;
  location_name: string;
  quantity: number;
  unit_cost: number;
  total_value: number;
  manufacturing_date: string;
  expiry_date: string;
  days_to_expiry: number;
  status: 'EXPIRED' | 'EXPIRING_SOON' | 'OK';
}

export interface ConsumptionReport {
  item_id: string;
  item_name: string;
  department_id: string;
  department_name: string;
  period_start: string;
  period_end: string;
  quantity_consumed: number;
  unit_cost: number;
  total_cost: number;
  patient_days?: number;
  cost_per_patient_day?: number;
}

export interface ABCAnalysis {
  item_id: string;
  item_name: string;
  annual_usage: number;
  unit_cost: number;
  annual_value: number;
  percentage_of_total_value: number;
  cumulative_percentage: number;
  category: 'A' | 'B' | 'C';
  recommendation: string;
}

// Transfer Types

export interface StockTransfer {
  id: string;
  transfer_number: string;
  from_location_id: string;
  to_location_id: string;
  status: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'ISSUED' | 'RECEIVED' | 'CANCELLED';
  urgency: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  requested_by: string;
  approved_by?: string;
  issued_by?: string;
  received_by?: string;
  items: TransferItem[];
  notes?: string;
  created_at: string;
  submitted_at?: string;
  approved_at?: string;
  issued_at?: string;
  received_at?: string;
}

export interface TransferItem {
  item_id: string;
  item_name: string;
  batch_id: string;
  quantity_requested: number;
  quantity_issued: number;
  quantity_received: number;
  unit_cost: number;
  notes?: string;
}

// Utility Types

export interface StockLevel {
  current: number;
  reorder: number;
  minimum: number;
  maximum: number;
  status: 'GOOD' | 'LOW' | 'CRITICAL' | 'OUT_OF_STOCK';
  percentage: number;
}

export interface InventoryMetrics {
  total_items: number;
  total_value: number;
  low_stock_count: number;
  critical_stock_count: number;
  expiring_30_days: number;
  expired_count: number;
  pending_prs: number;
  pending_pos: number;
  pending_grns: number;
  active_transfers: number;
  total_locations: number;
}

export interface UserPermissions {
  dashboard: string;
  inventory: 'view' | 'limited' | 'full';
  items: 'view' | 'manage';
  stock: 'view' | 'manage' | 'lab_only' | 'pharmacy_only';
  procurement: 'view' | 'create_pr' | 'full';
  pharmacy: 'view' | 'full';
  laboratory: 'view' | 'full';
  radiology: 'view' | 'full';
  controlled_substances: 'view' | 'dispense' | 'manage';
  suppliers: 'view' | 'full';
  reports: 'view' | 'full';
  billing: 'view' | 'limited' | 'full';
  finance: 'view' | 'limited' | 'full';
}
