// ============================================================================
// TIBBNA-EHR HOSPITAL MANAGEMENT SYSTEM - SUPABASE DATABASE TYPES
// Auto-generated TypeScript types matching supabase/schema.sql
// Healthcare Standards: FHIR R4, openEHR, Iraqi Healthcare Compliance
// ============================================================================

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      // ====================================================================
      // CORE: ORGANIZATIONS & LOCATIONS
      // ====================================================================

      organizations: {
        Row: {
          id: string;
          code: string;
          name: string;
          name_ar: string | null;
          type: 'HOSPITAL' | 'CLINIC' | 'PHARMACY' | 'LAB';
          license_number: string | null;
          tax_id: string | null;
          active: boolean;
          address: Json | null;
          contact: Json | null;
          metadata: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          code: string;
          name: string;
          name_ar?: string | null;
          type: 'HOSPITAL' | 'CLINIC' | 'PHARMACY' | 'LAB';
          license_number?: string | null;
          tax_id?: string | null;
          active?: boolean;
          address?: Json | null;
          contact?: Json | null;
          metadata?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          code?: string;
          name?: string;
          name_ar?: string | null;
          type?: 'HOSPITAL' | 'CLINIC' | 'PHARMACY' | 'LAB';
          license_number?: string | null;
          tax_id?: string | null;
          active?: boolean;
          address?: Json | null;
          contact?: Json | null;
          metadata?: Json | null;
          updated_at?: string;
        };
      };

      departments: {
        Row: {
          id: string;
          organization_id: string | null;
          code: string;
          name: string;
          name_ar: string | null;
          type: 'CLINICAL' | 'ADMINISTRATIVE' | 'SUPPORT' | null;
          parent_id: string | null;
          head_employee_id: string | null;
          budget_code: string | null;
          cost_center_code: string | null;
          active: boolean;
          metadata: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id?: string | null;
          code: string;
          name: string;
          name_ar?: string | null;
          type?: 'CLINICAL' | 'ADMINISTRATIVE' | 'SUPPORT' | null;
          parent_id?: string | null;
          head_employee_id?: string | null;
          budget_code?: string | null;
          cost_center_code?: string | null;
          active?: boolean;
          metadata?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string | null;
          code?: string;
          name?: string;
          name_ar?: string | null;
          type?: 'CLINICAL' | 'ADMINISTRATIVE' | 'SUPPORT' | null;
          parent_id?: string | null;
          head_employee_id?: string | null;
          budget_code?: string | null;
          cost_center_code?: string | null;
          active?: boolean;
          metadata?: Json | null;
          updated_at?: string;
        };
      };

      locations: {
        Row: {
          id: string;
          organization_id: string | null;
          department_id: string | null;
          code: string;
          name: string;
          type: 'WARD' | 'ROOM' | 'BED' | 'WAREHOUSE' | 'PHARMACY' | null;
          parent_id: string | null;
          capacity: number | null;
          active: boolean;
          metadata: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id?: string | null;
          department_id?: string | null;
          code: string;
          name: string;
          type?: 'WARD' | 'ROOM' | 'BED' | 'WAREHOUSE' | 'PHARMACY' | null;
          parent_id?: string | null;
          capacity?: number | null;
          active?: boolean;
          metadata?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string | null;
          department_id?: string | null;
          code?: string;
          name?: string;
          type?: 'WARD' | 'ROOM' | 'BED' | 'WAREHOUSE' | 'PHARMACY' | null;
          parent_id?: string | null;
          capacity?: number | null;
          active?: boolean;
          metadata?: Json | null;
          updated_at?: string;
        };
      };

      // ====================================================================
      // CORE: EMPLOYEES (FHIR Practitioner)
      // ====================================================================

      employees: {
        Row: {
          id: string;
          organization_id: string | null;
          department_id: string | null;
          employee_number: string;
          national_id: string | null;
          passport_number: string | null;
          first_name: string;
          middle_name: string | null;
          last_name: string;
          first_name_ar: string | null;
          last_name_ar: string | null;
          date_of_birth: string | null;
          gender: 'MALE' | 'FEMALE' | 'OTHER' | 'UNKNOWN' | null;
          marital_status: string | null;
          nationality: string;
          job_title: string | null;
          job_title_ar: string | null;
          employment_type: 'FULL_TIME' | 'PART_TIME' | 'CONTRACT' | null;
          employment_status: 'ACTIVE' | 'ON_LEAVE' | 'SUSPENDED' | 'TERMINATED';
          hire_date: string | null;
          termination_date: string | null;
          probation_end_date: string | null;
          salary_grade: string | null;
          base_salary: number | null;
          currency: string;
          email: string | null;
          phone: string | null;
          emergency_contact: Json | null;
          address: Json | null;
          qualifications: Json | null;
          specialties: Json | null;
          license_number: string | null;
          license_expiry: string | null;
          user_id: string | null;
          active: boolean;
          metadata: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id?: string | null;
          department_id?: string | null;
          employee_number: string;
          national_id?: string | null;
          passport_number?: string | null;
          first_name: string;
          middle_name?: string | null;
          last_name: string;
          first_name_ar?: string | null;
          last_name_ar?: string | null;
          date_of_birth?: string | null;
          gender?: 'MALE' | 'FEMALE' | 'OTHER' | 'UNKNOWN' | null;
          marital_status?: string | null;
          nationality?: string;
          job_title?: string | null;
          job_title_ar?: string | null;
          employment_type?: 'FULL_TIME' | 'PART_TIME' | 'CONTRACT' | null;
          employment_status?: 'ACTIVE' | 'ON_LEAVE' | 'SUSPENDED' | 'TERMINATED';
          hire_date?: string | null;
          termination_date?: string | null;
          probation_end_date?: string | null;
          salary_grade?: string | null;
          base_salary?: number | null;
          currency?: string;
          email?: string | null;
          phone?: string | null;
          emergency_contact?: Json | null;
          address?: Json | null;
          qualifications?: Json | null;
          specialties?: Json | null;
          license_number?: string | null;
          license_expiry?: string | null;
          user_id?: string | null;
          active?: boolean;
          metadata?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string | null;
          department_id?: string | null;
          employee_number?: string;
          national_id?: string | null;
          passport_number?: string | null;
          first_name?: string;
          middle_name?: string | null;
          last_name?: string;
          first_name_ar?: string | null;
          last_name_ar?: string | null;
          date_of_birth?: string | null;
          gender?: 'MALE' | 'FEMALE' | 'OTHER' | 'UNKNOWN' | null;
          marital_status?: string | null;
          nationality?: string;
          job_title?: string | null;
          job_title_ar?: string | null;
          employment_type?: 'FULL_TIME' | 'PART_TIME' | 'CONTRACT' | null;
          employment_status?: 'ACTIVE' | 'ON_LEAVE' | 'SUSPENDED' | 'TERMINATED';
          hire_date?: string | null;
          termination_date?: string | null;
          probation_end_date?: string | null;
          salary_grade?: string | null;
          base_salary?: number | null;
          currency?: string;
          email?: string | null;
          phone?: string | null;
          emergency_contact?: Json | null;
          address?: Json | null;
          qualifications?: Json | null;
          specialties?: Json | null;
          license_number?: string | null;
          license_expiry?: string | null;
          user_id?: string | null;
          active?: boolean;
          metadata?: Json | null;
          updated_at?: string;
        };
      };

      // ====================================================================
      // CORE: PATIENTS (FHIR Patient)
      // ====================================================================

      patients: {
        Row: {
          id: string;
          organization_id: string | null;
          medical_record_number: string;
          national_id: string | null;
          passport_number: string | null;
          first_name: string;
          middle_name: string | null;
          last_name: string;
          first_name_ar: string | null;
          last_name_ar: string | null;
          date_of_birth: string | null;
          gender: string | null;
          marital_status: string | null;
          nationality: string;
          email: string | null;
          phone: string | null;
          address: Json | null;
          blood_type: string | null;
          allergies: Json | null;
          chronic_conditions: Json | null;
          primary_insurance_id: string | null;
          secondary_insurance_id: string | null;
          payment_category: 'SELF_PAY' | 'INSURANCE' | 'GOVERNMENT';
          credit_limit: number;
          active: boolean;
          deceased: boolean;
          deceased_date: string | null;
          metadata: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id?: string | null;
          medical_record_number: string;
          national_id?: string | null;
          passport_number?: string | null;
          first_name: string;
          middle_name?: string | null;
          last_name: string;
          first_name_ar?: string | null;
          last_name_ar?: string | null;
          date_of_birth?: string | null;
          gender?: string | null;
          marital_status?: string | null;
          nationality?: string;
          email?: string | null;
          phone?: string | null;
          address?: Json | null;
          blood_type?: string | null;
          allergies?: Json | null;
          chronic_conditions?: Json | null;
          primary_insurance_id?: string | null;
          secondary_insurance_id?: string | null;
          payment_category?: 'SELF_PAY' | 'INSURANCE' | 'GOVERNMENT';
          credit_limit?: number;
          active?: boolean;
          deceased?: boolean;
          deceased_date?: string | null;
          metadata?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string | null;
          medical_record_number?: string;
          national_id?: string | null;
          passport_number?: string | null;
          first_name?: string;
          middle_name?: string | null;
          last_name?: string;
          first_name_ar?: string | null;
          last_name_ar?: string | null;
          date_of_birth?: string | null;
          gender?: string | null;
          marital_status?: string | null;
          nationality?: string;
          email?: string | null;
          phone?: string | null;
          address?: Json | null;
          blood_type?: string | null;
          allergies?: Json | null;
          chronic_conditions?: Json | null;
          primary_insurance_id?: string | null;
          secondary_insurance_id?: string | null;
          payment_category?: 'SELF_PAY' | 'INSURANCE' | 'GOVERNMENT';
          credit_limit?: number;
          active?: boolean;
          deceased?: boolean;
          deceased_date?: string | null;
          metadata?: Json | null;
          updated_at?: string;
        };
      };

      // ====================================================================
      // INSURANCE
      // ====================================================================

      insurance_providers: {
        Row: {
          id: string;
          code: string;
          name: string;
          name_ar: string | null;
          type: 'PRIVATE' | 'GOVERNMENT' | 'CORPORATE' | null;
          contact: Json | null;
          address: Json | null;
          payment_terms: number;
          credit_limit: number | null;
          annual_budget: number | null;
          active: boolean;
          metadata: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          code: string;
          name: string;
          name_ar?: string | null;
          type?: 'PRIVATE' | 'GOVERNMENT' | 'CORPORATE' | null;
          contact?: Json | null;
          address?: Json | null;
          payment_terms?: number;
          credit_limit?: number | null;
          annual_budget?: number | null;
          active?: boolean;
          metadata?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          code?: string;
          name?: string;
          name_ar?: string | null;
          type?: 'PRIVATE' | 'GOVERNMENT' | 'CORPORATE' | null;
          contact?: Json | null;
          address?: Json | null;
          payment_terms?: number;
          credit_limit?: number | null;
          annual_budget?: number | null;
          active?: boolean;
          metadata?: Json | null;
          updated_at?: string;
        };
      };

      insurance_policies: {
        Row: {
          id: string;
          provider_id: string | null;
          patient_id: string | null;
          policy_number: string;
          group_number: string | null;
          coverage_start: string;
          coverage_end: string;
          coverage_percentage: number;
          annual_limit: number | null;
          remaining_balance: number | null;
          copay_amount: number;
          deductible: number;
          status: 'ACTIVE' | 'EXPIRED' | 'SUSPENDED' | 'CANCELLED';
          metadata: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          provider_id?: string | null;
          patient_id?: string | null;
          policy_number: string;
          group_number?: string | null;
          coverage_start: string;
          coverage_end: string;
          coverage_percentage?: number;
          annual_limit?: number | null;
          remaining_balance?: number | null;
          copay_amount?: number;
          deductible?: number;
          status?: 'ACTIVE' | 'EXPIRED' | 'SUSPENDED' | 'CANCELLED';
          metadata?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          provider_id?: string | null;
          patient_id?: string | null;
          policy_number?: string;
          group_number?: string | null;
          coverage_start?: string;
          coverage_end?: string;
          coverage_percentage?: number;
          annual_limit?: number | null;
          remaining_balance?: number | null;
          copay_amount?: number;
          deductible?: number;
          status?: 'ACTIVE' | 'EXPIRED' | 'SUSPENDED' | 'CANCELLED';
          metadata?: Json | null;
          updated_at?: string;
        };
      };

      // ====================================================================
      // SERVICES & PRICING
      // ====================================================================

      service_catalog: {
        Row: {
          id: string;
          organization_id: string | null;
          department_id: string | null;
          code: string;
          name: string;
          name_ar: string | null;
          description: string | null;
          category: string | null;
          price_self_pay: number;
          price_insurance: number;
          price_government: number;
          currency: string;
          cpt_code: string | null;
          icd10_code: string | null;
          loinc_code: string | null;
          duration_minutes: number | null;
          requires_appointment: boolean;
          active: boolean;
          metadata: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id?: string | null;
          department_id?: string | null;
          code: string;
          name: string;
          name_ar?: string | null;
          description?: string | null;
          category?: string | null;
          price_self_pay: number;
          price_insurance: number;
          price_government: number;
          currency?: string;
          cpt_code?: string | null;
          icd10_code?: string | null;
          loinc_code?: string | null;
          duration_minutes?: number | null;
          requires_appointment?: boolean;
          active?: boolean;
          metadata?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string | null;
          department_id?: string | null;
          code?: string;
          name?: string;
          name_ar?: string | null;
          description?: string | null;
          category?: string | null;
          price_self_pay?: number;
          price_insurance?: number;
          price_government?: number;
          currency?: string;
          cpt_code?: string | null;
          icd10_code?: string | null;
          loinc_code?: string | null;
          duration_minutes?: number | null;
          requires_appointment?: boolean;
          active?: boolean;
          metadata?: Json | null;
          updated_at?: string;
        };
      };

      // ====================================================================
      // BILLING & INVOICING (FHIR Invoice/Claim)
      // ====================================================================

      invoices: {
        Row: {
          id: string;
          organization_id: string | null;
          invoice_number: string;
          invoice_date: string;
          due_date: string | null;
          patient_id: string | null;
          insurance_policy_id: string | null;
          subtotal: number;
          discount_amount: number;
          discount_percentage: number;
          tax_amount: number;
          total_amount: number;
          insurance_coverage: number;
          patient_responsibility: number;
          paid_amount: number;
          balance_due: number;
          status: 'DRAFT' | 'ISSUED' | 'PARTIALLY_PAID' | 'PAID' | 'CANCELLED' | 'VOID';
          payment_status: 'UNPAID' | 'PARTIALLY_PAID' | 'PAID' | 'OVERDUE';
          encounter_id: string | null;
          created_by: string | null;
          notes: string | null;
          metadata: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id?: string | null;
          invoice_number: string;
          invoice_date: string;
          due_date?: string | null;
          patient_id?: string | null;
          insurance_policy_id?: string | null;
          subtotal?: number;
          discount_amount?: number;
          discount_percentage?: number;
          tax_amount?: number;
          total_amount: number;
          insurance_coverage?: number;
          patient_responsibility: number;
          paid_amount?: number;
          balance_due: number;
          status?: 'DRAFT' | 'ISSUED' | 'PARTIALLY_PAID' | 'PAID' | 'CANCELLED' | 'VOID';
          payment_status?: 'UNPAID' | 'PARTIALLY_PAID' | 'PAID' | 'OVERDUE';
          encounter_id?: string | null;
          created_by?: string | null;
          notes?: string | null;
          metadata?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string | null;
          invoice_number?: string;
          invoice_date?: string;
          due_date?: string | null;
          patient_id?: string | null;
          insurance_policy_id?: string | null;
          subtotal?: number;
          discount_amount?: number;
          discount_percentage?: number;
          tax_amount?: number;
          total_amount?: number;
          insurance_coverage?: number;
          patient_responsibility?: number;
          paid_amount?: number;
          balance_due?: number;
          status?: 'DRAFT' | 'ISSUED' | 'PARTIALLY_PAID' | 'PAID' | 'CANCELLED' | 'VOID';
          payment_status?: 'UNPAID' | 'PARTIALLY_PAID' | 'PAID' | 'OVERDUE';
          encounter_id?: string | null;
          created_by?: string | null;
          notes?: string | null;
          metadata?: Json | null;
          updated_at?: string;
        };
      };

      invoice_line_items: {
        Row: {
          id: string;
          invoice_id: string | null;
          line_number: number;
          service_id: string | null;
          description: string;
          quantity: number;
          unit_price: number;
          discount_amount: number;
          tax_amount: number;
          line_total: number;
          performed_by: string | null;
          performed_date: string | null;
          metadata: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          invoice_id?: string | null;
          line_number: number;
          service_id?: string | null;
          description: string;
          quantity?: number;
          unit_price: number;
          discount_amount?: number;
          tax_amount?: number;
          line_total: number;
          performed_by?: string | null;
          performed_date?: string | null;
          metadata?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          invoice_id?: string | null;
          line_number?: number;
          service_id?: string | null;
          description?: string;
          quantity?: number;
          unit_price?: number;
          discount_amount?: number;
          tax_amount?: number;
          line_total?: number;
          performed_by?: string | null;
          performed_date?: string | null;
          metadata?: Json | null;
        };
      };

      payments: {
        Row: {
          id: string;
          invoice_id: string | null;
          payment_number: string;
          payment_date: string;
          amount: number;
          payment_method: 'CASH' | 'CARD' | 'BANK_TRANSFER' | 'CHECK' | 'INSURANCE';
          reference_number: string | null;
          received_by: string | null;
          notes: string | null;
          metadata: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          invoice_id?: string | null;
          payment_number: string;
          payment_date: string;
          amount: number;
          payment_method: 'CASH' | 'CARD' | 'BANK_TRANSFER' | 'CHECK' | 'INSURANCE';
          reference_number?: string | null;
          received_by?: string | null;
          notes?: string | null;
          metadata?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          invoice_id?: string | null;
          payment_number?: string;
          payment_date?: string;
          amount?: number;
          payment_method?: 'CASH' | 'CARD' | 'BANK_TRANSFER' | 'CHECK' | 'INSURANCE';
          reference_number?: string | null;
          received_by?: string | null;
          notes?: string | null;
          metadata?: Json | null;
        };
      };

      returns: {
        Row: {
          id: string;
          organization_id: string | null;
          return_number: string;
          return_date: string;
          invoice_id: string | null;
          patient_id: string | null;
          return_amount: number;
          reason: string | null;
          status: 'PENDING' | 'APPROVED' | 'PROCESSED' | 'REJECTED';
          processed_by: string | null;
          processed_at: string | null;
          refund_method: string | null;
          refund_reference: string | null;
          metadata: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id?: string | null;
          return_number: string;
          return_date: string;
          invoice_id?: string | null;
          patient_id?: string | null;
          return_amount: number;
          reason?: string | null;
          status?: 'PENDING' | 'APPROVED' | 'PROCESSED' | 'REJECTED';
          processed_by?: string | null;
          processed_at?: string | null;
          refund_method?: string | null;
          refund_reference?: string | null;
          metadata?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string | null;
          return_number?: string;
          return_date?: string;
          invoice_id?: string | null;
          patient_id?: string | null;
          return_amount?: number;
          reason?: string | null;
          status?: 'PENDING' | 'APPROVED' | 'PROCESSED' | 'REJECTED';
          processed_by?: string | null;
          processed_at?: string | null;
          refund_method?: string | null;
          refund_reference?: string | null;
          metadata?: Json | null;
          updated_at?: string;
        };
      };

      // ====================================================================
      // INVENTORY (FHIR Medication/Device/Substance)
      // ====================================================================

      inventory_items: {
        Row: {
          id: string;
          organization_id: string | null;
          code: string;
          barcode: string | null;
          name: string;
          name_ar: string | null;
          description: string | null;
          category: 'MEDICATION' | 'SUPPLY' | 'EQUIPMENT' | 'REAGENT';
          subcategory: string | null;
          rxnorm_code: string | null;
          unspsc_code: string | null;
          unit_of_measure: string;
          package_size: number;
          reorder_level: number;
          reorder_quantity: number | null;
          max_stock_level: number | null;
          cost_method: 'FIFO' | 'LIFO' | 'AVERAGE';
          standard_cost: number | null;
          is_controlled_substance: boolean;
          requires_prescription: boolean;
          strength: string | null;
          dosage_form: string | null;
          serial_tracked: boolean;
          warranty_months: number | null;
          active: boolean;
          metadata: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id?: string | null;
          code: string;
          barcode?: string | null;
          name: string;
          name_ar?: string | null;
          description?: string | null;
          category: 'MEDICATION' | 'SUPPLY' | 'EQUIPMENT' | 'REAGENT';
          subcategory?: string | null;
          rxnorm_code?: string | null;
          unspsc_code?: string | null;
          unit_of_measure: string;
          package_size?: number;
          reorder_level?: number;
          reorder_quantity?: number | null;
          max_stock_level?: number | null;
          cost_method?: 'FIFO' | 'LIFO' | 'AVERAGE';
          standard_cost?: number | null;
          is_controlled_substance?: boolean;
          requires_prescription?: boolean;
          strength?: string | null;
          dosage_form?: string | null;
          serial_tracked?: boolean;
          warranty_months?: number | null;
          active?: boolean;
          metadata?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string | null;
          code?: string;
          barcode?: string | null;
          name?: string;
          name_ar?: string | null;
          description?: string | null;
          category?: 'MEDICATION' | 'SUPPLY' | 'EQUIPMENT' | 'REAGENT';
          subcategory?: string | null;
          rxnorm_code?: string | null;
          unspsc_code?: string | null;
          unit_of_measure?: string;
          package_size?: number;
          reorder_level?: number;
          reorder_quantity?: number | null;
          max_stock_level?: number | null;
          cost_method?: 'FIFO' | 'LIFO' | 'AVERAGE';
          standard_cost?: number | null;
          is_controlled_substance?: boolean;
          requires_prescription?: boolean;
          strength?: string | null;
          dosage_form?: string | null;
          serial_tracked?: boolean;
          warranty_months?: number | null;
          active?: boolean;
          metadata?: Json | null;
          updated_at?: string;
        };
      };

      inventory_batches: {
        Row: {
          id: string;
          item_id: string | null;
          location_id: string | null;
          batch_number: string;
          serial_number: string | null;
          quantity_on_hand: number;
          quantity_reserved: number;
          quantity_available: number; // GENERATED
          unit_cost: number;
          total_value: number; // GENERATED
          manufacture_date: string | null;
          expiry_date: string | null;
          supplier_id: string | null;
          purchase_order_id: string | null;
          status: 'AVAILABLE' | 'RESERVED' | 'EXPIRED' | 'RECALLED' | 'QUARANTINE';
          metadata: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          item_id?: string | null;
          location_id?: string | null;
          batch_number: string;
          serial_number?: string | null;
          quantity_on_hand?: number;
          quantity_reserved?: number;
          unit_cost: number;
          manufacture_date?: string | null;
          expiry_date?: string | null;
          supplier_id?: string | null;
          purchase_order_id?: string | null;
          status?: 'AVAILABLE' | 'RESERVED' | 'EXPIRED' | 'RECALLED' | 'QUARANTINE';
          metadata?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          item_id?: string | null;
          location_id?: string | null;
          batch_number?: string;
          serial_number?: string | null;
          quantity_on_hand?: number;
          quantity_reserved?: number;
          unit_cost?: number;
          manufacture_date?: string | null;
          expiry_date?: string | null;
          supplier_id?: string | null;
          purchase_order_id?: string | null;
          status?: 'AVAILABLE' | 'RESERVED' | 'EXPIRED' | 'RECALLED' | 'QUARANTINE';
          metadata?: Json | null;
          updated_at?: string;
        };
      };

      inventory_movements: {
        Row: {
          id: string;
          organization_id: string | null;
          movement_number: string;
          movement_date: string;
          movement_type: 'RECEIPT' | 'ISSUE' | 'TRANSFER' | 'ADJUSTMENT' | 'RETURN' | 'DISPOSAL';
          item_id: string | null;
          batch_id: string | null;
          from_location_id: string | null;
          to_location_id: string | null;
          quantity: number;
          unit_cost: number | null;
          total_value: number | null;
          patient_id: string | null;
          employee_id: string | null;
          invoice_id: string | null;
          purchase_order_id: string | null;
          reason: string | null;
          notes: string | null;
          performed_by: string | null;
          metadata: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id?: string | null;
          movement_number: string;
          movement_date?: string;
          movement_type: 'RECEIPT' | 'ISSUE' | 'TRANSFER' | 'ADJUSTMENT' | 'RETURN' | 'DISPOSAL';
          item_id?: string | null;
          batch_id?: string | null;
          from_location_id?: string | null;
          to_location_id?: string | null;
          quantity: number;
          unit_cost?: number | null;
          total_value?: number | null;
          patient_id?: string | null;
          employee_id?: string | null;
          invoice_id?: string | null;
          purchase_order_id?: string | null;
          reason?: string | null;
          notes?: string | null;
          performed_by?: string | null;
          metadata?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string | null;
          movement_number?: string;
          movement_date?: string;
          movement_type?: 'RECEIPT' | 'ISSUE' | 'TRANSFER' | 'ADJUSTMENT' | 'RETURN' | 'DISPOSAL';
          item_id?: string | null;
          batch_id?: string | null;
          from_location_id?: string | null;
          to_location_id?: string | null;
          quantity?: number;
          unit_cost?: number | null;
          total_value?: number | null;
          patient_id?: string | null;
          employee_id?: string | null;
          invoice_id?: string | null;
          purchase_order_id?: string | null;
          reason?: string | null;
          notes?: string | null;
          performed_by?: string | null;
          metadata?: Json | null;
        };
      };

      // ====================================================================
      // PROCUREMENT
      // ====================================================================

      suppliers: {
        Row: {
          id: string;
          code: string;
          name: string;
          name_ar: string | null;
          type: 'PHARMACEUTICAL' | 'MEDICAL_EQUIPMENT' | 'SUPPLIES' | 'SERVICES' | null;
          tax_id: string | null;
          license_number: string | null;
          contact: Json | null;
          address: Json | null;
          payment_terms: number;
          credit_limit: number | null;
          currency: string;
          rating: number | null;
          active: boolean;
          metadata: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          code: string;
          name: string;
          name_ar?: string | null;
          type?: 'PHARMACEUTICAL' | 'MEDICAL_EQUIPMENT' | 'SUPPLIES' | 'SERVICES' | null;
          tax_id?: string | null;
          license_number?: string | null;
          contact?: Json | null;
          address?: Json | null;
          payment_terms?: number;
          credit_limit?: number | null;
          currency?: string;
          rating?: number | null;
          active?: boolean;
          metadata?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          code?: string;
          name?: string;
          name_ar?: string | null;
          type?: 'PHARMACEUTICAL' | 'MEDICAL_EQUIPMENT' | 'SUPPLIES' | 'SERVICES' | null;
          tax_id?: string | null;
          license_number?: string | null;
          contact?: Json | null;
          address?: Json | null;
          payment_terms?: number;
          credit_limit?: number | null;
          currency?: string;
          rating?: number | null;
          active?: boolean;
          metadata?: Json | null;
          updated_at?: string;
        };
      };

      purchase_requisitions: {
        Row: {
          id: string;
          organization_id: string | null;
          department_id: string | null;
          requisition_number: string;
          requisition_date: string;
          required_by_date: string | null;
          requested_by: string | null;
          approved_by: string | null;
          status: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'CONVERTED';
          priority: 'URGENT' | 'HIGH' | 'NORMAL' | 'LOW';
          notes: string | null;
          metadata: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id?: string | null;
          department_id?: string | null;
          requisition_number: string;
          requisition_date: string;
          required_by_date?: string | null;
          requested_by?: string | null;
          approved_by?: string | null;
          status?: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'CONVERTED';
          priority?: 'URGENT' | 'HIGH' | 'NORMAL' | 'LOW';
          notes?: string | null;
          metadata?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string | null;
          department_id?: string | null;
          requisition_number?: string;
          requisition_date?: string;
          required_by_date?: string | null;
          requested_by?: string | null;
          approved_by?: string | null;
          status?: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'CONVERTED';
          priority?: 'URGENT' | 'HIGH' | 'NORMAL' | 'LOW';
          notes?: string | null;
          metadata?: Json | null;
          updated_at?: string;
        };
      };

      purchase_requisition_items: {
        Row: {
          id: string;
          requisition_id: string | null;
          line_number: number;
          item_id: string | null;
          quantity: number;
          estimated_cost: number | null;
          notes: string | null;
          metadata: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          requisition_id?: string | null;
          line_number: number;
          item_id?: string | null;
          quantity: number;
          estimated_cost?: number | null;
          notes?: string | null;
          metadata?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          requisition_id?: string | null;
          line_number?: number;
          item_id?: string | null;
          quantity?: number;
          estimated_cost?: number | null;
          notes?: string | null;
          metadata?: Json | null;
        };
      };

      purchase_orders: {
        Row: {
          id: string;
          organization_id: string | null;
          supplier_id: string | null;
          requisition_id: string | null;
          po_number: string;
          po_date: string;
          expected_delivery_date: string | null;
          subtotal: number;
          tax_amount: number;
          shipping_cost: number;
          total_amount: number;
          currency: string;
          status: 'DRAFT' | 'SENT' | 'ACKNOWLEDGED' | 'PARTIALLY_RECEIVED' | 'RECEIVED' | 'CANCELLED';
          created_by: string | null;
          approved_by: string | null;
          payment_terms: number | null;
          delivery_location_id: string | null;
          notes: string | null;
          metadata: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id?: string | null;
          supplier_id?: string | null;
          requisition_id?: string | null;
          po_number: string;
          po_date: string;
          expected_delivery_date?: string | null;
          subtotal?: number;
          tax_amount?: number;
          shipping_cost?: number;
          total_amount: number;
          currency?: string;
          status?: 'DRAFT' | 'SENT' | 'ACKNOWLEDGED' | 'PARTIALLY_RECEIVED' | 'RECEIVED' | 'CANCELLED';
          created_by?: string | null;
          approved_by?: string | null;
          payment_terms?: number | null;
          delivery_location_id?: string | null;
          notes?: string | null;
          metadata?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string | null;
          supplier_id?: string | null;
          requisition_id?: string | null;
          po_number?: string;
          po_date?: string;
          expected_delivery_date?: string | null;
          subtotal?: number;
          tax_amount?: number;
          shipping_cost?: number;
          total_amount?: number;
          currency?: string;
          status?: 'DRAFT' | 'SENT' | 'ACKNOWLEDGED' | 'PARTIALLY_RECEIVED' | 'RECEIVED' | 'CANCELLED';
          created_by?: string | null;
          approved_by?: string | null;
          payment_terms?: number | null;
          delivery_location_id?: string | null;
          notes?: string | null;
          metadata?: Json | null;
          updated_at?: string;
        };
      };

      purchase_order_items: {
        Row: {
          id: string;
          po_id: string | null;
          line_number: number;
          item_id: string | null;
          quantity_ordered: number;
          quantity_received: number;
          quantity_pending: number; // GENERATED
          unit_cost: number;
          line_total: number;
          metadata: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          po_id?: string | null;
          line_number: number;
          item_id?: string | null;
          quantity_ordered: number;
          quantity_received?: number;
          unit_cost: number;
          line_total: number;
          metadata?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          po_id?: string | null;
          line_number?: number;
          item_id?: string | null;
          quantity_ordered?: number;
          quantity_received?: number;
          unit_cost?: number;
          line_total?: number;
          metadata?: Json | null;
        };
      };

      // ====================================================================
      // HR: ATTENDANCE & LEAVES
      // ====================================================================

      attendance_records: {
        Row: {
          id: string;
          organization_id: string | null;
          employee_id: string | null;
          attendance_date: string;
          check_in: string | null;
          check_out: string | null;
          total_hours: number | null;
          late_minutes: number;
          early_leave_minutes: number;
          overtime_hours: number;
          status: 'PRESENT' | 'ABSENT' | 'LATE' | 'LEAVE' | 'HOLIDAY' | 'WEEKEND';
          approved_by: string | null;
          approved_at: string | null;
          notes: string | null;
          metadata: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id?: string | null;
          employee_id?: string | null;
          attendance_date: string;
          check_in?: string | null;
          check_out?: string | null;
          total_hours?: number | null;
          late_minutes?: number;
          early_leave_minutes?: number;
          overtime_hours?: number;
          status: 'PRESENT' | 'ABSENT' | 'LATE' | 'LEAVE' | 'HOLIDAY' | 'WEEKEND';
          approved_by?: string | null;
          approved_at?: string | null;
          notes?: string | null;
          metadata?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string | null;
          employee_id?: string | null;
          attendance_date?: string;
          check_in?: string | null;
          check_out?: string | null;
          total_hours?: number | null;
          late_minutes?: number;
          early_leave_minutes?: number;
          overtime_hours?: number;
          status?: 'PRESENT' | 'ABSENT' | 'LATE' | 'LEAVE' | 'HOLIDAY' | 'WEEKEND';
          approved_by?: string | null;
          approved_at?: string | null;
          notes?: string | null;
          metadata?: Json | null;
          updated_at?: string;
        };
      };

      leave_types: {
        Row: {
          id: string;
          organization_id: string | null;
          code: string;
          name: string;
          name_ar: string | null;
          max_days_per_year: number | null;
          max_consecutive_days: number | null;
          requires_approval: boolean;
          requires_documentation: boolean;
          carry_forward: boolean;
          paid: boolean;
          active: boolean;
          metadata: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id?: string | null;
          code: string;
          name: string;
          name_ar?: string | null;
          max_days_per_year?: number | null;
          max_consecutive_days?: number | null;
          requires_approval?: boolean;
          requires_documentation?: boolean;
          carry_forward?: boolean;
          paid?: boolean;
          active?: boolean;
          metadata?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string | null;
          code?: string;
          name?: string;
          name_ar?: string | null;
          max_days_per_year?: number | null;
          max_consecutive_days?: number | null;
          requires_approval?: boolean;
          requires_documentation?: boolean;
          carry_forward?: boolean;
          paid?: boolean;
          active?: boolean;
          metadata?: Json | null;
        };
      };

      leave_balances: {
        Row: {
          id: string;
          employee_id: string | null;
          leave_type_id: string | null;
          year: number;
          total_entitlement: number;
          used_days: number;
          pending_days: number;
          available_days: number; // GENERATED
          metadata: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          employee_id?: string | null;
          leave_type_id?: string | null;
          year: number;
          total_entitlement: number;
          used_days?: number;
          pending_days?: number;
          metadata?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          employee_id?: string | null;
          leave_type_id?: string | null;
          year?: number;
          total_entitlement?: number;
          used_days?: number;
          pending_days?: number;
          metadata?: Json | null;
          updated_at?: string;
        };
      };

      leave_requests: {
        Row: {
          id: string;
          organization_id: string | null;
          employee_id: string | null;
          leave_type_id: string | null;
          request_number: string;
          start_date: string;
          end_date: string;
          total_days: number;
          reason: string | null;
          supporting_document_url: string | null;
          contact_number: string | null;
          status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
          approver_1_id: string | null;
          approver_1_status: string | null;
          approver_1_date: string | null;
          approver_1_remarks: string | null;
          approver_2_id: string | null;
          approver_2_status: string | null;
          approver_2_date: string | null;
          approver_2_remarks: string | null;
          approver_3_id: string | null;
          approver_3_status: string | null;
          approver_3_date: string | null;
          approver_3_remarks: string | null;
          rejected_by: string | null;
          rejected_at: string | null;
          rejection_reason: string | null;
          metadata: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id?: string | null;
          employee_id?: string | null;
          leave_type_id?: string | null;
          request_number: string;
          start_date: string;
          end_date: string;
          total_days: number;
          reason?: string | null;
          supporting_document_url?: string | null;
          contact_number?: string | null;
          status?: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
          approver_1_id?: string | null;
          approver_1_status?: string | null;
          approver_1_date?: string | null;
          approver_1_remarks?: string | null;
          approver_2_id?: string | null;
          approver_2_status?: string | null;
          approver_2_date?: string | null;
          approver_2_remarks?: string | null;
          approver_3_id?: string | null;
          approver_3_status?: string | null;
          approver_3_date?: string | null;
          approver_3_remarks?: string | null;
          rejected_by?: string | null;
          rejected_at?: string | null;
          rejection_reason?: string | null;
          metadata?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string | null;
          employee_id?: string | null;
          leave_type_id?: string | null;
          request_number?: string;
          start_date?: string;
          end_date?: string;
          total_days?: number;
          reason?: string | null;
          supporting_document_url?: string | null;
          contact_number?: string | null;
          status?: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
          approver_1_id?: string | null;
          approver_1_status?: string | null;
          approver_1_date?: string | null;
          approver_1_remarks?: string | null;
          approver_2_id?: string | null;
          approver_2_status?: string | null;
          approver_2_date?: string | null;
          approver_2_remarks?: string | null;
          approver_3_id?: string | null;
          approver_3_status?: string | null;
          approver_3_date?: string | null;
          approver_3_remarks?: string | null;
          rejected_by?: string | null;
          rejected_at?: string | null;
          rejection_reason?: string | null;
          metadata?: Json | null;
          updated_at?: string;
        };
      };

      // ====================================================================
      // HR: PAYROLL
      // ====================================================================

      salary_grades: {
        Row: {
          id: string;
          organization_id: string | null;
          grade_code: string;
          title: string;
          min_salary: number;
          max_salary: number;
          midpoint_salary: number; // GENERATED
          currency: string;
          active: boolean;
          metadata: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id?: string | null;
          grade_code: string;
          title: string;
          min_salary: number;
          max_salary: number;
          currency?: string;
          active?: boolean;
          metadata?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string | null;
          grade_code?: string;
          title?: string;
          min_salary?: number;
          max_salary?: number;
          currency?: string;
          active?: boolean;
          metadata?: Json | null;
        };
      };

      payroll_periods: {
        Row: {
          id: string;
          organization_id: string | null;
          period_code: string;
          period_start: string;
          period_end: string;
          payment_date: string;
          status: 'DRAFT' | 'CALCULATED' | 'APPROVED' | 'PAID';
          total_gross: number;
          total_deductions: number;
          total_net: number;
          processed_by: string | null;
          approved_by: string | null;
          metadata: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id?: string | null;
          period_code: string;
          period_start: string;
          period_end: string;
          payment_date: string;
          status?: 'DRAFT' | 'CALCULATED' | 'APPROVED' | 'PAID';
          total_gross?: number;
          total_deductions?: number;
          total_net?: number;
          processed_by?: string | null;
          approved_by?: string | null;
          metadata?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string | null;
          period_code?: string;
          period_start?: string;
          period_end?: string;
          payment_date?: string;
          status?: 'DRAFT' | 'CALCULATED' | 'APPROVED' | 'PAID';
          total_gross?: number;
          total_deductions?: number;
          total_net?: number;
          processed_by?: string | null;
          approved_by?: string | null;
          metadata?: Json | null;
          updated_at?: string;
        };
      };

      payroll_transactions: {
        Row: {
          id: string;
          period_id: string | null;
          employee_id: string | null;
          base_salary: number;
          housing_allowance: number;
          transport_allowance: number;
          other_allowances: number;
          overtime_pay: number;
          bonus: number;
          gross_salary: number;
          tax: number;
          social_security_employee: number;
          social_security_employer: number;
          loan_deduction: number;
          other_deductions: number;
          total_deductions: number;
          net_salary: number;
          bank_name: string | null;
          account_number: string | null;
          payment_status: 'PENDING' | 'PROCESSED' | 'PAID' | 'FAILED';
          payment_date: string | null;
          metadata: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          period_id?: string | null;
          employee_id?: string | null;
          base_salary: number;
          housing_allowance?: number;
          transport_allowance?: number;
          other_allowances?: number;
          overtime_pay?: number;
          bonus?: number;
          gross_salary: number;
          tax?: number;
          social_security_employee?: number;
          social_security_employer?: number;
          loan_deduction?: number;
          other_deductions?: number;
          total_deductions: number;
          net_salary: number;
          bank_name?: string | null;
          account_number?: string | null;
          payment_status?: 'PENDING' | 'PROCESSED' | 'PAID' | 'FAILED';
          payment_date?: string | null;
          metadata?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          period_id?: string | null;
          employee_id?: string | null;
          base_salary?: number;
          housing_allowance?: number;
          transport_allowance?: number;
          other_allowances?: number;
          overtime_pay?: number;
          bonus?: number;
          gross_salary?: number;
          tax?: number;
          social_security_employee?: number;
          social_security_employer?: number;
          loan_deduction?: number;
          other_deductions?: number;
          total_deductions?: number;
          net_salary?: number;
          bank_name?: string | null;
          account_number?: string | null;
          payment_status?: 'PENDING' | 'PROCESSED' | 'PAID' | 'FAILED';
          payment_date?: string | null;
          metadata?: Json | null;
        };
      };

      employee_loans: {
        Row: {
          id: string;
          employee_id: string | null;
          loan_number: string;
          loan_date: string;
          principal_amount: number;
          interest_rate: number;
          total_amount: number;
          installments: number;
          installment_amount: number;
          amount_paid: number;
          amount_remaining: number; // GENERATED
          start_date: string;
          end_date: string | null;
          status: 'ACTIVE' | 'PAID' | 'CANCELLED';
          approved_by: string | null;
          metadata: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          employee_id?: string | null;
          loan_number: string;
          loan_date: string;
          principal_amount: number;
          interest_rate?: number;
          total_amount: number;
          installments: number;
          installment_amount: number;
          amount_paid?: number;
          start_date: string;
          end_date?: string | null;
          status?: 'ACTIVE' | 'PAID' | 'CANCELLED';
          approved_by?: string | null;
          metadata?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          employee_id?: string | null;
          loan_number?: string;
          loan_date?: string;
          principal_amount?: number;
          interest_rate?: number;
          total_amount?: number;
          installments?: number;
          installment_amount?: number;
          amount_paid?: number;
          start_date?: string;
          end_date?: string | null;
          status?: 'ACTIVE' | 'PAID' | 'CANCELLED';
          approved_by?: string | null;
          metadata?: Json | null;
          updated_at?: string;
        };
      };

      // ====================================================================
      // HR: TRAINING & PERFORMANCE
      // ====================================================================

      training_programs: {
        Row: {
          id: string;
          organization_id: string | null;
          code: string;
          name: string;
          name_ar: string | null;
          description: string | null;
          category: string | null;
          provider: string | null;
          duration_hours: number | null;
          is_mandatory: boolean;
          is_cme: boolean;
          cme_credits: number | null;
          active: boolean;
          metadata: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id?: string | null;
          code: string;
          name: string;
          name_ar?: string | null;
          description?: string | null;
          category?: string | null;
          provider?: string | null;
          duration_hours?: number | null;
          is_mandatory?: boolean;
          is_cme?: boolean;
          cme_credits?: number | null;
          active?: boolean;
          metadata?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string | null;
          code?: string;
          name?: string;
          name_ar?: string | null;
          description?: string | null;
          category?: string | null;
          provider?: string | null;
          duration_hours?: number | null;
          is_mandatory?: boolean;
          is_cme?: boolean;
          cme_credits?: number | null;
          active?: boolean;
          metadata?: Json | null;
          updated_at?: string;
        };
      };

      training_sessions: {
        Row: {
          id: string;
          program_id: string | null;
          session_date: string;
          start_time: string | null;
          end_time: string | null;
          location: string | null;
          instructor: string | null;
          max_participants: number | null;
          status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
          metadata: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          program_id?: string | null;
          session_date: string;
          start_time?: string | null;
          end_time?: string | null;
          location?: string | null;
          instructor?: string | null;
          max_participants?: number | null;
          status?: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
          metadata?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          program_id?: string | null;
          session_date?: string;
          start_time?: string | null;
          end_time?: string | null;
          location?: string | null;
          instructor?: string | null;
          max_participants?: number | null;
          status?: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
          metadata?: Json | null;
        };
      };

      training_enrollments: {
        Row: {
          id: string;
          session_id: string | null;
          employee_id: string | null;
          enrollment_date: string;
          completion_date: string | null;
          status: 'ENROLLED' | 'ATTENDED' | 'COMPLETED' | 'NO_SHOW' | 'CANCELLED';
          score: number | null;
          certificate_url: string | null;
          metadata: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          session_id?: string | null;
          employee_id?: string | null;
          enrollment_date?: string;
          completion_date?: string | null;
          status?: 'ENROLLED' | 'ATTENDED' | 'COMPLETED' | 'NO_SHOW' | 'CANCELLED';
          score?: number | null;
          certificate_url?: string | null;
          metadata?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          session_id?: string | null;
          employee_id?: string | null;
          enrollment_date?: string;
          completion_date?: string | null;
          status?: 'ENROLLED' | 'ATTENDED' | 'COMPLETED' | 'NO_SHOW' | 'CANCELLED';
          score?: number | null;
          certificate_url?: string | null;
          metadata?: Json | null;
        };
      };

      performance_review_cycles: {
        Row: {
          id: string;
          organization_id: string | null;
          cycle_name: string;
          year: number;
          period: 'ANNUAL' | 'SEMI_ANNUAL' | 'QUARTERLY' | null;
          start_date: string;
          end_date: string;
          status: 'DRAFT' | 'ACTIVE' | 'COMPLETED';
          metadata: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id?: string | null;
          cycle_name: string;
          year: number;
          period?: 'ANNUAL' | 'SEMI_ANNUAL' | 'QUARTERLY' | null;
          start_date: string;
          end_date: string;
          status?: 'DRAFT' | 'ACTIVE' | 'COMPLETED';
          metadata?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string | null;
          cycle_name?: string;
          year?: number;
          period?: 'ANNUAL' | 'SEMI_ANNUAL' | 'QUARTERLY' | null;
          start_date?: string;
          end_date?: string;
          status?: 'DRAFT' | 'ACTIVE' | 'COMPLETED';
          metadata?: Json | null;
        };
      };

      performance_reviews: {
        Row: {
          id: string;
          cycle_id: string | null;
          employee_id: string | null;
          reviewer_id: string | null;
          review_date: string | null;
          overall_rating: number | null;
          competency_ratings: Json | null;
          strengths: string | null;
          areas_for_improvement: string | null;
          goals: string | null;
          comments: string | null;
          status: 'DRAFT' | 'SUBMITTED' | 'ACKNOWLEDGED';
          acknowledged_at: string | null;
          metadata: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          cycle_id?: string | null;
          employee_id?: string | null;
          reviewer_id?: string | null;
          review_date?: string | null;
          overall_rating?: number | null;
          competency_ratings?: Json | null;
          strengths?: string | null;
          areas_for_improvement?: string | null;
          goals?: string | null;
          comments?: string | null;
          status?: 'DRAFT' | 'SUBMITTED' | 'ACKNOWLEDGED';
          acknowledged_at?: string | null;
          metadata?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          cycle_id?: string | null;
          employee_id?: string | null;
          reviewer_id?: string | null;
          review_date?: string | null;
          overall_rating?: number | null;
          competency_ratings?: Json | null;
          strengths?: string | null;
          areas_for_improvement?: string | null;
          goals?: string | null;
          comments?: string | null;
          status?: 'DRAFT' | 'SUBMITTED' | 'ACKNOWLEDGED';
          acknowledged_at?: string | null;
          metadata?: Json | null;
          updated_at?: string;
        };
      };

      employee_goals: {
        Row: {
          id: string;
          employee_id: string | null;
          cycle_id: string | null;
          title: string;
          description: string | null;
          category: string | null;
          target_date: string | null;
          progress_percentage: number;
          status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
          metadata: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          employee_id?: string | null;
          cycle_id?: string | null;
          title: string;
          description?: string | null;
          category?: string | null;
          target_date?: string | null;
          progress_percentage?: number;
          status?: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
          metadata?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          employee_id?: string | null;
          cycle_id?: string | null;
          title?: string;
          description?: string | null;
          category?: string | null;
          target_date?: string | null;
          progress_percentage?: number;
          status?: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
          metadata?: Json | null;
          updated_at?: string;
        };
      };

      // ====================================================================
      // HR: RECRUITMENT
      // ====================================================================

      vacancies: {
        Row: {
          id: string;
          organization_id: string | null;
          department_id: string | null;
          vacancy_number: string;
          job_title: string;
          job_title_ar: string | null;
          description: string | null;
          employment_type: string | null;
          salary_grade: string | null;
          positions_available: number;
          requirements: Json | null;
          benefits: Json | null;
          posted_date: string | null;
          closing_date: string | null;
          status: 'DRAFT' | 'OPEN' | 'CLOSED' | 'FILLED' | 'CANCELLED';
          metadata: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id?: string | null;
          department_id?: string | null;
          vacancy_number: string;
          job_title: string;
          job_title_ar?: string | null;
          description?: string | null;
          employment_type?: string | null;
          salary_grade?: string | null;
          positions_available?: number;
          requirements?: Json | null;
          benefits?: Json | null;
          posted_date?: string | null;
          closing_date?: string | null;
          status?: 'DRAFT' | 'OPEN' | 'CLOSED' | 'FILLED' | 'CANCELLED';
          metadata?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string | null;
          department_id?: string | null;
          vacancy_number?: string;
          job_title?: string;
          job_title_ar?: string | null;
          description?: string | null;
          employment_type?: string | null;
          salary_grade?: string | null;
          positions_available?: number;
          requirements?: Json | null;
          benefits?: Json | null;
          posted_date?: string | null;
          closing_date?: string | null;
          status?: 'DRAFT' | 'OPEN' | 'CLOSED' | 'FILLED' | 'CANCELLED';
          metadata?: Json | null;
          updated_at?: string;
        };
      };

      candidates: {
        Row: {
          id: string;
          vacancy_id: string | null;
          first_name: string;
          last_name: string;
          first_name_ar: string | null;
          last_name_ar: string | null;
          email: string | null;
          phone: string | null;
          resume_url: string | null;
          cover_letter: string | null;
          experience_years: number | null;
          education: Json | null;
          skills: Json | null;
          pipeline_stage: 'APPLIED' | 'SCREENING' | 'INTERVIEW' | 'ASSESSMENT' | 'OFFER' | 'HIRED' | 'REJECTED';
          interview_date: string | null;
          interview_notes: string | null;
          rating: number | null;
          metadata: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          vacancy_id?: string | null;
          first_name: string;
          last_name: string;
          first_name_ar?: string | null;
          last_name_ar?: string | null;
          email?: string | null;
          phone?: string | null;
          resume_url?: string | null;
          cover_letter?: string | null;
          experience_years?: number | null;
          education?: Json | null;
          skills?: Json | null;
          pipeline_stage?: 'APPLIED' | 'SCREENING' | 'INTERVIEW' | 'ASSESSMENT' | 'OFFER' | 'HIRED' | 'REJECTED';
          interview_date?: string | null;
          interview_notes?: string | null;
          rating?: number | null;
          metadata?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          vacancy_id?: string | null;
          first_name?: string;
          last_name?: string;
          first_name_ar?: string | null;
          last_name_ar?: string | null;
          email?: string | null;
          phone?: string | null;
          resume_url?: string | null;
          cover_letter?: string | null;
          experience_years?: number | null;
          education?: Json | null;
          skills?: Json | null;
          pipeline_stage?: 'APPLIED' | 'SCREENING' | 'INTERVIEW' | 'ASSESSMENT' | 'OFFER' | 'HIRED' | 'REJECTED';
          interview_date?: string | null;
          interview_notes?: string | null;
          rating?: number | null;
          metadata?: Json | null;
          updated_at?: string;
        };
      };

      // ====================================================================
      // HR: BENEFITS
      // ====================================================================

      benefit_plans: {
        Row: {
          id: string;
          organization_id: string | null;
          code: string;
          name: string;
          type: string;
          description: string | null;
          eligibility_criteria: Json | null;
          employer_contribution: number;
          employee_contribution: number;
          active: boolean;
          metadata: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id?: string | null;
          code: string;
          name: string;
          type: string;
          description?: string | null;
          eligibility_criteria?: Json | null;
          employer_contribution?: number;
          employee_contribution?: number;
          active?: boolean;
          metadata?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string | null;
          code?: string;
          name?: string;
          type?: string;
          description?: string | null;
          eligibility_criteria?: Json | null;
          employer_contribution?: number;
          employee_contribution?: number;
          active?: boolean;
          metadata?: Json | null;
        };
      };

      benefit_enrollments: {
        Row: {
          id: string;
          plan_id: string | null;
          employee_id: string | null;
          enrollment_date: string;
          effective_date: string;
          termination_date: string | null;
          status: 'ACTIVE' | 'SUSPENDED' | 'TERMINATED';
          metadata: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          plan_id?: string | null;
          employee_id?: string | null;
          enrollment_date: string;
          effective_date: string;
          termination_date?: string | null;
          status?: 'ACTIVE' | 'SUSPENDED' | 'TERMINATED';
          metadata?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          plan_id?: string | null;
          employee_id?: string | null;
          enrollment_date?: string;
          effective_date?: string;
          termination_date?: string | null;
          status?: 'ACTIVE' | 'SUSPENDED' | 'TERMINATED';
          metadata?: Json | null;
        };
      };

      // ====================================================================
      // CLINICAL: ENCOUNTERS & APPOINTMENTS
      // ====================================================================

      encounters: {
        Row: {
          id: string;
          organization_id: string | null;
          encounter_number: string;
          encounter_date: string;
          patient_id: string | null;
          practitioner_id: string | null;
          department_id: string | null;
          location_id: string | null;
          type: 'OUTPATIENT' | 'INPATIENT' | 'EMERGENCY' | 'SURGERY';
          status: 'PLANNED' | 'IN_PROGRESS' | 'FINISHED' | 'CANCELLED';
          chief_complaint: string | null;
          diagnosis: string | null;
          treatment_plan: string | null;
          admission_date: string | null;
          discharge_date: string | null;
          metadata: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id?: string | null;
          encounter_number: string;
          encounter_date?: string;
          patient_id?: string | null;
          practitioner_id?: string | null;
          department_id?: string | null;
          location_id?: string | null;
          type: 'OUTPATIENT' | 'INPATIENT' | 'EMERGENCY' | 'SURGERY';
          status?: 'PLANNED' | 'IN_PROGRESS' | 'FINISHED' | 'CANCELLED';
          chief_complaint?: string | null;
          diagnosis?: string | null;
          treatment_plan?: string | null;
          admission_date?: string | null;
          discharge_date?: string | null;
          metadata?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string | null;
          encounter_number?: string;
          encounter_date?: string;
          patient_id?: string | null;
          practitioner_id?: string | null;
          department_id?: string | null;
          location_id?: string | null;
          type?: 'OUTPATIENT' | 'INPATIENT' | 'EMERGENCY' | 'SURGERY';
          status?: 'PLANNED' | 'IN_PROGRESS' | 'FINISHED' | 'CANCELLED';
          chief_complaint?: string | null;
          diagnosis?: string | null;
          treatment_plan?: string | null;
          admission_date?: string | null;
          discharge_date?: string | null;
          metadata?: Json | null;
          updated_at?: string;
        };
      };

      appointments: {
        Row: {
          id: string;
          organization_id: string | null;
          appointment_number: string;
          patient_id: string | null;
          practitioner_id: string | null;
          department_id: string | null;
          service_id: string | null;
          appointment_date: string;
          start_time: string;
          end_time: string;
          status: 'BOOKED' | 'CONFIRMED' | 'ARRIVED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
          reason: string | null;
          notes: string | null;
          encounter_id: string | null;
          metadata: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id?: string | null;
          appointment_number: string;
          patient_id?: string | null;
          practitioner_id?: string | null;
          department_id?: string | null;
          service_id?: string | null;
          appointment_date: string;
          start_time: string;
          end_time: string;
          status?: 'BOOKED' | 'CONFIRMED' | 'ARRIVED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
          reason?: string | null;
          notes?: string | null;
          encounter_id?: string | null;
          metadata?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string | null;
          appointment_number?: string;
          patient_id?: string | null;
          practitioner_id?: string | null;
          department_id?: string | null;
          service_id?: string | null;
          appointment_date?: string;
          start_time?: string;
          end_time?: string;
          status?: 'BOOKED' | 'CONFIRMED' | 'ARRIVED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
          reason?: string | null;
          notes?: string | null;
          encounter_id?: string | null;
          metadata?: Json | null;
          updated_at?: string;
        };
      };

      // ====================================================================
      // FINANCE: ACCOUNTING
      // ====================================================================

      chart_of_accounts: {
        Row: {
          id: string;
          organization_id: string | null;
          account_code: string;
          account_name: string;
          account_name_ar: string | null;
          account_type: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';
          account_subtype: string | null;
          parent_id: string | null;
          normal_balance: 'DEBIT' | 'CREDIT';
          current_balance: number;
          allow_posting: boolean;
          active: boolean;
          metadata: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id?: string | null;
          account_code: string;
          account_name: string;
          account_name_ar?: string | null;
          account_type: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';
          account_subtype?: string | null;
          parent_id?: string | null;
          normal_balance: 'DEBIT' | 'CREDIT';
          current_balance?: number;
          allow_posting?: boolean;
          active?: boolean;
          metadata?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string | null;
          account_code?: string;
          account_name?: string;
          account_name_ar?: string | null;
          account_type?: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';
          account_subtype?: string | null;
          parent_id?: string | null;
          normal_balance?: 'DEBIT' | 'CREDIT';
          current_balance?: number;
          allow_posting?: boolean;
          active?: boolean;
          metadata?: Json | null;
        };
      };

      cost_centers: {
        Row: {
          id: string;
          organization_id: string | null;
          department_id: string | null;
          code: string;
          name: string;
          name_ar: string | null;
          type: 'REVENUE' | 'COST' | 'PROFIT' | null;
          annual_budget: number;
          actual_spending: number;
          active: boolean;
          metadata: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id?: string | null;
          department_id?: string | null;
          code: string;
          name: string;
          name_ar?: string | null;
          type?: 'REVENUE' | 'COST' | 'PROFIT' | null;
          annual_budget?: number;
          actual_spending?: number;
          active?: boolean;
          metadata?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string | null;
          department_id?: string | null;
          code?: string;
          name?: string;
          name_ar?: string | null;
          type?: 'REVENUE' | 'COST' | 'PROFIT' | null;
          annual_budget?: number;
          actual_spending?: number;
          active?: boolean;
          metadata?: Json | null;
        };
      };

      journal_entries: {
        Row: {
          id: string;
          organization_id: string | null;
          entry_number: string;
          entry_date: string;
          posting_date: string | null;
          description: string;
          reference: string | null;
          entry_type: 'STANDARD' | 'ADJUSTING' | 'CLOSING' | 'REVERSING';
          status: 'DRAFT' | 'POSTED' | 'VOID';
          total_debit: number;
          total_credit: number;
          created_by: string | null;
          posted_by: string | null;
          posted_at: string | null;
          invoice_id: string | null;
          payment_id: string | null;
          payroll_period_id: string | null;
          metadata: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id?: string | null;
          entry_number: string;
          entry_date: string;
          posting_date?: string | null;
          description: string;
          reference?: string | null;
          entry_type?: 'STANDARD' | 'ADJUSTING' | 'CLOSING' | 'REVERSING';
          status?: 'DRAFT' | 'POSTED' | 'VOID';
          total_debit: number;
          total_credit: number;
          created_by?: string | null;
          posted_by?: string | null;
          posted_at?: string | null;
          invoice_id?: string | null;
          payment_id?: string | null;
          payroll_period_id?: string | null;
          metadata?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string | null;
          entry_number?: string;
          entry_date?: string;
          posting_date?: string | null;
          description?: string;
          reference?: string | null;
          entry_type?: 'STANDARD' | 'ADJUSTING' | 'CLOSING' | 'REVERSING';
          status?: 'DRAFT' | 'POSTED' | 'VOID';
          total_debit?: number;
          total_credit?: number;
          created_by?: string | null;
          posted_by?: string | null;
          posted_at?: string | null;
          invoice_id?: string | null;
          payment_id?: string | null;
          payroll_period_id?: string | null;
          metadata?: Json | null;
          updated_at?: string;
        };
      };

      journal_entry_lines: {
        Row: {
          id: string;
          entry_id: string | null;
          line_number: number;
          account_id: string | null;
          cost_center_id: string | null;
          description: string | null;
          debit_amount: number;
          credit_amount: number;
          metadata: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          entry_id?: string | null;
          line_number: number;
          account_id?: string | null;
          cost_center_id?: string | null;
          description?: string | null;
          debit_amount?: number;
          credit_amount?: number;
          metadata?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          entry_id?: string | null;
          line_number?: number;
          account_id?: string | null;
          cost_center_id?: string | null;
          description?: string | null;
          debit_amount?: number;
          credit_amount?: number;
          metadata?: Json | null;
        };
      };

      // ====================================================================
      // STAKEHOLDERS
      // ====================================================================

      stakeholders: {
        Row: {
          id: string;
          organization_id: string | null;
          code: string;
          name: string;
          name_ar: string | null;
          type: 'PARTNER' | 'SHAREHOLDER' | 'INVESTOR' | 'FOUNDER';
          ownership_percentage: number | null;
          investment_amount: number | null;
          contact: Json | null;
          active: boolean;
          metadata: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id?: string | null;
          code: string;
          name: string;
          name_ar?: string | null;
          type: 'PARTNER' | 'SHAREHOLDER' | 'INVESTOR' | 'FOUNDER';
          ownership_percentage?: number | null;
          investment_amount?: number | null;
          contact?: Json | null;
          active?: boolean;
          metadata?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string | null;
          code?: string;
          name?: string;
          name_ar?: string | null;
          type?: 'PARTNER' | 'SHAREHOLDER' | 'INVESTOR' | 'FOUNDER';
          ownership_percentage?: number | null;
          investment_amount?: number | null;
          contact?: Json | null;
          active?: boolean;
          metadata?: Json | null;
          updated_at?: string;
        };
      };

      stakeholder_distributions: {
        Row: {
          id: string;
          stakeholder_id: string | null;
          distribution_date: string;
          period_start: string;
          period_end: string;
          total_profit: number;
          distribution_amount: number;
          status: 'PENDING' | 'APPROVED' | 'PAID';
          paid_date: string | null;
          payment_reference: string | null;
          metadata: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          stakeholder_id?: string | null;
          distribution_date: string;
          period_start: string;
          period_end: string;
          total_profit: number;
          distribution_amount: number;
          status?: 'PENDING' | 'APPROVED' | 'PAID';
          paid_date?: string | null;
          payment_reference?: string | null;
          metadata?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          stakeholder_id?: string | null;
          distribution_date?: string;
          period_start?: string;
          period_end?: string;
          total_profit?: number;
          distribution_amount?: number;
          status?: 'PENDING' | 'APPROVED' | 'PAID';
          paid_date?: string | null;
          payment_reference?: string | null;
          metadata?: Json | null;
        };
      };

      // ====================================================================
      // AUDIT & SYSTEM
      // ====================================================================

      audit_log: {
        Row: {
          id: string;
          organization_id: string | null;
          table_name: string;
          record_id: string;
          action: 'INSERT' | 'UPDATE' | 'DELETE';
          user_id: string | null;
          user_email: string | null;
          user_role: string | null;
          old_values: Json | null;
          new_values: Json | null;
          ip_address: string | null;
          user_agent: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id?: string | null;
          table_name: string;
          record_id: string;
          action: 'INSERT' | 'UPDATE' | 'DELETE';
          user_id?: string | null;
          user_email?: string | null;
          user_role?: string | null;
          old_values?: Json | null;
          new_values?: Json | null;
          ip_address?: string | null;
          user_agent?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string | null;
          table_name?: string;
          record_id?: string;
          action?: 'INSERT' | 'UPDATE' | 'DELETE';
          user_id?: string | null;
          user_email?: string | null;
          user_role?: string | null;
          old_values?: Json | null;
          new_values?: Json | null;
          ip_address?: string | null;
          user_agent?: string | null;
        };
      };

      system_settings: {
        Row: {
          id: string;
          organization_id: string | null;
          setting_key: string;
          setting_value: Json;
          setting_type: 'STRING' | 'NUMBER' | 'BOOLEAN' | 'JSON';
          description: string | null;
          updated_by: string | null;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id?: string | null;
          setting_key: string;
          setting_value: Json;
          setting_type: 'STRING' | 'NUMBER' | 'BOOLEAN' | 'JSON';
          description?: string | null;
          updated_by?: string | null;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string | null;
          setting_key?: string;
          setting_value?: Json;
          setting_type?: 'STRING' | 'NUMBER' | 'BOOLEAN' | 'JSON';
          description?: string | null;
          updated_by?: string | null;
          updated_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
}

// ============================================================================
// CONVENIENCE TYPE HELPERS
// ============================================================================

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];
export type InsertTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert'];
export type UpdateTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update'];

