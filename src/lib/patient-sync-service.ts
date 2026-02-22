import { supabase } from '@/lib/supabase/client';

export interface SupabasePatient {
  id: string;
  patient_id: string;
  patient_number: string;
  first_name_ar: string;
  last_name_ar: string;
  first_name_en?: string;
  last_name_en?: string;
  full_name_ar: string;
  full_name_en?: string;
  date_of_birth?: string;
  gender: string;
  phone?: string;
  email?: string;
  national_id?: string;
  governorate?: string;
  total_balance: number;
  is_active: boolean;
  created_at: string;
  openehr_patient_id?: string; // Reference to original OpenEHR patient
}

export interface OpenEHRPatient {
  patientid: string;
  firstname: string;
  lastname: string;
  phone?: string;
  email?: string;
  nationalid?: string;
  address?: string;
  dateofbirth?: string;
  gender?: string;
  workspaceid?: string;
  createdat?: string;
}

class PatientSyncService {
  private supabase = supabase as any;

  // Copy a patient from OpenEHR to Supabase
  async copyPatientFromOpenEHR(openEHRPatient: OpenEHRPatient): Promise<SupabasePatient | null> {
    try {
      // Check if patient already exists in Supabase
      const { data: existing } = await this.supabase
        .from('patients')
        .select('*')
        .eq('openehr_patient_id', openEHRPatient.patientid)
        .single();

      if (existing) {
        console.log('Patient already exists in Supabase:', existing.patient_id);
        return existing;
      }

      // Create new patient record for Supabase
      const patientId = `sp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const patientNumber = `SP-${String(Math.floor(Math.random() * 99999)).padStart(5, '0')}`;
      const fullNameAr = `${openEHRPatient.firstname || ''} ${openEHRPatient.lastname || ''}`.trim();
      const fullNameEn = `${openEHRPatient.firstname || ''} ${openEHRPatient.lastname || ''}`.trim();

      const newPatient = {
        patient_id: patientId,
        patient_number: patientNumber,
        first_name_ar: openEHRPatient.firstname || '',
        last_name_ar: openEHRPatient.lastname || '',
        first_name_en: openEHRPatient.firstname || '',
        last_name_en: openEHRPatient.lastname || '',
        full_name_ar: fullNameAr,
        full_name_en: fullNameEn,
        date_of_birth: openEHRPatient.dateofbirth || null,
        gender: (openEHRPatient.gender || 'MALE').toUpperCase(),
        phone: openEHRPatient.phone || null,
        email: openEHRPatient.email || null,
        national_id: openEHRPatient.nationalid || null,
        governorate: openEHRPatient.address || null,
        total_balance: 0,
        is_active: true,
        created_at: new Date().toISOString(),
        openehr_patient_id: openEHRPatient.patientid, // Keep reference to OpenEHR
      };

      const { data, error } = await this.supabase
        .from('patients')
        .insert(newPatient)
        .select()
        .single();

      if (error) {
        console.error('Error copying patient to Supabase:', error);
        return null;
      }

      console.log('✅ Patient copied to Supabase:', data.patient_id);
      return data;
    } catch (error) {
      console.error('Error in copyPatientFromOpenEHR:', error);
      return null;
    }
  }

  // Get patient by OpenEHR ID from Supabase
  async getPatientByOpenEHRId(openehrPatientId: string): Promise<SupabasePatient | null> {
    try {
      const { data, error } = await this.supabase
        .from('patients')
        .select('*')
        .eq('openehr_patient_id', openehrPatientId)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error getting patient by OpenEHR ID:', error);
      return null;
    }
  }

  // Search patients in Supabase (including copied from OpenEHR)
  async searchPatients(query: string): Promise<SupabasePatient[]> {
    try {
      const { data, error } = await this.supabase
        .from('patients')
        .select('*')
        .eq('is_active', true)
        .or(`full_name_ar.ilike.%${query}%,full_name_en.ilike.%${query}%,phone.ilike.%${query}%,patient_number.ilike.%${query}%`)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error searching patients in Supabase:', error);
      return [];
    }
  }

  // Get all patients from Supabase
  async getAllPatients(): Promise<SupabasePatient[]> {
    try {
      const { data, error } = await this.supabase
        .from('patients')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting all patients from Supabase:', error);
      return [];
    }
  }

  // Copy multiple patients from OpenEHR to Supabase
  async copyMultiplePatients(openEHRPatients: OpenEHRPatient[]): Promise<SupabasePatient[]> {
    const results: SupabasePatient[] = [];
    
    for (const patient of openEHRPatients) {
      const copied = await this.copyPatientFromOpenEHR(patient);
      if (copied) {
        results.push(copied);
      }
    }
    
    return results;
  }

  // Sync OpenEHR patient when creating invoice
  async syncPatientForInvoice(openehrPatientId: string): Promise<SupabasePatient | null> {
    try {
      // First check if patient already exists in Supabase
      const existing = await this.getPatientByOpenEHRId(openehrPatientId);
      if (existing) {
        return existing;
      }

      // If not, fetch from OpenEHR and copy to Supabase
      const response = await fetch('/api/tibbna-openehr-patients');
      if (!response.ok) {
        throw new Error('Failed to fetch OpenEHR patients');
      }

      const openEHRPatients = await response.json();
      const patientsArray = Array.isArray(openEHRPatients) ? openEHRPatients : (openEHRPatients.data || []);
      
      const targetPatient = patientsArray.find((p: any) => p.patientid === openehrPatientId);
      if (!targetPatient) {
        throw new Error('Patient not found in OpenEHR database');
      }

      return await this.copyPatientFromOpenEHR(targetPatient);
    } catch (error) {
      console.error('Error syncing patient for invoice:', error);
      return null;
    }
  }
}

export const patientSyncService = new PatientSyncService();
