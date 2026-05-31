# National Drug List (NDL 1278) Integration Guide

## 📋 Overview

This guide explains how to import the National Drug List (NDL 1278) into your database and integrate it with OpenEHR medication templates.

---

## 🎯 What Was Created

### 1. **Database Tables**
- `national_drugs` - Main table for NDL data
- `openehr_medications` - OpenEHR-compatible medication records
- `medication_inventory` - Stock management system

### 2. **Import Script**
- `import_national_drugs.js` - Automated CSV import

### 3. **API Endpoint**
- `/api/national-drugs` - REST API for drug data

---

## 🚀 Setup Instructions

### Step 1: Create Database Tables

Execute the SQL script in your database:

```bash
# In your SQL session (SQLTools)
\i database/create_national_drugs_table.sql
```

Or run directly:
```sql
-- Copy and paste the contents of database/create_national_drugs_table.sql
```

**Expected Output:**
```
National Drugs tables created successfully
Tables: national_drugs, openehr_medications, medication_inventory
```

---

### Step 2: Install Required Dependencies

```bash
npm install csv-parser
```

---

### Step 3: Import NDL Data

Run the import script:

```bash
node import_national_drugs.js
```

**Expected Output:**
```
Starting import of National Drug List...
Parsed 6215 drugs from CSV
Progress: 100/6215 drugs processed
Progress: 200/6215 drugs processed
...
=== IMPORT COMPLETE ===
Total drugs inserted: 6215
Skipped (errors): 0

Database Statistics:
- Total drugs in database: 6215
- Active drugs: 6215
- OpenEHR medications: 6215
- Categories: 17
- Dosage forms: 45

Sample drugs:
- Digoxin 62.5mcg (Tablet) - 01-AA0-001
- Digitoxin 100mcg (Tablet) - 01-AA0-002
...
```

---

## 📊 Database Schema

### national_drugs Table

| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL | Primary key |
| national_code | VARCHAR(100) | Unique NDL code |
| drug_name | VARCHAR(500) | Drug name |
| inn | VARCHAR(500) | International Nonproprietary Name |
| strength | VARCHAR(200) | Drug strength |
| dosage_form | VARCHAR(200) | Form (tablet, injection, etc.) |
| route | VARCHAR(200) | Administration route |
| category | VARCHAR(200) | Therapeutic category |
| edl | VARCHAR(100) | Essential Drug List marker |
| active | BOOLEAN | Active status |

### openehr_medications Table

| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL | Primary key |
| medication_id | VARCHAR(100) | Unique medication ID |
| medication_name | VARCHAR(500) | Medication name |
| generic_name | VARCHAR(500) | Generic name |
| dose_form | VARCHAR(200) | Dosage form |
| strength | VARCHAR(200) | Strength |
| administration_route | VARCHAR(200) | Route |
| national_code | VARCHAR(100) | Reference to NDL |
| archetype_id | VARCHAR(200) | OpenEHR archetype |
| template_id | VARCHAR(200) | OpenEHR template |

---

## 🔌 API Usage

### GET /api/national-drugs

**Search drugs:**
```bash
GET /api/national-drugs?search=digoxin
```

**Filter by category:**
```bash
GET /api/national-drugs?category=CARDIOVASCULAR%20SYSTEM
```

**Filter by dosage form:**
```bash
GET /api/national-drugs?dosage_form=Tablet
```

**Pagination:**
```bash
GET /api/national-drugs?page=1&limit=50
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "national_code": "01-AA0-001",
      "drug_name": "Digoxin",
      "inn": "Digoxin 62.5mcg",
      "strength": "62.5mcg",
      "dosage_form": "Tablet",
      "route": "oral",
      "category": "CARDIOVASCULAR SYSTEM",
      "edl": null,
      "active": true
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 6215,
    "totalPages": 125
  }
}
```

---

## 🏥 OpenEHR Integration

### Medication Composition Structure

The `openehr_medications` table follows OpenEHR standards:

