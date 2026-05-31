-- Check for drugs table and count records

-- First, show all tables that might contain drug data
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND (table_name ILIKE '%drug%' OR table_name ILIKE '%medication%')
ORDER BY table_name;

-- Check if there's a table called "drugs"
SELECT COUNT(*) as drugs_table_count
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'drugs';

-- If drugs table exists, count its records
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'drugs') THEN
        EXECUTE 'SELECT COUNT(*) as drugs_count FROM drugs';
    ELSE
        RAISE NOTICE 'Table "drugs" does not exist';
    END IF;
END $$;

-- Count records in national_drugs table (our main drug table)
SELECT COUNT(*) as national_drugs_count FROM national_drugs;

-- Count records in openehr_medications table
SELECT COUNT(*) as openehr_medications_count FROM openehr_medications;

-- Show all tables in the database
SELECT table_name, 
       (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name AND table_schema = 'public') as column_count
FROM information_schema.tables t 
WHERE table_schema = 'public'
ORDER BY table_name;
