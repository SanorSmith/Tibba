-- Count records in the drugs table

-- Total count of drugs
SELECT COUNT(*) as total_drugs_count FROM drugs;

-- Count active drugs
SELECT COUNT(*) as active_drugs_count FROM drugs WHERE isactive = true;

-- Count drugs by workspace (if you have multiple workspaces)
SELECT workspaceid, COUNT(*) as drug_count 
FROM drugs 
GROUP BY workspaceid 
ORDER BY drug_count DESC;

-- Count drugs with national codes
SELECT COUNT(*) as drugs_with_national_code FROM drugs WHERE nationalcode IS NOT NULL AND nationalcode != '';

-- Count drugs requiring prescription
SELECT COUNT(*) as prescription_required FROM drugs WHERE requiresprescription = true;

-- Count insurance approved drugs
SELECT COUNT(*) as insurance_approved FROM drugs WHERE insuranceapproved = true;

-- Show sample of drugs
SELECT 
    drugid,
    name,
    genericname,
    nationalcode,
    form,
    strength,
    unit,
    isactive,
    requiresprescription,
    insuranceapproved
FROM drugs 
ORDER BY createdat DESC 
LIMIT 10;

-- Count by category
SELECT category, COUNT(*) as count
FROM drugs 
WHERE category IS NOT NULL AND category != ''
GROUP BY category 
ORDER BY count DESC;
