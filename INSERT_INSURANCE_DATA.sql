-- Insert sample insurance providers into database
-- Run this in Supabase SQL Editor
-- Table: insurance_providers (matches your schema)

INSERT INTO insurance_providers (
  code, 
  name, 
  name_ar, 
  type,
  contact,
  address,
  payment_terms,
  credit_limit,
  annual_budget,
  active,
  created_at,
  updated_at
) VALUES 
('INS-001', 'National Insurance Company', 'شركة التأمين الوطنية', 'GOVERNMENT', 
 '{"contact_person": "Ahmed Hassan", "phone": "+9647701234567", "email": "contact@nationalinsurance.iq", "website": "https://nationalinsurance.iq"}',
 '{"address_line1": "Baghdad Medical District, Al-Mansour", "city": "Baghdad", "province": "Baghdad", "country": "Iraq"}',
 30, 1000000000, 5000000000, true, NOW(), NOW()),

('INS-002', 'Iraqi Health Insurance', 'شركة التأمين الصحي', 'GOVERNMENT',
 '{"contact_person": "Fatima Karim", "phone": "+9647701234568", "email": "info@iraqihealth.iq", "website": "https://iraqihealth.iq"}',
 '{"address_line1": "Baghdad Medical District, Al-Mansour", "city": "Baghdad", "province": "Baghdad", "country": "Iraq"}',
 45, 2000000000, 8000000000, true, NOW(), NOW()),

('INS-003', 'Private Medical Insurance', 'شركة التأمين الطبية الخاصة', 'PRIVATE',
 '{"contact_person": "Mohammed Ali", "phone": "+9647701234569", "email": "mohammed@privatehealth.iq", "website": "https://privatehealth.iq"}',
 '{"address_line1": "Erbil Medical District, Karbala", "city": "Erbil", "province": "Karbala", "country": "Iraq"}',
 60, 500000000, 2000000000, true, NOW(), NOW()),

('INS-004', 'Corporate Health Solutions', 'حلول الصحة الشركات', 'CORPORATE',
 '{"contact_person": "Sarah Mahmoud", "phone": "+9647701234570", "email": "sarah@corporatehealth.iq", "website": "https://corporatehealth.iq"}',
 '{"address_line1": "Basra Business District, Basra", "city": "Basra", "province": "Basra", "country": "Iraq"}',
 30, 3000000000, 1200000000, true, NOW(), NOW()),

('INS-005', 'International Medical Insurance', 'التأمين الطبية الدولية', 'INTERNATIONAL',
 '{"contact_person": "John Smith", "phone": "+9647701234571", "email": "john@internationalmed.iq", "website": "https://internationalmed.iq"}',
 '{"address_line1": "Baghdad Business District, Al-Mansour", "city": "Baghdad", "province": "Baghdad", "country": "Iraq"}',
 90, 8000000000, 3000000000, true, NOW(), NOW()),

('INS-006', 'Family Health Insurance', 'التأمين الصحة الأسرية', 'PRIVATE',
 '{"contact_person": "Layla Youssef", "phone": "+9647701234572", "email": "layla@familyhealth.iq", "website": "https://familyhealth.iq"}',
 '{"address_line1": "Mosul Medical District, Baghdad", "city": "Mosul", "province": "Baghdad", "country": "Iraq"}',
 15, 100000000, 50000000, true, NOW(), NOW());
