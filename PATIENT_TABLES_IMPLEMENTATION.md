# Patient Registration System - Complete Implementation

## Overview
This document describes the implementation of a comprehensive patient registration system with separate tables for emergency contacts, insurance information, and medical information.

## Database Schema

### 1. Main Patients Table (Already Exists)
- **Table Name**: `patients`
- **Columns**: patientid, workspaceid, firstname, middlename, lastname, nationalid, dateofbirth, phone, email, address, medicalhistory, gender, bloodgroup, ehrid, createdat, updatedat

### 2. Patient Emergency Contacts Table (NEW)
- **Table Name**: `patient_emergency_contacts`
- **Purpose**: Store emergency contact information for each patient
- **Columns**:
  - `emergencycontactid` (UUID, PRIMARY KEY)
  - `patientid` (UUID, FOREIGN KEY → patients.patientid)
  - `contactname` (TEXT)
  - `contactphone` (TEXT)
  - `relationship` (TEXT)
  - `createdat` (TIMESTAMP)
  - `updatedat` (TIMESTAMP)

### 3. Patient Insurance Information Table (NEW)
- **Table Name**: `patient_insurance_information`
- **Purpose**: Store insurance details for each patient
- **Columns**:
  - `insuranceid` (UUID, PRIMARY KEY)
  - `patientid` (UUID, FOREIGN KEY → patients.patientid)
  - `insurancecompany` (TEXT)
  - `insurancenumber` (TEXT)
  - `policytype` (TEXT)
  - `coveragedetails` (JSONB)
  - `createdat` (TIMESTAMP)
  - `updatedat` (TIMESTAMP)

### 4. Patient Medical Information Table (NEW)
- **Table Name**: `patient_medical_information`
- **Purpose**: Store detailed medical information
- **Columns**:
  - `medicalinfoid` (UUID, PRIMARY KEY)
  - `patientid` (UUID, FOREIGN KEY → patients.patientid)
  - `allergies` (TEXT)
  - `chronicdiseases` (TEXT)
  - `currentmedications` (TEXT)
  - `medicalhistory` (TEXT)
  - `surgicalhistory` (TEXT)
  - `familyhistory` (TEXT)
  - `createdat` (TIMESTAMP)
  - `updatedat` (TIMESTAMP)

## SQL Execution Instructions

### Step 1: Run the SQL Schema
Execute the SQL file to create the three new tables:

```bash
# File location: database/patient_additional_tables.sql
```

You can run this in your Neon database console or using psql:

```sql
-- Copy and paste the contents of database/patient_additional_tables.sql
-- into your Neon SQL editor and execute
```

### Step 2: Verify Tables Were Created
```sql
-- Check if tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'patient_emergency_contacts',
  'patient_insurance_information',
  'patient_medical_information'
);

-- Check foreign key constraints
SELECT
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
AND tc.table_name LIKE 'patient_%';
```

## Form Field Mapping

### Personal Information Section
| UI Field | Form Variable | Database Table | Database Column |
|----------|---------------|----------------|-----------------|
| First Name (Arabic) | `first_name_ar` | `patients` | `firstname` |
| Last Name (Arabic) | `last_name_ar` | `patients` | `lastname` |
| Middle Name | `middle_name` | `patients` | `middlename` |
| First Name (English) | `first_name_en` | *(not stored)* | - |
| Last Name (English) | `last_name_en` | *(not stored)* | - |
| Date of Birth | `date_of_birth` | `patients` | `dateofbirth` |
| Gender | `gender` | `patients` | `gender` |
| Blood Group | `blood_group` | `patients` | `bloodgroup` |
| National ID | `national_id` | `patients` | `nationalid` |

### Contact Information Section
| UI Field | Form Variable | Database Table | Database Column |
|----------|---------------|----------------|-----------------|
| Phone Number | `phone` | `patients` | `phone` |
| Email Address | `email` | `patients` | `email` |
| Governorate | `governorate` | `patients` | `address` |
| Address | `address` | `patients` | `address` |

### Emergency Contact Section
| UI Field | Form Variable | Database Table | Database Column |
|----------|---------------|----------------|-----------------|
| Emergency Contact Name | `emergency_contact` | `patient_emergency_contacts` | `contactname` |
| Emergency Contact Phone | `emergency_phone` | `patient_emergency_contacts` | `contactphone` |

### Insurance Information Section
| UI Field | Form Variable | Database Table | Database Column |
|----------|---------------|----------------|-----------------|
| Insurance Company | `insurance_company` | `patient_insurance_information` | `insurancecompany` |
| Insurance Number | `insurance_number` | `patient_insurance_information` | `insurancenumber` |

