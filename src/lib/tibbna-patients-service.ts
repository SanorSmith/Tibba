// Centralized service for accessing Tibbna Non-Medical DB patients across all Finance apps

export interface TibbnaPatient {
  patient_id: string;
  patient_number: string;
  first_name_ar: string;
  last_name_ar: string;
  full_name_ar: string;
  first_name_en: string;
  last_name_en: string;
  full_name_en: string;
  date_of_birth: string;
  gender: string;
  phone: string;
  email?: string;
  national_id?: string;
  governorate?: string;
  total_balance: number;
  is_active: boolean;
  created_at: string;
  id: string;
  // Non-Medical DB specific fields
  ehrid?: string;
  workspaceid?: string;
  medicalhistory?: any;
  source: string;
}

class TibbnaPatientService {
  private static instance: TibbnaPatientService;
  private cache: TibbnaPatient[] | null = null;
  private cacheTime: number = 0;
  private CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  static getInstance(): TibbnaPatientService {
    if (!TibbnaPatientService.instance) {
      TibbnaPatientService.instance = new TibbnaPatientService();
    }
    return TibbnaPatientService.instance;
  }

  async getAllPatients(forceRefresh = false): Promise<TibbnaPatient[]> {
    const now = Date.now();
    
    // Return cached data if valid
    if (!forceRefresh && this.cache && (now - this.cacheTime) < this.CACHE_DURATION) {
      return this.cache;
    }

    try {
      const response = await fetch('/api/tibbna-openehr-patients');
      if (!response.ok) {
        throw new Error('Failed to fetch patients from Tibbna Non-Medical DB');
      }

      const result = await response.json();
      
      // API now returns raw array of patients, not wrapped in {success, data}
      const patients = Array.isArray(result) ? result : (result.data || []);
      
      // Map raw database fields to Finance app format
      const mappedPatients = patients.map((p: any) => ({
        patient_id: p.patientid || p.patient_id || p.id,
        patient_number: p.patientid || p.patient_number || p.id,
        first_name_ar: p.firstname || p.first_name_ar || '',
        last_name_ar: p.lastname || p.last_name_ar || '',
        full_name_ar: `${p.firstname || p.first_name_ar || ''} ${p.lastname || p.last_name_ar || ''}`.trim(),
        first_name_en: p.firstname || p.first_name_en || '',
        last_name_en: p.lastname || p.last_name_en || '',
        full_name_en: `${p.firstname || p.first_name_en || ''} ${p.lastname || p.last_name_en || ''}`.trim(),
        date_of_birth: p.dateofbirth || p.date_of_birth || '',
        gender: p.gender || 'MALE',
        phone: p.phone || '',
        email: p.email || '',
        national_id: p.nationalid || p.national_id || '',
        governorate: p.address || p.governorate || '',
        total_balance: 0,
        is_active: true,
        created_at: p.createdat || p.created_at || new Date().toISOString(),
        id: p.patientid || p.id,
        ehrid: p.ehrid,
        workspaceid: p.workspaceid,
        medicalhistory: p.medicalhistory,
        source: 'Tibbna Non-Medical DB'
      }));
      
      this.cache = mappedPatients;
      this.cacheTime = now;
      return mappedPatients;
    } catch (error) {
      console.error('Tibbna Non-Medical DB fetch error:', error);
      // Return cached data if available, even if expired
      if (this.cache) {
        return this.cache;
      }
      throw error;
    }
  }

  async searchPatients(query: string): Promise<TibbnaPatient[]> {
    if (query.length < 2) {
      return [];
    }

    try {
      const response = await fetch(`/api/tibbna-openehr-patients?search=${encodeURIComponent(query)}`);
      if (!response.ok) {
        throw new Error('Failed to search patients');
      }

      const result = await response.json();
      if (result.success) {
        return result.data;
      }
      return [];
    } catch (error) {
      console.error('Patient search error:', error);
      return [];
    }
  }

  async getPatientById(patientId: string): Promise<TibbnaPatient | null> {
    try {
      const patients = await this.getAllPatients();
      return patients.find(p => p.patient_id === patientId || p.id === patientId) || null;
    } catch (error) {
      console.error('Get patient by ID error:', error);
      return null;
    }
  }

  async createPatient(patientData: any): Promise<TibbnaPatient> {
    try {
      const response = await fetch('/api/tibbna-openehr-patients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patientData)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create patient');
      }

      const result = await response.json();
      if (result.success) {
        // Invalidate cache
        this.cache = null;
        return result.data[0];
      }
      throw new Error('Failed to create patient');
    } catch (error) {
      console.error('Create patient error:', error);
      throw error;
    }
  }

  async updatePatient(patientId: string, patientData: any): Promise<TibbnaPatient> {
    try {
      const response = await fetch('/api/tibbna-openehr-patients', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...patientData, patient_id: patientId })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update patient');
      }

      const result = await response.json();
      if (result.success) {
        // Invalidate cache
        this.cache = null;
        return result.data[0];
      }
      throw new Error('Failed to update patient');
    } catch (error) {
      console.error('Update patient error:', error);
      throw error;
    }
  }

  async deletePatient(patientId: string): Promise<void> {
    try {
      const response = await fetch(`/api/tibbna-openehr-patients?id=${patientId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete patient');
      }

      // Invalidate cache
      this.cache = null;
    } catch (error) {
      console.error('Delete patient error:', error);
      throw error;
    }
  }

  clearCache(): void {
    this.cache = null;
    this.cacheTime = 0;
  }

  // Helper method to convert to Finance app format
  toFinanceFormat(patient: TibbnaPatient): any {
    return {
      patient_id: patient.patient_id,
      patient_number: patient.patient_number,
      first_name_ar: patient.first_name_ar,
      last_name_ar: patient.last_name_ar,
      full_name_ar: patient.full_name_ar,
      first_name_en: patient.first_name_en,
      last_name_en: patient.last_name_en,
      full_name_en: patient.full_name_en,
      full_name: patient.full_name_en || patient.full_name_ar,
      date_of_birth: patient.date_of_birth,
      gender: patient.gender,
      phone: patient.phone,
      email: patient.email,
      national_id: patient.national_id,
      governorate: patient.governorate,
      total_balance: patient.total_balance,
      is_active: patient.is_active,
      created_at: patient.created_at,
      id: patient.id,
      // Non-Medical DB metadata
      ehrid: patient.ehrid,
      workspaceid: patient.workspaceid,
      source: 'Tibbna Non-Medical DB'
    };
  }
}

// Export singleton instance
export const tibbnaPatients = TibbnaPatientService.getInstance();

// Export helper functions for easy use
export const getAllTibbnaPatients = () => tibbnaPatients.getAllPatients();
export const searchTibbnaPatients = (query: string) => tibbnaPatients.searchPatients(query);
export const getTibbnaPatientById = (id: string) => tibbnaPatients.getPatientById(id);
export const createTibbnaPatient = (data: any) => tibbnaPatients.createPatient(data);
export const updateTibbnaPatient = (id: string, data: any) => tibbnaPatients.updatePatient(id, data);
export const deleteTibbnaPatient = (id: string) => tibbnaPatients.deletePatient(id);
