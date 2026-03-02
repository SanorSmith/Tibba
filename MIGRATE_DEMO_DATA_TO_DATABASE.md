# 🔄 MIGRATE DEMO DATA TO DATABASE

## 📋 Correct Migration Approach

The SQL I provided was just a template. Here's the **correct way** to migrate your demo data to the Supabase database.

---

## 🎯 **Option 1: Manual Data Entry (Recommended)**

Since you have small amounts of demo data, the easiest approach is to use the API endpoints we just created:

### **1. Add Shareholders via API:**

```bash
curl -X POST "http://localhost:3000/api/shareholders" \
  -H "Content-Type: application/json" \
  -d '{
    "shareholder_id": "sh-001",
    "full_name": "Tibbna Hospital",
    "full_name_ar": "مستشفى تبنى",
    "shareholder_type": "ORGANIZATION",
    "share_percentage": 40,
    "investment_amount": 100000000,
    "status": "ACTIVE"
  }'

curl -X POST "http://localhost:3000/api/shareholders" \
  -H "Content-Type: application/json" \
  -d '{
    "shareholder_id": "sh-002", 
    "full_name": "Dr. Ali Hussein",
    "full_name_ar": "د. علي حسين",
    "shareholder_type": "INDIVIDUAL",
    "share_percentage": 15,
    "investment_amount": 37500000,
    "status": "ACTIVE"
  }'
```

### **2. Add Purchase Requests via API:**

```bash
curl -X POST "http://localhost:3000/api/purchase-requests" \
  -H "Content-Type: application/json" \
  -d '{
    "requested_by": "Sanor",
    "department": "قسم العمليات",
    "item_name": "Surgical Supplies Package",
    "item_name_ar": "مستلزمات جراحية",
    "category": "MEDICAL_SUPPLIES",
    "quantity": 100,
    "estimated_unit_price": 250000,
    "estimated_total_price": 25000000,
    "priority": "HIGH",
    "required_by_date": "2024-01-25",
    "status": "PENDING"
  }'

curl -X POST "http://localhost:3000/api/purchase-requests" \
  -H "Content-Type: application/json" \
  -d '{
    "requested_by": "Admin User",
    "department": "الصيدلية", 
    "item_name": "Monthly Medications",
    "item_name_ar": "أدوية شهرية",
    "category": "PHARMACEUTICALS",
    "quantity": 500,
    "estimated_unit_price": 50000,
    "estimated_total_price": 25000000,
    "priority": "NORMAL",
    "required_by_date": "2024-02-01",
    "status": "PENDING"
  }'
```

### **3. Add Services via Database Direct (Easier):**

Since services have many fields, it's easier to add them directly to the database:

```sql
-- Connect to your Supabase database and run:

INSERT INTO service_catalog (
  id, code, name, name_ar, description, category,
  price_self_pay, price_insurance, price_government,
  currency, duration_minutes, requires_appointment,
  active, created_at
) VALUES 
(
  gen_random_uuid(), 'CONS-001', 'General Consultation', 'استشارة عامة',
  'Basic medical consultation with general practitioner', 'CONSULTATION',
  25000, 20000, 15000, 'IQD', 30, true, true, NOW()
),
(
  gen_random_uuid(), 'CONS-002', 'Specialist Consultation', 'استشارة متخصصة',
  'Specialist medical consultation', 'CONSULTATION', 
  50000, 40000, 30000, 'IQD', 45, true, true, NOW()
),
(
  gen_random_uuid(), 'LAB-001', 'Complete Blood Count', 'تعداد الدم الكامل',
  'Complete blood count test', 'LAB',
  15000, 12000, 10000, 'IQD', 15, false, true, NOW()
),
(
  gen_random_uuid(), 'LAB-002', 'Blood Chemistry Panel', 'لوحة الكيمياء الدموية',
  'Comprehensive blood chemistry panel', 'LAB',
  35000, 28000, 20000, 'IQD', 20, false, true, NOW()
),
(
  gen_random_uuid(), 'IMG-001', 'Chest X-Ray', 'أشعة الصدر',
  'Chest radiography examination', 'IMAGING',
  30000, 25000, 20000, 'IQD', 30, true, true, NOW()
),
(
  gen_random_uuid(), 'IMG-002', 'Abdominal Ultrasound', 'الموجات فوق الصوتية للبطن',
  'Abdominal ultrasound examination', 'IMAGING',
  45000, 36000, 25000, 'IQD', 45, true, true, NOW()
),
(
  gen_random_uuid(), 'IMG-003', 'CT Scan', 'التصوير المقطعي',
  'Computed tomography scan', 'IMAGING',
  150000, 120000, 90000, 'IQD', 60, true, true, NOW()
),
(
  gen_random_uuid(), 'PROC-001', 'Minor Surgery', 'جراحة بسيطة',
  'Minor surgical procedures', 'PROCEDURE',
  200000, 160000, 120000, 'IQD', 120, true, true, NOW()
),
(
  gen_random_uuid(), 'PROC-002', 'IV Infusion', 'التسريب الوريدي',
  'Intravenous fluid administration', 'PROCEDURE',
  20000, 16000, 12000, 'IQD', 60, false, true, NOW()
),
(
  gen_random_uuid(), 'DIAG-001', 'ECG', 'تخطيط القلب',
  'Electrocardiogram', 'DIAGNOSTIC',
  25000, 20000, 15000, 'IQD', 20, false, true, NOW()
),
(
  gen_random_uuid(), 'DIAG-002', 'Echocardiogram', 'صدى القلب',
  'Echocardiography examination', 'DIAGNOSTIC',
  80000, 64000, 48000, 'IQD', 45, true, true, NOW()
),
(
  gen_random_uuid(), 'LAB-003', 'Urinalysis', 'تحليل البول',
  'Urine analysis test', 'LAB',
  10000, 8000, 6000, 'IQD', 10, false, true, NOW()
);
```

