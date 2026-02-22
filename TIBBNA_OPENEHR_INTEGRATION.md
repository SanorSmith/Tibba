# 🏥 Tibbna OpenEHR DB Integration - Complete Documentation

## Overview
All Finance module applications now connect to **Tibbna OpenEHR DB** (your teammate's OpenEHR-compliant database) instead of the local database for patient data.

---

## 🎯 What Was Integrated

### ✅ Finance Apps Now Using Tibbna OpenEHR DB:

1. **Finance Dashboard** (`/finance`)
   - Patient count from Tibbna OpenEHR DB
   - Shows connection badge

2. **Finance Patients** (`/finance/patients`)
   - Full CRUD operations (Create, Read, Update, Delete)
   - All patient data from Tibbna OpenEHR DB

3. **Finance Invoices** (`/finance/invoices`)
   - Patient search for invoice creation
   - Patient selection from Tibbna OpenEHR DB

4. **Finance Invoices New** (`/finance/invoices/new`)
   - Patient dropdown populated from Tibbna OpenEHR DB

5. **Finance Returns** (`/finance/returns`)
   - Patient data linked through invoices

6. **Finance Service Payments** (`/finance/service-payments`)
   - Patient names from invoice data

---

## 🔧 New Infrastructure Created

### 1. **API Route**: `/api/tibbna-openehr-patients`
**Location**: `src/app/api/tibbna-openehr-patients/route.ts`

**Endpoints**:
- `GET` - Fetch all patients or search
- `POST` - Create new patient
- `PUT` - Update existing patient
- `DELETE` - Delete patient

**Features**:
- Automatic field mapping between Finance app and OpenEHR structure
- Safe database operations (structure protected)
- Returns OpenEHR metadata (ehrid, workspaceid, medicalhistory)

### 2. **Centralized Service**: `tibbna-patients-service.ts`
**Location**: `src/lib/tibbna-patients-service.ts`

**Features**:
- Singleton pattern for efficient data management
- Built-in caching (5-minute cache duration)
- Helper functions for all CRUD operations
- Automatic format conversion

**Usage**:
```typescript
import { getAllTibbnaPatients, searchTibbnaPatients } from '@/lib/tibbna-patients-service';

// Get all patients
const patients = await getAllTibbnaPatients();

// Search patients
const results = await searchTibbnaPatients('John');
```

### 3. **UI Component**: `TibbnaDBBadge`
**Location**: `src/components/TibbnaDBBadge.tsx`

**Usage**:
```tsx
import TibbnaDBBadge from '@/components/TibbnaDBBadge';

// Default variant
<TibbnaDBBadge />

// Compact variant
<TibbnaDBBadge variant="compact" />
```

### 4. **Safe Database Access**: `safe-teammate-db.ts`
**Location**: `src/lib/safe-teammate-db.ts`

**Protection Features**:
- ✅ Allows: SELECT, INSERT, UPDATE, DELETE (data operations)
- 🚫 Blocks: ALTER, DROP, CREATE, TRUNCATE (schema operations)
- 🔒 OpenEHR system tables are READ-ONLY
- 🛡️ SQL injection protection
- ✅ Table whitelist validation

---

## 📊 Data Mapping

### Finance App → Tibbna OpenEHR DB

| Finance Field | OpenEHR Field | Notes |
|--------------|---------------|-------|
| `first_name_ar` | `firstname` | Arabic first name |
| `last_name_ar` | `lastname` | Arabic last name |
| `first_name_en` | `firstname` | English first name |
| `last_name_en` | `lastname` | English last name |
| `patient_id` | `patientid` | Unique identifier |
| `national_id` | `nationalid` | National ID number |
| `date_of_birth` | `dateofbirth` | Birth date |
| `phone` | `phone` | Contact number |
| `email` | `email` | Email address |
| `governorate` | `address` | Location |
| - | `ehrid` | OpenEHR EHR ID (new) |
| - | `workspaceid` | Workspace ID (new) |
| - | `medicalhistory` | Medical history (new) |

---

## 🔒 Database Protection

### What You CAN Do:
- ✅ **Read** any patient data
- ✅ **Create** new patient records
- ✅ **Update** existing patient records
- ✅ **Delete** patient records
- ✅ **Search** patients by name, email, phone

### What's BLOCKED:
- 🚫 **ALTER TABLE** - Cannot change database structure
- 🚫 **DROP TABLE** - Cannot delete tables
- 🚫 **CREATE TABLE** - Cannot create new tables
- 🚫 **TRUNCATE** - Cannot clear tables
- 🚫 **Modify OpenEHR system tables** - Read-only access

### OpenEHR System Tables (Read-Only):
- `ehr`, `composition`, `archetype`, `folder`
- `party_identified`, `participation`, `audit_details`
- `object_version_id`, `versioned_object`, `contribution`

---

## 🚀 How to Use

### Example 1: Get All Patients
```typescript
import { getAllTibbnaPatients } from '@/lib/tibbna-patients-service';

const patients = await getAllTibbnaPatients();
console.log(`Loaded ${patients.length} patients from Tibbna OpenEHR DB`);
```

### Example 2: Search Patients
```typescript
import { searchTibbnaPatients } from '@/lib/tibbna-patients-service';

const results = await searchTibbnaPatients('Ahmed');
// Returns patients matching "Ahmed" in name, email, or phone
```

### Example 3: Create Patient
```typescript
import { createTibbnaPatient } from '@/lib/tibbna-patients-service';

const newPatient = await createTibbnaPatient({
  first_name_ar: 'أحمد',
  last_name_ar: 'محمد',
  first_name_en: 'Ahmed',
  last_name_en: 'Mohammed',
  phone: '07901234567',
  email: 'ahmed@example.com',
  date_of_birth: '1990-01-01',
  gender: 'MALE'
});
```

### Example 4: Update Patient
```typescript
import { updateTibbnaPatient } from '@/lib/tibbna-patients-service';

await updateTibbnaPatient('patient-id-here', {
  phone: '07909876543',
  email: 'newemail@example.com'
});
```

### Example 5: Direct API Call
```typescript
// GET - Fetch patients
const response = await fetch('/api/tibbna-openehr-patients');
const result = await response.json();
console.log(result.data); // Array of patients

// POST - Create patient
const response = await fetch('/api/tibbna-openehr-patients', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    first_name_ar: 'أحمد',
    last_name_ar: 'محمد',
    phone: '07901234567'
  })
});
```

---

## 🎨 UI Updates

### Visual Indicators:
All Finance pages now show:
- **Green Badge**: "🏥 Tibbna OpenEHR DB"
- **Status Text**: "Connected to OpenEHR-compliant database"
- **Toast Notifications**: Confirm operations with "Tibbna OpenEHR DB"

### Example Locations:
- Finance Dashboard header
- Finance Patients page header
- Success/error messages

---

## 📁 Files Modified

### Created:
1. `src/app/api/tibbna-openehr-patients/route.ts` - API endpoint
2. `src/lib/tibbna-patients-service.ts` - Centralized service
3. `src/components/TibbnaDBBadge.tsx` - UI badge component
4. `src/lib/safe-teammate-db.ts` - Safe database wrapper
5. `src/app/safe-db-playground/page.tsx` - Testing interface
6. `src/app/teammate-schema/page.tsx` - Schema analyzer
7. `src/app/openehr-analysis/page.tsx` - OpenEHR compliance checker

### Modified:
1. `src/app/(dashboard)/finance/patients/page.tsx` - Uses Tibbna OpenEHR DB
2. `src/app/(dashboard)/finance/invoices/page.tsx` - Patient search updated
3. `src/app/(dashboard)/finance/invoices/new/page.tsx` - Patient dropdown updated
4. `src/app/(dashboard)/finance/page.tsx` - Dashboard patient count updated
5. `src/lib/supabase/teammate.ts` - Database connection configuration

---

## 🧪 Testing Tools

### 1. Safe Database Playground
**URL**: `http://localhost:3000/safe-db-playground`

Test CRUD operations safely:
- SELECT, INSERT, UPDATE, DELETE
- See real-time results
- Automatic validation

### 2. Database Schema Analyzer
**URL**: `http://localhost:3000/teammate-schema`

View complete database structure:
- All tables and columns
- Row counts
- Sample data

### 3. OpenEHR Compliance Checker
**URL**: `http://localhost:3000/openehr-analysis`

Analyze OpenEHR compliance:
- Detect OpenEHR patterns
- Check EHRbase integration
- View evidence

---

## ⚙️ Configuration

### Environment Variables
**File**: `.env.local`

```bash
# Tibbna OpenEHR DB Connection (Server-side only)
TEAMMATE_DATABASE_URL=postgresql://neondb_owner:npg_8FjAiWwJlhz7@ep-red-cherry-ag82jhqf-pooler.c-2.eu-central-1.aws.neon.tech/neondb
```

**Important**: This is a server-side variable (no `NEXT_PUBLIC_` prefix) for security.

---

## 🔐 Security Features

1. **Server-Side Only**: Database credentials never exposed to client
2. **API Gateway**: All database access through secure API routes
3. **Input Validation**: SQL injection protection
4. **Table Whitelist**: Only approved tables accessible
5. **Operation Restrictions**: Schema changes blocked
6. **OpenEHR Protection**: System tables read-only

---

## 📈 Benefits

1. **Single Source of Truth**: All Finance apps use same patient data
2. **OpenEHR Compliance**: Access to standardized clinical data
3. **Real-time Sync**: Changes immediately visible across all apps
4. **Safe Operations**: Structure protected, data accessible
5. **Teammate Independence**: They can modify schema without affecting you
6. **Centralized Management**: One service for all patient operations

---

## 🎯 Next Steps

### To Add More Finance Apps:
1. Import the service:
   ```typescript
   import { getAllTibbnaPatients } from '@/lib/tibbna-patients-service';
   ```

2. Load patients:
   ```typescript
   const patients = await getAllTibbnaPatients();
   ```

3. Add the badge:
   ```tsx
   import TibbnaDBBadge from '@/components/TibbnaDBBadge';
   <TibbnaDBBadge />
   ```

### To Extend Functionality:
- Add more helper methods to `tibbna-patients-service.ts`
- Create additional API endpoints for specific queries
- Add more UI components for OpenEHR data display

---

## 📞 Support

### Common Issues:

**Q: Patients not loading?**
A: Check that `TEAMMATE_DATABASE_URL` is set in `.env.local`

**Q: "Database not configured" error?**
A: Restart the dev server after adding environment variables

**Q: Can I modify the database structure?**
A: No, structure changes are blocked. Only data operations allowed.

**Q: How do I access OpenEHR clinical data?**
A: Use the `ehrid` field to query OpenEHR compositions through EHRbase API

---

## ✅ Summary

Your Finance module is now fully integrated with **Tibbna OpenEHR DB**:
- ✅ All patient data from teammate's OpenEHR database
- ✅ Safe operations with structure protection
- ✅ Centralized service for easy management
- ✅ Visual indicators showing connection status
- ✅ Complete CRUD operations supported
- ✅ OpenEHR compliance maintained

**Your teammate can continue developing their database schema independently while you safely access and manipulate patient data!** 🎉
