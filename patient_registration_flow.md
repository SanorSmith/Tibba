# Patient Registration Flow - Which Tables Data Goes To

## 🔄 When You Press "Register Patient" Button

### 1. Frontend Submit (`/reception/new/page.tsx`)
```javascript
// Form Data Collected:
const patientData = {
  // Personal Information
  first_name_ar, last_name_ar, first_name_en, middle_name, last_name_en,
  date_of_birth, gender, blood_group, national_id,
  
  // Contact Information  
  phone, email, governorate, address,
  
  // Emergency Contact
  emergency_contact, emergency_phone,
  
  // Insurance Information
  insurance_company, insurance_number,
  
  // Medical Information
  allergies, chronic_diseases, current_medications, medical_history
};

// API Call:
POST /api/tibbna-openehr-patients
```

### 2. Backend API (`/api/tibbna-openehr-patients/route.ts`)

The POST endpoint inserts data into **4 tables** in a **transaction**:

#### 🗄️ Table 1: `patients` (Main Patient Table)
```sql
INSERT INTO patients (
  patientid,           -- gen_random_uuid()
  ehrid,              -- Generated patient number (e.g., "P-2026-8075")
  firstname,          -- first_name_ar
  middlename,         -- middle_name
  lastname,           -- last_name_ar
  dateofbirth,        -- date_of_birth
  gender,             -- gender
  bloodgroup,         -- blood_group
  nationalid,         -- national_id
  phone,              -- phone
  email,              -- email
  address,            -- governorate/address
  workspaceid,        -- Fixed: 'b227528d-ca34-4850-9b72-94a220365d7f'
  createdat           -- NOW()
)
```

#### 🗄️ Table 2: `patient_emergency_contacts` (Emergency Contact Table)
```sql
INSERT INTO patient_emergency_contacts (
  patientid,          -- Links to patients.patientid
  contactname,        -- emergency_contact
  contactphone,       -- emergency_phone
  createdat,          -- NOW()
  updatedat           -- NOW()
)
-- Only inserted IF emergency_contact OR emergency_phone provided
```

#### 🗄️ Table 3: `patient_insurance_information` (Insurance Table)
```sql
INSERT INTO patient_insurance_information (
  patientid,          -- Links to patients.patientid
  insurancecompany,   -- insurance_company
  insurancenumber,    -- insurance_number
  createdat,          -- NOW()
  updatedat           -- NOW()
)
-- Only inserted IF insurance_company OR insurance_number provided
```

#### 🗄️ Table 4: `patient_medical_information` (Medical Info Table)
```sql
INSERT INTO patient_medical_information (
  patientid,          -- Links to patients.patientid
  allergies,          -- allergies
  chronicdiseases,    -- chronic_diseases
  currentmedications, -- current_medications
  medicalhistory,     -- medical_history
  createdat,          -- NOW()
  updatedat           -- NOW()
)
-- Only inserted IF any medical field provided
```

### 3. Transaction Safety
- **All 4 tables** are inserted in a single **transaction**
- If any insert fails, **all changes are rolled back**
- **Atomic operation** - either everything succeeds or nothing happens

### 4. Data Relationships
```
patients (1) ──── (1) patient_emergency_contacts
patients (1) ──── (1) patient_insurance_information  
patients (1) ──── (1) patient_medical_information
```

### 5. Field Mapping Summary

| Form Field | Table | Column |
|------------|-------|--------|
| first_name_ar | patients | firstname |
| last_name_ar | patients | lastname |
| phone | patients | phone |
| emergency_contact | patient_emergency_contacts | contactname |
| emergency_phone | patient_emergency_contacts | contactphone |
| insurance_company | patient_insurance_information | insurancecompany |
| insurance_number | patient_insurance_information | insurancenumber |
| allergies | patient_medical_information | allergies |
| chronic_diseases | patient_medical_information | chronicdiseases |
| current_medications | patient_medical_information | currentmedications |
| medical_history | patient_medical_information | medicalhistory |

## 🎯 Key Points

1. **Main patient data** goes to `patients` table
2. **Emergency contact** goes to `patient_emergency_contacts` table  
3. **Insurance info** goes to `patient_insurance_information` table
4. **Medical info** goes to `patient_medical_information` table
5. **All related tables** use the same `patientid` to link to the main patient
6. **Transaction ensures** data consistency across all tables