```javascript
{
  archetype_id: "openEHR-EHR-COMPOSITION.medication_list.v1",
  template_id: "Medication List",
  medication: {
    name: "Digoxin",
    generic_name: "Digoxin 62.5mcg",
    dose_form: "Tablet",
    strength: "62.5mcg",
    route: "oral"
  }
}
```

### Usage in OpenEHR Templates

```sql
-- Get medication for OpenEHR composition
SELECT 
  medication_id,
  medication_name,
  generic_name,
  dose_form,
  strength,
  administration_route,
  archetype_id,
  template_id
FROM openehr_medications
WHERE national_code = '01-AA0-001';
```

---

## 📈 Data Statistics

After import, you should have:

- **Total Drugs:** ~6,215
- **Categories:** 17 therapeutic categories
- **Dosage Forms:** 45+ different forms
- **Routes:** Multiple administration routes
- **Essential Drugs:** Marked with EDL codes

### Categories Include:
1. CARDIOVASCULAR SYSTEM
2. BLOOD AND BLOOD FORMING ORGANS
3. DERMATOLOGICALS
4. GENITO URINARY SYSTEM
5. HORMONES
6. ANTI-INFECTIVES
7. ANTINEOPLASTIC
8. MUSCULO-SKELETAL SYSTEM
9. NERVOUS SYSTEM
10. ANTIPARASITIC
11. RESPIRATORY SYSTEM
12. SENSORY ORGANS
13. VARIOUS
14. DIAGNOSTIC AGENTS
15. DISINFECTANTS
16. DIURETICS
17. ELECTROLYTES

---

## 🔍 Query Examples

### Search by drug name:
```sql
SELECT * FROM national_drugs 
WHERE drug_name ILIKE '%digoxin%' 
AND active = true;
```

### Get all cardiovascular drugs:
```sql
SELECT * FROM national_drugs 
WHERE category = 'CARDIOVASCULAR SYSTEM' 
AND active = true
ORDER BY drug_name;
```

### Get all tablets:
```sql
SELECT * FROM national_drugs 
WHERE dosage_form ILIKE '%tablet%' 
AND active = true;
```

### Get essential drugs:
```sql
SELECT * FROM national_drugs 
WHERE edl IS NOT NULL 
AND edl != '' 
AND active = true;
```

---

## ✅ Verification

After import, verify the data:

```sql
-- Check total count
SELECT COUNT(*) FROM national_drugs;

-- Check categories
SELECT category, COUNT(*) 
FROM national_drugs 
WHERE category IS NOT NULL 
GROUP BY category 
ORDER BY COUNT(*) DESC;

-- Check dosage forms
SELECT dosage_form, COUNT(*) 
FROM national_drugs 
WHERE dosage_form IS NOT NULL 
GROUP BY dosage_form 
ORDER BY COUNT(*) DESC;

-- Check OpenEHR medications
SELECT COUNT(*) FROM openehr_medications;
```

---

## 🎉 Success!

You now have:
- ✅ Complete National Drug List in database
- ✅ OpenEHR-compatible medication records
- ✅ REST API for drug data
- ✅ Searchable and filterable drug database
- ✅ Ready for integration with prescriptions and pharmacy modules

---

## 📞 Next Steps

1. **Integrate with Prescriptions:** Use the API in prescription forms
2. **Add Pricing:** Update drug prices in the database
3. **Stock Management:** Use medication_inventory table
4. **OpenEHR Templates:** Create medication order templates
5. **Pharmacy Module:** Build pharmacy dispensing system

---

## 🐛 Troubleshooting

### Import fails with "csv-parser not found"
```bash
npm install csv-parser
```

### Database connection error
Check your `.env.local` file has correct `DATABASE_URL`

### Duplicate key errors
The script handles duplicates automatically with `ON CONFLICT` clause

### Missing data
Verify the CSV file `NDL 1278.csv` is in the root directory

---

## 📝 Notes

- All drugs are marked as `active = true` by default
- Drug names are parsed to extract strength
- Categories are auto-detected from national codes
- OpenEHR medications are auto-created from national drugs
- Indexes are created for fast searching

---

**Ready to use! 🚀**
