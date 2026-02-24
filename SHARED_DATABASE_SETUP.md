# Shared Database Setup Guide

## Overview
This guide explains how to connect the tibbna-hospital app to the **same database** as the tibbna GitHub appointments app, ensuring both applications share the same data.

---

## 🎯 Goal
- **Single Source of Truth**: Both apps read/write to the same PostgreSQL database
- **Shared Data**: Appointments, patients, and workspace data are synchronized
- **No Duplication**: No need to create separate tables - use existing schema

---

## 📋 Prerequisites

### 1. Get the Shared Database URL

You need the `DATABASE_URL` from your tibbna GitHub app deployment. This can be found in:

**Option A: Vercel Dashboard**
1. Go to your Vercel project for the tibbna app
2. Navigate to Settings → Environment Variables
3. Copy the `DATABASE_URL` value

**Option B: Local Development**
1. Check the `.env.local` file in your tibbna repository
2. Copy the `DATABASE_URL` value

The URL should look like:
```
postgresql://username:password@host:port/database?sslmode=require
```

---

## 🔧 Setup Steps

### Step 1: Update tibbna-hospital Environment Variables

Edit `tibbna-hospital/.env.local` and **replace** the current `DATABASE_URL` with the one from the tibbna GitHub app:

```env
# REPLACE THIS with the DATABASE_URL from tibbna GitHub app
DATABASE_URL="postgresql://[your-shared-database-url]?sslmode=require"

# Keep other variables as they are
NEXT_PUBLIC_SUPABASE_URL=https://ldabymaexuvyeygjqbby.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Step 2: DO NOT Run the Appointments Migration

**IMPORTANT**: Do NOT execute `database/create_appointments_table.sql`

The appointments table already exists in the shared database from the tibbna GitHub app. Running this migration will cause conflicts.

### Step 3: Verify Database Schema

The shared database should already have these tables (created by tibbna GitHub app):

```sql
-- Core tables
appointments (
  appointmentid UUID PRIMARY KEY,
  workspaceid UUID NOT NULL,
  patientid UUID NOT NULL,
  doctorid UUID,
  appointmentname appointment_name,
  appointmenttype appointment_type,
  clinicalindication TEXT,
  reasonforrequest TEXT,
  description TEXT,
  starttime TIMESTAMPTZ NOT NULL,
  endtime TIMESTAMPTZ NOT NULL,
  location TEXT,
  unit TEXT,
  status appointment_status,
  notes JSONB,
  createdat TIMESTAMPTZ,
  updatedat TIMESTAMPTZ
)

patients (
  patientid UUID PRIMARY KEY,
  workspaceid UUID NOT NULL,
  firstname TEXT,
  middlename TEXT,
  lastname TEXT,
  nationalid TEXT,
  dateofbirth DATE,
  phone TEXT,
  email TEXT,
  address TEXT,
  medicalhistory JSONB,
  createdat TIMESTAMPTZ,
  updatedat TIMESTAMPTZ
)

workspaces (
  workspaceid UUID PRIMARY KEY,
  name TEXT,
  -- other workspace fields
)
```

### Step 4: Update Workspace ID

The tibbna-hospital app is configured to use the same workspace ID as the tibbna GitHub app:

```typescript
// Already configured in appointments page
const workspaceid = 'fa9fb036-a7eb-49af-890c-54406dad139d';
```

This ensures both apps see the same appointments and patients.

---

## 🔄 How It Works

### API Compatibility

The appointments API in tibbna-hospital has been updated to:

1. **Use tibbna GitHub app's schema**:
   - Column names: `appointmentid`, `patientid`, `doctorid`, `workspaceid` (lowercase, no underscores)
   - Enum types: `appointment_name`, `appointment_type`, `appointment_status`

2. **Support both naming conventions**:
   ```typescript
   // Accepts both formats
   patient_id OR patientid
   doctor_id OR doctorid
   start_time OR starttime
   ```

3. **Include patient data in queries**:
   ```sql
   SELECT a.*, p.firstname, p.middlename, p.lastname, p.nationalid, p.phone, p.email
   FROM appointments a
   LEFT JOIN patients p ON a.patientid = p.patientid
   WHERE a.workspaceid = '...'
   ```

### Data Flow

```
┌─────────────────────┐
│  Tibbna GitHub App  │
│  (app.tibbna.com)   │
└──────────┬──────────┘
           │
           ├─────────► Shared PostgreSQL Database
           │           ├── appointments
           │           ├── patients
           │           └── workspaces
           │
