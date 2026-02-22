import { supabase } from '@/lib/supabase/client';
import { SupabaseClient } from '@supabase/supabase-js';

export interface PatientBridge {
  id: string;
  openehr_patient_id: string;
  openehr_patient_number: string;
  openehr_workspace_id?: string;
  patient_name_ar: string;
  patient_name_en?: string;
  phone?: string;
  email?: string;
  national_id?: string;
  governorate?: string;
  date_of_birth?: string;
  gender?: string;
  created_at: string;
  updated_at: string;
  is_active: boolean;
}

export interface OpenEHRPatient {
  patientid: string;
  patient_number?: string;
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

class PatientBridgeService {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = supabase as any; // Type assertion to bypass strict typing
  }

  // Sync a patient from OpenEHR to the bridge table
  async syncPatientFromOpenEHR(openEHRPatient: OpenEHRPatient): Promise<PatientBridge | null> {
    try {
      // Check if patient already exists in bridge
      const { data: existing } = await this.supabase
        .from('patient_bridge')
        .select('*')
        .eq('openehr_patient_id', openEHRPatient.patientid)
        .single();

      const patientData = {
        openehr_patient_id: openEHRPatient.patientid,
        openehr_patient_number: openEHRPatient.patient_number || openEHRPatient.patientid,
        openehr_workspace_id: openEHRPatient.workspaceid,
        patient_name_ar: `${openEHRPatient.firstname} ${openEHRPatient.lastname}`,
        patient_name_en: `${openEHRPatient.firstname} ${openEHRPatient.lastname}`,
        phone: openEHRPatient.phone,
        email: openEHRPatient.email,
        national_id: openEHRPatient.nationalid,
        governorate: openEHRPatient.address,
        date_of_birth: openEHRPatient.dateofbirth,
        gender: openEHRPatient.gender,
      };

      if (existing) {
        // Update existing patient
        const { data, error } = await this.supabase
          .from('patient_bridge')
          .update(patientData)
          .eq('id', existing.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        // Insert new patient
        const { data, error } = await this.supabase
          .from('patient_bridge')
          .insert(patientData)
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    } catch (error) {
      console.error('Error syncing patient from OpenEHR:', error);
      return null;
    }
  }

  // Get patient by OpenEHR ID
  async getPatientByOpenEHRId(openehrPatientId: string): Promise<PatientBridge | null> {
    try {
      const { data, error } = await this.supabase
        .from('patient_bridge')
        .select('*')
        .eq('openehr_patient_id', openehrPatientId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = not found
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error getting patient by OpenEHR ID:', error);
      return null;
    }
  }

  // Get all patients from bridge table
  async getAllPatients(): Promise<PatientBridge[]> {
    try {
      const { data, error } = await this.supabase
        .from('patient_bridge')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting all patients from bridge:', error);
      return [];
    }
  }

  // Search patients in bridge table
  async searchPatients(query: string): Promise<PatientBridge[]> {
    try {
      const { data, error } = await this.supabase
        .from('patient_bridge')
        .select('*')
        .eq('is_active', true)
        .or(`patient_name_ar.ilike.%${query}%,patient_name_en.ilike.%${query}%,phone.ilike.%${query}%,openehr_patient_number.ilike.%${query}%`)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error searching patients in bridge:', error);
      return [];
    }
  }

  // Delete patient from bridge (soft delete)
  async deletePatient(openehrPatientId: string): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('patient_bridge')
        .update({ is_active: false })
        .eq('openehr_patient_id', openehrPatientId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting patient from bridge:', error);
      return false;
    }
  }

  // Sync multiple patients from OpenEHR
  async syncMultiplePatients(openEHRPatients: OpenEHRPatient[]): Promise<PatientBridge[]> {
    const results: PatientBridge[] = [];
    
    for (const patient of openEHRPatients) {
      const synced = await this.syncPatientFromOpenEHR(patient);
      if (synced) {
        results.push(synced);
      }
    }
    
    return results;
  }
}

export const patientBridgeService = new PatientBridgeService();
