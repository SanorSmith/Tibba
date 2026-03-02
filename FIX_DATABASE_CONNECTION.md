# 🔧 Database Connection Fix

## ⚠️ **Issue Identified**

The 500 Internal Server Error is caused by **missing environment variable** `OPENEHR_DATABASE_URL`.

---

## 🎯 **Solution Steps**

### **Step 1: Create .env.local File**

Create a file named `.env.local` in your project root directory:

```
G:\Windsurf Workspace\Tibbna_openEhr\tibbna-hospital\.env.local
```

### **Step 2: Add Database URL**

Add the following line to your `.env.local` file:

```env
OPENEHR_DATABASE_URL=postgresql://neondb_owner:npg_8FjAiWwJlhz7@ep-red-cherry-ag82jhqf-pooler.c-2.eu-central-1.aws.neon.tech/neondb
```

### **Step 3: Restart Development Server**

Stop the current server (Ctrl+C) and restart it:

```bash
npm run dev
```

---

## 🔍 **Verify the Fix**

### **Test 1: Check Environment Configuration**
Visit: `http://localhost:3000/api/test-departments`

You should see:
```json
{
  "success": true,
  "environment_check": {
    "database_url_configured": true,
    "database_url_length": 95,
    "database_url_prefix": "postgresql://neondb_owner:npg_8FjAiWwJlhz7@ep-red-cherry-ag82jhqf-pooler..."
  }
}
```

### **Test 2: Check Departments API**
Visit: `http://localhost:3000/api/departments`

You should see either:
- Empty departments list (if table exists but is empty)
- Error about missing departments table (if table doesn't exist)
- Actual departments data (if table exists with data)

---

## 🗄️ **Create Departments Table (if needed)**

If you get an error about the departments table not existing, run this SQL in your Neon database:

```sql
CREATE TABLE IF NOT EXISTS departments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  name_ar VARCHAR(255),
  code VARCHAR(10) UNIQUE NOT NULL,
  description TEXT,
  head_of_department VARCHAR(255),
  contact_email VARCHAR(255),
  contact_phone VARCHAR(50),
  location VARCHAR(255),
  capacity INTEGER,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_departments_code ON departments(code);
CREATE INDEX IF NOT EXISTS idx_departments_name ON departments(name);
CREATE INDEX IF NOT EXISTS idx_departments_is_active ON departments(is_active);
```

---

## 🚀 **After Fix**

Once the environment variable is set:

1. **Department statistics** will show correct counts
2. **Department list** will display data from database
3. **Add Department form** will work properly
4. **Search and filtering** will function correctly
5. **CRUD operations** will be fully functional

---

## 🔧 **Troubleshooting**

### **If still getting 500 errors:**

1. **Check .env.local exists** in the correct location
2. **Verify the URL** is correct (no typos)
3. **Restart the server** after adding the variable
4. **Check Neon database** is accessible
5. **Verify departments table** exists

### **Debug Commands:**

```bash
# Check if .env.local exists
ls -la .env.local

# Check environment variable in server
curl http://localhost:3000/api/test-departments

# Check departments API
curl http://localhost:3000/api/departments
```

---

## 📋 **Complete .env.local Example**

Your `.env.local` file should look like this:

```env
# Neon Database Connection
OPENEHR_DATABASE_URL=postgresql://neondb_owner:npg_8FjAiWwJlhz7@ep-red-cherry-ag82jhqf-pooler.c-2.eu-central-1.aws.neon.tech/neondb

# Supabase (if also using)
NEXT_PUBLIC_SUPABASE_URL=https://ldabymaexuvyeygjqbby.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## 🎉 **Expected Result**

After following these steps:

- ✅ **No more 500 errors**
- ✅ **Department statistics** showing real data
- ✅ **Department list** displaying from Neon database
- ✅ **Add Department** functionality working
- ✅ **Full CRUD operations** available

**Your department management system will be fully connected to the Neon database!** 🏥