---

## 🎯 **Option 2: Create Migration Script**

If you prefer an automated approach, create a migration script:

### **Create Migration File:**
```javascript
// migrate-demo-data.js
const { createClient } = require('@supabase/supabase-js');

// Your Supabase credentials
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Demo data from your JSON files
const shareholders = [
  {
    shareholder_id: "sh-001",
    full_name: "Tibbna Hospital",
    full_name_ar: "مستشفى تبنى",
    shareholder_type: "ORGANIZATION",
    share_percentage: 40,
    investment_amount: 100000000,
    status: "ACTIVE"
  },
  // ... more shareholders
];

const purchaseRequests = [
  {
    requested_by: "Sanor",
    department: "قسم العمليات",
    item_name: "Surgical Supplies Package",
    item_name_ar: "مستلزمات جراحية",
    category: "MEDICAL_SUPPLIES",
    quantity: 100,
    estimated_unit_price: 250000,
    estimated_total_price: 25000000,
    priority: "HIGH",
    status: "PENDING"
  },
  // ... more purchase requests
];

async function migrateData() {
  try {
    // Migrate shareholders
    for (const shareholder of shareholders) {
      const { error } = await supabase
        .from('shareholders')
        .insert(shareholder);
      
      if (error) {
        console.error('Error inserting shareholder:', error);
      } else {
        console.log('✅ Shareholder inserted:', shareholder.full_name);
      }
    }

    // Migrate purchase requests
    for (const pr of purchaseRequests) {
      const { error } = await supabase
        .from('purchase_requests')
        .insert(pr);
      
      if (error) {
        console.error('Error inserting purchase request:', error);
      } else {
        console.log('✅ Purchase request inserted:', pr.item_name);
      }
    }

    console.log('🎉 Migration completed!');
  } catch (error) {
    console.error('Migration failed:', error);
  }
}

migrateData();
```

### **Run Migration Script:**
```bash
# Set your environment variables
export NEXT_PUBLIC_SUPABASE_URL="your-supabase-url"
export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

# Run the migration
node migrate-demo-data.js
```

---

## 🎯 **Option 3: Use Supabase Dashboard (Easiest)**

1. **Go to Supabase Dashboard**
2. **Select your project**
3. **Go to Table Editor**
4. **Select the table** (`shareholders`, `purchase_requests`, `service_catalog`)
5. **Click "Insert row"** and manually add the data

---

## 📊 **Recommended Approach:**

### **For Quick Testing:**
- **Option 1**: Use API calls for shareholders and purchase requests
- **Option 3**: Use Supabase Dashboard for services (easier due to many fields)

### **For Production Setup:**
- **Option 2**: Create migration script for automated deployment

---

## 🔍 **Verify Migration:**

After migration, test your APIs:

```bash
# Test shareholders
curl "http://localhost:3000/api/shareholders"

# Test purchase requests  
curl "http://localhost:3000/api/purchase-requests"

# Test services
curl "http://localhost:3000/api/services"
```

All should return the data you inserted, confirming **100% database connectivity**!

---

## 🎓 **Important Notes:**

1. **No `json_data` table exists** - that was just a template example
2. **Use your actual demo data** from the JSON files
3. **Test each API** after migration to ensure it works
4. **Back up your database** before running migrations
5. **Use proper UUIDs** for primary keys (or let database generate them)

---

**Choose the option that works best for your setup. Option 1 (API calls) + Option 3 (Dashboard) is probably the fastest for testing!** 🚀