### Medical Information Section
| UI Field | Form Variable | Database Table | Database Column |
|----------|---------------|----------------|-----------------|
| Allergies | `allergies` | `patient_medical_information` | `allergies` |
| Chronic Diseases | `chronic_diseases` | `patient_medical_information` | `chronicdiseases` |
| Current Medications | `current_medications` | `patient_medical_information` | `currentmedications` |
| Medical History | `medical_history` | `patient_medical_information` | `medicalhistory` |

## API Changes

### POST `/api/tibbna-openehr-patients`
**Purpose**: Create a new patient with all related information

**Request Body**:
```json
{
  "first_name_ar": "أحمد",
  "last_name_ar": "محمد",
  "middle_name": "عبد",
  "first_name_en": "Ahmed",
  "last_name_en": "Mohammed",
  "date_of_birth": "1990-01-01",
  "gender": "MALE",
  "blood_group": "A+",
  "national_id": "1234567890",
  "phone": "+964 770 123 4567",
  "email": "patient@email.com",
  "governorate": "Baghdad",
  "address": "Street, District, City",
  "emergency_contact": "Sarah Mohammed",
  "emergency_phone": "+964 770 987 6543",
  "insurance_company": "Iraqi Health Insurance",
  "insurance_number": "INS-123456",
  "allergies": "Penicillin, Peanuts",
  "chronic_diseases": "Diabetes, Hypertension",
  "current_medications": "Metformin 500mg",
  "medical_history": "Previous surgeries..."
}
```

**Implementation**:
- Uses database transactions to ensure atomicity
- Inserts into 4 tables: `patients`, `patient_emergency_contacts`, `patient_insurance_information`, `patient_medical_information`
- Rolls back all changes if any insert fails

### GET `/api/tibbna-openehr-patients`
**Purpose**: Retrieve patients with all related information

**Implementation**:
- Uses LEFT JOINs to fetch data from all 4 tables
- Returns complete patient information including emergency contacts, insurance, and medical data

**Query Structure**:
```sql
SELECT 
  p.*,
  ec.contactname, ec.contactphone,
  ins.insurancecompany, ins.insurancenumber,
  med.allergies, med.chronicdiseases, med.currentmedications
FROM patients p
LEFT JOIN patient_emergency_contacts ec ON p.patientid = ec.patientid
LEFT JOIN patient_insurance_information ins ON p.patientid = ins.patientid
LEFT JOIN patient_medical_information med ON p.patientid = med.patientid
```

## Frontend Changes

### File: `src/app/(dashboard)/reception/new/page.tsx`
**Changes**:
- Updated `handleSave()` function to send all form fields to API
- Added all emergency contact, insurance, and medical information fields to the request body

### File: `src/app/(dashboard)/reception/patients/page.tsx`
**Changes**:
- Modified `openCreate()` to navigate to `/reception/new` instead of opening a modal
- Removed the create/edit form modal from the patients list page

## Testing Checklist

### 1. Database Setup
- [ ] Execute SQL schema file in Neon database
- [ ] Verify all 3 tables were created
- [ ] Verify foreign key constraints are in place
- [ ] Verify indexes were created

### 2. Patient Registration
- [ ] Navigate to `/reception/new`
- [ ] Fill in all required fields (marked with *)
- [ ] Fill in optional fields (emergency contact, insurance, medical info)
- [ ] Submit the form
- [ ] Verify success message appears
- [ ] Verify redirect to `/reception/patients`

### 3. Data Verification
- [ ] Check `patients` table for new record
- [ ] Check `patient_emergency_contacts` table for emergency contact
- [ ] Check `patient_insurance_information` table for insurance data
- [ ] Check `patient_medical_information` table for medical data
- [ ] Verify all foreign keys point to the correct patient

### 4. Patient Retrieval
- [ ] Navigate to `/reception/patients`
- [ ] Verify patient appears in the list
- [ ] Search for the patient by name
- [ ] Search for the patient by phone number
- [ ] Verify all data is displayed correctly

## Benefits of This Architecture

1. **Data Normalization**: Separate tables reduce data redundancy
2. **Scalability**: Easy to add more emergency contacts or insurance policies per patient
3. **Performance**: Indexed foreign keys enable fast lookups
4. **Data Integrity**: Foreign key constraints ensure referential integrity
5. **Flexibility**: Can query specific information without loading all patient data
6. **Transaction Safety**: All-or-nothing inserts prevent partial data corruption

## Future Enhancements

1. Support multiple emergency contacts per patient
2. Support multiple insurance policies per patient
3. Add relationship field for emergency contacts
4. Add policy type and coverage details for insurance
5. Add surgical history and family history fields
6. Implement update/edit functionality for all sections
7. Add audit logging for all changes
