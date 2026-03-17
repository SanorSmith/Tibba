// Staff Service - Fetch real staff data from database

interface StaffMember {
  id: string;
  staff_id: string;
  staffid: number;
  workspaceid: string;
  role: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  full_name: string;
  unit: string;
  department_name: string;
  specialty?: string;
  phone?: string;
  email?: string;
  date_of_birth?: string;
  created_at?: string;
  updated_at?: string;
}

interface StaffAPIResponse {
  success: boolean;
  data: StaffMember[];
  count: number;
  error?: string;
}

export class StaffService {
  private static async fetchFromAPI(endpoint: string): Promise<StaffAPIResponse> {
    try {
      const response = await fetch(endpoint);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching staff data:', error);
      return {
        success: false,
        data: [],
        count: 0,
        error: error instanceof Error ? error.message : 'Failed to fetch staff data'
      };
    }
  }

  static async getAllStaff(): Promise<StaffMember[]> {
    const response = await this.fetchFromAPI('/api/hr/staff');
    
    if (response.success) {
      return response.data;
    }
    
    console.error('Failed to fetch staff:', response.error);
    return [];
  }

  static async getStaffByRole(role: string): Promise<StaffMember[]> {
    const response = await this.fetchFromAPI(`/api/hr/staff?role=${encodeURIComponent(role)}`);
    
    if (response.success) {
      return response.data;
    }
    
    console.error(`Failed to fetch staff by role ${role}:`, response.error);
    return [];
  }

  static async getStaffByDepartment(department: string): Promise<StaffMember[]> {
    const response = await this.fetchFromAPI(`/api/hr/staff?unit=${encodeURIComponent(department)}`);
    
    if (response.success) {
      return response.data;
    }
    
    console.error(`Failed to fetch staff by department ${department}:`, response.error);
    return [];
  }

  static async getStaffById(staffId: string): Promise<StaffMember | null> {
    const response = await this.fetchFromAPI(`/api/hr/staff?staff_id=${encodeURIComponent(staffId)}`);
    
    if (response.success && response.data.length > 0) {
      return response.data[0];
    }
    
    return null;
  }

  // Convert staff data to match Employee interface for compatibility
  static convertToEmployee(staff: StaffMember): any {
    // Determine employee category based on role
    const roleLower = staff.role.toLowerCase();
    let employeeCategory: 'MEDICAL_STAFF' | 'NURSING' | 'TECHNICAL' | 'ADMINISTRATIVE' | 'SUPPORT';
    
    if (roleLower.includes('doctor') || roleLower.includes('physician')) {
      employeeCategory = 'MEDICAL_STAFF';
    } else if (roleLower.includes('nurse')) {
      employeeCategory = 'NURSING';
    } else if (roleLower.includes('tech') || roleLower.includes('lab') || roleLower.includes('radiology')) {
      employeeCategory = 'TECHNICAL';
    } else if (roleLower.includes('admin') || roleLower.includes('manager') || roleLower.includes('hr')) {
      employeeCategory = 'ADMINISTRATIVE';
    } else {
      employeeCategory = 'SUPPORT';
    }
    
    return {
      id: staff.id,
      employee_number: staff.staff_id,
      first_name: staff.first_name,
      middle_name: staff.middle_name,
      last_name: staff.last_name,
      full_name_arabic: staff.full_name,
      date_of_birth: staff.date_of_birth || '',
      age: 0,
      gender: 'MALE' as const,
      marital_status: 'SINGLE' as const,
      nationality: 'Iraqi',
      national_id: '',
      email: staff.email || '',
      phone: staff.phone || '',
      blood_type: 'O+',
      employment_type: 'FULL_TIME' as const,
      employee_category: employeeCategory,
      job_title: staff.role,
      department_id: staff.unit,
      department_name: staff.department_name,
      date_of_hire: staff.created_at || '',
      employment_status: 'ACTIVE' as const,
      basic_salary: 0,
      photo_url: `/avatars/default.jpg`,
      shift_id: 'SHIFT-DAY',
      education: [],
      licenses: []
    };
  }
}

export default StaffService;
