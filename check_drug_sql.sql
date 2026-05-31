-- Check drug with national code 15-AB0-004

-- First, check if it exists in national_drugs table
SELECT 
    id,
    national_code,
    drug_name,
    inn,
    strength,
    dosage_form,
    route,
    category,
    active
FROM national_drugs 
WHERE national_code = '15-AB0-004';

-- Then check the corresponding OpenEHR medication
SELECT 
    id,
    medication_id,
    medication_name,
    generic_name,
    dose_form,
    strength,
    administration_route,
    therapeutic_category,
    archetype_id,
    template_id,
    national_code,
    active
FROM openehr_medications 
WHERE national_code = '15-AB0-004';

-- Show the relationship between the tables
SELECT 
    nd.national_code,
    nd.drug_name,
    nd.inn,
    nd.strength,
    nd.dosage_form,
    nd.category,
    om.medication_id as openehr_medication_id,
    om.archetype_id,
    om.template_id,
    om.therapeutic_category as openehr_category
FROM national_drugs nd
LEFT JOIN openehr_medications om ON nd.national_code = om.national_code
WHERE nd.national_code = '15-AB0-004';
