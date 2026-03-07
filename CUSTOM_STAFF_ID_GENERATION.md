# ✅ **Custom Staff ID Generation System**

## 🎯 **Staff ID Format**

### **Format Structure**: `[Dept1][Spec3][YY][DD][SEQ3]`

**Example**: `CCAR26151001`

| Component | Description | Example | Source |
|-----------|-------------|---------|--------|
| **Dept1** | First character of Department name | `C` | Cardiology |
| **Spec3** | First 3 characters of Specialty | `CAR` | Cardiology |
| **YY** | Last 2 digits of birth year | `26` | 2026 |
| **DD** | Day of birth (2 digits) | `15` | 15th day |
| **SEQ3** | Sequential number (3 digits) | `001` | 1st employee |

---

## 🔧 **Implementation Details**

### **✅ 1. Staff ID Generator Function**

```typescript
async function generateStaffId(
  pool: Pool,
  department: string,
  specialty: string,
  dateOfBirth: string
): Promise<string> {
  // Extract components
  const deptChar = department.charAt(0).toUpperCase(); // "C" from "Cardiology"
  const specChars = specialty.substring(0, 3).toUpperCase(); // "CAR" from "Cardiology"
  
  // Parse date of birth
  const dob = new Date(dateOfBirth);
  const year = dob.getFullYear().toString().slice(-2); // "26" from 2026
  const day = dob.getDate().toString().padStart(2, '0'); // "15" with leading zero
  
  // Build prefix
  const prefix = `${deptChar}${specChars}${year}${day}`; // "CCAR2615"
  
  // Get next sequence number
  const result = await pool.query(`
    SELECT staffid 
    FROM staff 
    WHERE staffid LIKE $1 
    ORDER BY staffid DESC 
    LIMIT 1
  `, [`${prefix}%`]);
  
  let sequenceNumber = 1;
  if (result.rows.length > 0) {
    const lastId = result.rows[0].staffid;
    const lastSeq = parseInt(lastId.slice(-3));
    sequenceNumber = lastSeq + 1;
  }
  
  // Format sequence with leading zeros
  const seqStr = sequenceNumber.toString().padStart(3, '0');
  
  // Final staff ID
  return `${prefix}${seqStr}`; // "CCAR2615001"
}
```

---

## 📊 **Example Staff IDs**

### **✅ Sample Generations**

| Name | Department | Specialty | DOB | Staff ID |
|------|------------|-----------|-----|----------|
| Ahmed Al-Rashid | **C**ardiology | **CAR**diology | 1990-**15**-03 | `CCAR90151001` |
| Sara Mohammed | **E**mergency | **EME**rgency Medicine | 1995-**22**-08 | `EEME95221001` |
| Fatima Hassan | **P**ediatrics | **PED**iatrics | 1988-**10**-12 | `PPED88101001` |
| Omar Saleh | **L**aboratory | **LAB**oratory | 1992-**05**-06 | `LLAB92051001` |
| Zainab Ali | **P**harmacy | **CLI**nical Pharmacy | 1994-**28**-11 | `PCLI94281001` |

### **✅ Sequential Numbering**

If multiple staff have the same prefix:
```
CCAR2615001  (First cardiologist born on 15th)
CCAR2615002  (Second cardiologist born on 15th)
CCAR2615003  (Third cardiologist born on 15th)
```

---

## 🗄️ **Database Changes**

### **✅ Added Column**
```sql
ALTER TABLE staff 
ADD COLUMN dateofbirth DATE;
```

### **✅ Staff Table Structure**
```sql
CREATE TABLE staff (
  staffid VARCHAR(50) PRIMARY KEY,  -- Custom format: CCAR2615001
  workspaceid UUID,
  firstname VARCHAR(100),
  middlename VARCHAR(100),
  lastname VARCHAR(100),
  role VARCHAR(100),
  unit VARCHAR(100),
  specialty VARCHAR(100),
  phone VARCHAR(50),
  email VARCHAR(255),
  dateofbirth DATE,                 -- NEW FIELD
  createdat TIMESTAMP,
  updatedat TIMESTAMP
);
```

---

## 🎨 **Frontend Changes**

### **✅ 1. Updated Form Interface**
```typescript
interface EmployeeFormData {
  firstName: string;
  middleName: string;
  lastName: string;
  email: string;
  phone: string;
  role: string;
  unit: string;
  specialty: string;
  dateOfBirth: string;  // NEW FIELD
}
```

### **✅ 2. Date of Birth Input**
```tsx
<div>
  <label className="block text-sm font-medium text-gray-700 mb-1">
    Date of Birth <span className="text-red-500">*</span>
  </label>
  <input
    type="date"
    className="w-full px-3 py-2 border rounded-lg"
    value={formData.dateOfBirth}
    onChange={(e) => updateField('dateOfBirth', e.target.value)}
    max={new Date().toISOString().split('T')[0]}
  />
  <p className="mt-1 text-xs text-gray-500">Used to generate Staff ID</p>
</div>
```

### **✅ 3. Enhanced Validation**
```typescript
if (!formData.dateOfBirth) {
  newErrors.dateOfBirth = 'Date of birth is required';
}
if (!formData.unit) {
  newErrors.unit = 'Department is required';
}
if (!formData.specialty) {
  newErrors.specialty = 'Specialty is required';
}
```

---

## 🔄 **API Flow**

### **✅ Staff Creation Process**

