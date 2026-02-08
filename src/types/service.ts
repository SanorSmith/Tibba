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
}
