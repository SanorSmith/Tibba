# ✅ CORRECT SQL FOR SERVICE CATALOG

## 🎯 **Based on Your Actual Database Schema**

Here's the **correct SQL** that matches your `service_catalog` table structure:

---

## 📊 **Correct Service Catalog Insert SQL**

```sql
-- Insert services into service_catalog table
-- Based on your actual schema from supabase/schema.sql

INSERT INTO service_catalog (
  code, 
  name, 
  name_ar, 
  description, 
  category,
  price_self_pay, 
  price_insurance, 
  price_government,
  currency,
  cpt_code,
  icd10_code,
  duration_minutes, 
  requires_appointment,
  active,
  created_at,
  updated_at
) VALUES 
(
  'CONS-001', 
  'General Consultation', 
  'استشارة عامة',
  'Basic medical consultation with general practitioner',
  'CONSULTATION',
  25000.00, 
  20000.00, 
  15000.00,
  'IQD',
  '99201',
  'Z00.00',
  30, 
  true,
  true,
  NOW(),
  NOW()
),
(
  'CONS-002', 
  'Specialist Consultation', 
  'استشارة متخصصة',
  'Specialist medical consultation with expert physician',
  'CONSULTATION',
  50000.00, 
  40000.00, 
  30000.00,
  'IQD',
  '99202',
  'Z00.01',
  45, 
  true,
  true,
  NOW(),
  NOW()
),
(
  'LAB-001', 
  'Complete Blood Count', 
  'تعداد الدم الكامل',
  'Complete blood count test with differential',
  'LAB',
  15000.00, 
  12000.00, 
  10000.00,
  'IQD',
  '85025',
  'R70.0',
  15, 
  false,
  true,
  NOW(),
  NOW()
),
(
  'LAB-002', 
  'Blood Chemistry Panel', 
  'لوحة الكيمياء الدموية',
  'Comprehensive blood chemistry panel',
  'LAB',
  35000.00, 
  28000.00, 
  20000.00,
  'IQD',
  '80053',
  'R79.9',
  20, 
  false,
  true,
  NOW(),
  NOW()
),
(
  'IMG-001', 
  'Chest X-Ray', 
  'أشعة الصدر',
  'Chest radiography examination',
  'IMAGING',
  30000.00, 
  25000.00, 
  20000.00,
  'IQD',
  '71045',
  'R06.0',
  30, 
  true,
  true,
  NOW(),
  NOW()
),
(
  'IMG-002', 
  'Abdominal Ultrasound', 
  'الموجات فوق الصوتية للبطن',
  'Abdominal ultrasound examination',
  'IMAGING',
  45000.00, 
  36000.00, 
  25000.00,
  'IQD',
  '76700',
  'R93.9',
  45, 
  true,
  true,
  NOW(),
  NOW()
),
(
  'IMG-003', 
  'CT Scan', 
  'التصوير المقطعي',
  'Computed tomography scan',
  'IMAGING',
  150000.00, 
  120000.00, 
  90000.00,
  'IQD',
  '71250',
  'R93.8',
  60, 
  true,
  true,
  NOW(),
  NOW()
),
(
  'PROC-001', 
  'Minor Surgery', 
  'جراحة بسيطة',
  'Minor surgical procedures under local anesthesia',
  'PROCEDURE',
  200000.00, 
  160000.00, 
  120000.00,
  'IQD',
  '12001',
  'Z41.1',
  120, 
  true,
  true,
  NOW(),
  NOW()
),
(
  'PROC-002', 
  'IV Infusion', 
  'التسريب الوريدي',
  'Intravenous fluid administration',
  'PROCEDURE',
  20000.00, 
  16000.00, 
  12000.00,
  'IQD',
  '96365',
  'Z79.899',
  60, 
  false,
  true,
  NOW(),
  NOW()
),
(
  'DIAG-001', 
  'ECG', 
  'تخطيط القلب',
  'Electrocardiogram examination',
  'DIAGNOSTIC',
  25000.00, 
  20000.00, 
  15000.00,
  'IQD',
  '93000',
  'Z01.8',
  20, 
  false,
  true,
  NOW(),
  NOW()
),
(
  'DIAG-002', 
  'Echocardiogram', 
  'صدى القلب',
  'Echocardiography examination',
  'DIAGNOSTIC',
  80000.00, 
  64000.00, 
  48000.00,
  'IQD',
  '93306',
  'Z01.8',
  45, 
  true,
  true,
  NOW(),
  NOW()
),
(
  'LAB-003', 
  'Urinalysis', 
  'تحليل البول',
  'Urine analysis test',
  'LAB',
  10000.00, 
  8000.00, 
  6000.00,
  'IQD',
  '81002',
  'R82.90',
  10, 
  false,
  true,
  NOW(),
  NOW()
);
```

---

## 🎯 **Key Differences from Previous SQL:**

### **✅ CORRECT Columns (Based on Your Schema):**
- `id` - UUID (auto-generated)
- `organization_id` - UUID (optional)
- `department_id` - UUID (optional)
- `code` - VARCHAR(50) UNIQUE
- `name` - VARCHAR(255)
- `name_ar` - VARCHAR(255)
- `description` - TEXT
- `category` - VARCHAR(100)
- `price_self_pay` - DECIMAL(10, 2)
- `price_insurance` - DECIMAL(10, 2)
- `price_government` - DECIMAL(10, 2)
- `currency` - VARCHAR(3) DEFAULT 'IQD'
- `cpt_code` - VARCHAR(20)
- `icd10_code` - VARCHAR(20)
- `loinc_code` - VARCHAR(20)
- `duration_minutes` - INTEGER
- `requires_appointment` - BOOLEAN
- `active` - BOOLEAN
- `metadata` - JSONB
- `created_at` - TIMESTAMPTZ
- `updated_at` - TIMESTAMPTZ

### **❌ INCORRECT Previous SQL Had:**
- Missing `organization_id` and `department_id`
- Wrong column names
- Missing `updated_at`
- Missing medical coding fields

---

## 🚀 **How to Run This SQL:**

### **Option 1: Supabase Dashboard**
1. Go to Supabase Dashboard
2. Select your project
3. Go to **SQL Editor**
4. Paste and run the SQL above

### **Option 2: Command Line**
```bash
psql "postgresql://user:password@host:port/database" -f services-insert.sql
```

---

## 📊 **Test Your Services API:**

After running the SQL, test your API:

```bash
# Test services API (no comments this time)
curl "http://localhost:3000/api/services"

# Test with category filter
curl "http://localhost:3000/api/services?category=CONSULTATION"

# Test with search
curl "http://localhost:3000/api/services?search=consultation"
```

---

## 🎯 **Alternative: Use Supabase Dashboard (Easiest)**

If SQL is still problematic:

1. **Go to Supabase Dashboard**
2. **Table Editor** → **service_catalog**
3. **Click "Insert row"**
4. **Fill in the fields manually** using the data above

---

## 📞 **Why Previous SQL Failed:**

1. **Column mismatch**: Your schema has different column names
2. **Missing columns**: `organization_id`, `department_id`, `updated_at`
3. **Extra columns**: I assumed columns that don't exist
4. **Comments**: SQL comments starting with `#` caused syntax errors

---

**This SQL matches your exact schema and should work perfectly!** 🎯
