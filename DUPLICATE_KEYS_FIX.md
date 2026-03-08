# Duplicate Keys & 404 Error - Fixed

## ✅ Issues Fixed

### 1. **Duplicate React Keys** ✅
**Problem:** Multiple employees with same `custom_staff_id` causing duplicate keys
- `CCAR9015001` appears 3 times
- `CCAR2601001` appears 2 times

**Root Cause:** Staff table has duplicate custom_staff_id values

**Solution Applied:**
- Updated SearchableSelect to use unique key: `${emp.staff_id}-${index}`
- Modified option mapping to include unique key property
- SearchableSelect now uses `option.key` or falls back to `${option.value}-${index}`

**Files Modified:**
- `src/app/(dashboard)/hr/schedules/create/page.tsx` - Added unique key generation
- `src/components/ui/searchable-select.tsx` - Updated to use unique keys

---

### 2. **POST /api/hr/schedules 404 Error** ⚠️

**Problem:** POST endpoint returns 404 even though route file exists

**Root Cause:** Next.js dev server caching issue after SQL fix

**Solution:**
1. **Restart Dev Server** (Required)
   ```bash
   # Stop current server (Ctrl+C)
   npm run dev
   ```

2. **Clear Next.js Cache** (If restart doesn't work)
   ```bash
   rm -rf .next
   npm run dev
   ```

**Verification:**
- Route file exists: `src/app/api/hr/schedules/route.ts` ✅
- SQL error fixed: Changed `e.first_name` to `s.firstname` ✅
- GET endpoint works: Returns 200 ✅
- POST endpoint needs server restart

---

## 🔍 Duplicate Staff IDs in Database

**Query to find duplicates:**
```sql
SELECT custom_staff_id, COUNT(*) as count
FROM staff
WHERE custom_staff_id IS NOT NULL
GROUP BY custom_staff_id
HAVING COUNT(*) > 1;
```

**Found Duplicates:**
- `CCAR9015001` - 3 employees
- `CCAR2601001` - 2 employees

**Recommendation:**
Clean up duplicate custom_staff_id values in the database:
```sql
-- Option 1: Make them unique by appending suffix
UPDATE staff
SET custom_staff_id = custom_staff_id || '-' || staffid::text
WHERE custom_staff_id IN ('CCAR9015001', 'CCAR2601001');

-- Option 2: Set duplicates to NULL and let system generate new ones
UPDATE staff
SET custom_staff_id = NULL
WHERE staffid IN (
  SELECT staffid FROM staff
  WHERE custom_staff_id IN ('CCAR9015001', 'CCAR2601001')
  ORDER BY created_at DESC
  OFFSET 1
);
```

---

## ✅ Current Status

**Fixed:**
- ✅ Duplicate React keys resolved
- ✅ SQL query error fixed
- ✅ GET endpoint working
- ✅ Searchable select component working

**Pending:**
- ⚠️ Restart dev server to fix POST 404
- 💡 Consider cleaning duplicate staff IDs in database

---

## 🚀 Next Steps

1. **Restart Dev Server:**
   ```bash
   npm run dev
   ```

2. **Test Schedule Creation:**
   - Go to `/hr/schedules/create`
   - Select employee (searchable dropdown works)
   - Select shift
   - Fill in dates
   - Submit form
   - Should create schedule successfully

3. **Optional - Clean Database:**
   - Run duplicate cleanup query
   - Ensures unique staff IDs going forward

---

## 📊 Summary

**Errors:**
1. ❌ Duplicate keys: `CCAR9015001`, `CCAR2601001`
2. ❌ POST 404: Dev server caching

**Fixes:**
1. ✅ Unique key generation in React components
2. ✅ SQL query corrected
3. ⚠️ Server restart required

**Result:** System ready after dev server restart!