// Common entity aliases
export type Organization = Tables<'organizations'>;
export type Department = Tables<'departments'>;
export type Location = Tables<'locations'>;
export type Employee = Tables<'employees'>;
export type Patient = Tables<'patients'>;
export type InsuranceProvider = Tables<'insurance_providers'>;
export type InsurancePolicy = Tables<'insurance_policies'>;
export type ServiceCatalog = Tables<'service_catalog'>;
export type Invoice = Tables<'invoices'>;
export type InvoiceLineItem = Tables<'invoice_line_items'>;
export type Payment = Tables<'payments'>;
export type Return = Tables<'returns'>;
export type InventoryItem = Tables<'inventory_items'>;
export type InventoryBatch = Tables<'inventory_batches'>;
export type InventoryMovement = Tables<'inventory_movements'>;
export type Supplier = Tables<'suppliers'>;
export type PurchaseRequisition = Tables<'purchase_requisitions'>;
export type PurchaseRequisitionItem = Tables<'purchase_requisition_items'>;
export type PurchaseOrder = Tables<'purchase_orders'>;
export type PurchaseOrderItem = Tables<'purchase_order_items'>;
export type AttendanceRecord = Tables<'attendance_records'>;
export type LeaveType = Tables<'leave_types'>;
export type LeaveBalance = Tables<'leave_balances'>;
export type LeaveRequest = Tables<'leave_requests'>;
export type SalaryGrade = Tables<'salary_grades'>;
export type PayrollPeriod = Tables<'payroll_periods'>;
export type PayrollTransaction = Tables<'payroll_transactions'>;
export type EmployeeLoan = Tables<'employee_loans'>;
export type TrainingProgram = Tables<'training_programs'>;
export type TrainingSession = Tables<'training_sessions'>;
export type TrainingEnrollment = Tables<'training_enrollments'>;
export type PerformanceReviewCycle = Tables<'performance_review_cycles'>;
export type PerformanceReview = Tables<'performance_reviews'>;
export type EmployeeGoal = Tables<'employee_goals'>;
export type Vacancy = Tables<'vacancies'>;
export type Candidate = Tables<'candidates'>;
export type BenefitPlan = Tables<'benefit_plans'>;
export type BenefitEnrollment = Tables<'benefit_enrollments'>;
export type Encounter = Tables<'encounters'>;
export type Appointment = Tables<'appointments'>;
export type ChartOfAccount = Tables<'chart_of_accounts'>;
export type CostCenter = Tables<'cost_centers'>;
export type JournalEntry = Tables<'journal_entries'>;
export type JournalEntryLine = Tables<'journal_entry_lines'>;
export type Stakeholder = Tables<'stakeholders'>;
export type StakeholderDistribution = Tables<'stakeholder_distributions'>;
export type AuditLog = Tables<'audit_log'>;
export type SystemSetting = Tables<'system_settings'>;