┌──────────┴──────────┐
│ Tibbna-Hospital App │
│  (localhost:3002)   │
└─────────────────────┘
```

---

## ✅ Verification Steps

### 1. Test Database Connection

```bash
# In tibbna-hospital directory
npm run dev
```

Visit: `http://localhost:3002/reception/appointments`

### 2. Check Appointments Load

You should see appointments from the shared database. These are the **same appointments** visible in the tibbna GitHub app.

### 3. Create a Test Appointment

Use the tibbna GitHub app to create an appointment, then refresh the tibbna-hospital appointments page. The new appointment should appear immediately.

### 4. Verify Data Consistency

```sql
-- Connect to the shared database and verify
SELECT COUNT(*) FROM appointments WHERE workspaceid = 'fa9fb036-a7eb-49af-890c-54406dad139d';
```

This count should match what you see in both apps.

---

## 🎨 Features Available

### In Tibbna-Hospital App:

✅ **View Appointments** - See all appointments from shared database
✅ **Filter by Date** - All, Today, Upcoming, Past
✅ **Patient Information** - Joined from patients table
✅ **Status Management** - Scheduled, Checked In, In Progress, Completed, Cancelled
✅ **Workspace Scoped** - Only shows appointments for the configured workspace

### Creating Appointments:

Currently, appointments should be created through the tibbna GitHub app to ensure proper validation and workflow. The tibbna-hospital app is configured for viewing and monitoring.

---

## 🔍 Troubleshooting

### Issue: "No appointments found"

**Solution**: 
1. Verify `DATABASE_URL` in `.env.local` matches the tibbna GitHub app
2. Check the workspace ID is correct: `fa9fb036-a7eb-49af-890c-54406dad139d`
3. Ensure appointments exist in the shared database

### Issue: "Failed to fetch appointments"

**Solution**:
1. Check database connection string includes `?sslmode=require`
2. Verify database credentials are correct
3. Check network access to the database host

### Issue: "Column does not exist"

**Solution**:
This means the database schema doesn't match. Ensure you're connecting to the tibbna GitHub app's database, not a separate database.

---

## 📊 Database Schema Reference

### Enum Types

```sql
CREATE TYPE appointment_status AS ENUM (
  'scheduled',
  'checked_in', 
  'in_progress',
  'completed',
  'cancelled'
);

CREATE TYPE appointment_name AS ENUM (
  'new_patient',
  're_visit',
  'follow_up'
);

CREATE TYPE appointment_type AS ENUM (
  'visiting',
  'video_call',
  'home_visit'
);
```

### Key Relationships

```
workspaces (1) ──< (many) appointments
workspaces (1) ──< (many) patients
patients (1) ──< (many) appointments
users (1) ──< (many) appointments (as doctor)
```

---

## 🚀 Next Steps

1. **Get the shared DATABASE_URL** from your tibbna GitHub app deployment
2. **Update `.env.local`** in tibbna-hospital with the shared DATABASE_URL
3. **Restart the dev server**: `npm run dev`
4. **Test the connection** by visiting `/reception/appointments`
5. **Verify data consistency** between both apps

---

## 📝 Important Notes

- **DO NOT** create separate appointments tables
- **DO NOT** run migrations that already exist in the shared database
- **ALWAYS** use the same workspace ID in both apps
- **BACKUP** your database before making any schema changes
- **TEST** thoroughly before deploying to production

---

## 🎯 Success Criteria

✅ Both apps connect to the same PostgreSQL database
✅ Appointments created in tibbna GitHub app appear in tibbna-hospital
✅ Patient data is shared between both applications
✅ No duplicate data or schema conflicts
✅ Workspace filtering works correctly

---

**Once you provide the shared DATABASE_URL, both apps will be fully synchronized!** 🎉