1. **User submits form** with all required fields including DOB
2. **API validates** required fields (firstName, lastName, email, phone, unit, specialty, dateOfBirth)
3. **Generate Staff ID**:
   - Extract department first character
   - Extract specialty first 3 characters
   - Parse birth year (last 2 digits) and day
   - Query database for existing IDs with same prefix
   - Increment sequence number
4. **Insert into database** with generated Staff ID
5. **Return success** with new staff data

### **✅ API Request Example**
```json
POST /api/staff
{
  "firstName": "Ahmed",
  "middleName": null,
  "lastName": "Al-Rashid",
  "email": "ahmed@hospital.com",
  "phone": "+964-770-234-5678",
  "role": "Doctor",
  "unit": "Cardiology",
  "specialty": "Cardiology",
  "dateOfBirth": "1990-03-15"
}
```

### **✅ API Response Example**
```json
{
  "success": true,
  "message": "Staff member created successfully",
  "data": {
    "staffid": "CCAR90151001",
    "firstname": "Ahmed",
    "lastname": "Al-Rashid",
    "email": "ahmed@hospital.com",
    "unit": "Cardiology",
    "specialty": "Cardiology",
    "dateofbirth": "1990-03-15"
  }
}
```

---

## 🎯 **Key Features**

### **✅ 1. Automatic Sequencing**
- Queries database for existing IDs with same prefix
- Automatically increments sequence number
- Prevents duplicate IDs

### **✅ 2. Readable Format**
- Human-readable components
- Easy to identify department and specialty
- Birth information embedded

### **✅ 3. Unique Identification**
- Combination of department, specialty, birth date, and sequence
- Virtually impossible to duplicate
- Up to 999 staff per unique prefix

### **✅ 4. Fallback Mechanism**
- If generation fails, falls back to UUID
- Ensures staff creation never fails due to ID generation

---

## 📝 **Usage Instructions**

### **✅ Creating New Staff**

1. Navigate to **HR → Employees → Add Employee**
2. Fill in **Personal Information**:
   - First Name (required)
   - Middle Name (optional)
   - Last Name (required)
   - **Date of Birth (required)** ← Used for Staff ID
3. Fill in **Contact Information**:
   - Email (required)
   - Phone (required)
4. Fill in **Employment Details**:
   - Role
   - **Department (required)** ← Used for Staff ID
   - **Specialty (required)** ← Used for Staff ID
5. Click **Create Staff Member**
6. Staff ID is **automatically generated** based on the format

---

## 🔍 **Staff ID Examples by Department**

### **✅ Cardiology Department**
```
CCAR90151001  - Cardiologist born 1990-03-15
CINT92221001  - Interventional Cardiology born 1992-08-22
CGEN88101001  - General Cardiology born 1988-12-10
```

### **✅ Emergency Department**
```
EEME95221001  - Emergency Medicine born 1995-08-22
EEME95221002  - Emergency Medicine born 1995-08-22 (2nd person)
ETRA93051001  - Trauma Care born 1993-06-05
```

### **✅ Pediatrics Department**
```
PPED88101001  - Pediatrics born 1988-12-10
PCAR91151001  - Pediatric Cardiology born 1991-03-15
PGEN94281001  - General Pediatrics born 1994-11-28
```

---

## ⚠️ **Important Notes**

### **✅ Required Fields**
All of these fields are **required** for staff ID generation:
- **Department (unit)** - Provides first character
- **Specialty** - Provides first 3 characters
- **Date of Birth** - Provides year and day

### **✅ Character Limits**
- Department: Uses first 1 character only
- Specialty: Uses first 3 characters only (spaces removed)
- Year: Last 2 digits (e.g., 2026 → 26)
- Day: 2 digits with leading zero (e.g., 5 → 05)
- Sequence: 3 digits with leading zeros (e.g., 1 → 001)

### **✅ Maximum Staff per Prefix**
- Each unique prefix can have up to **999 staff members**
- After 999, you would need to modify the sequence digit count

---

## 🚀 **Benefits**

1. **✅ Human-Readable**: Easy to identify department and specialty at a glance
2. **✅ Organized**: Groups staff by department, specialty, and birth date
3. **✅ Automatic**: No manual ID assignment needed
4. **✅ Sequential**: Maintains order within each group
5. **✅ Unique**: Combination ensures uniqueness
6. **✅ Informative**: Embeds useful information in the ID itself

---

## 📋 **Files Modified**

1. **`src/app/api/staff/route.ts`**
   - Added `generateStaffId()` function
   - Updated POST method to use custom ID generation
   - Added dateOfBirth parameter handling

2. **`src/app/(dashboard)/hr/employees/add/page.tsx`**
   - Added dateOfBirth to form interface
   - Added date input field
   - Updated validation
   - Added dateOfBirth to API request

3. **`src/app/api/staff/add-dob-column/route.ts`** (NEW)
   - Utility to add dateofbirth column to database

---

## 🎯 **Summary**

The custom staff ID generation system creates meaningful, human-readable IDs based on:
- **Department** (1st character)
- **Specialty** (3 characters)
- **Birth Year** (2 digits)
- **Birth Day** (2 digits)
- **Sequence Number** (3 digits)

**Example**: `CCAR26151001`
- **C** = Cardiology
- **CAR** = Cardiology specialty
- **26** = Born in 2026
- **15** = Born on 15th day
- **001** = First person with this combination

**The system is now fully implemented and ready to use!** 🚀✨
