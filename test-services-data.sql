-- Test if services data exists in your database
-- Run this to verify your services are already there

SELECT 
  code,
  name,
  name_ar,
  category,
  price_self_pay,
  price_insurance,
  price_government,
  active
FROM service_catalog 
ORDER BY category, name;

-- Count total services
SELECT COUNT(*) as total_services FROM service_catalog;

-- Check by category
SELECT category, COUNT(*) as count FROM service_catalog GROUP BY category ORDER BY category;
