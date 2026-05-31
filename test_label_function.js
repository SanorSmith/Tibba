// Test the exact label mapping function from the API
const categoryLabels = {
  'MONTHLY_CONSULTATION': 'Consultation Fees',
  'MONTHLY_LAB_TEST': 'Laboratory Tests',
  'MONTHLY_SURGERY': 'Surgical Procedures',
  'MONTHLY_RADIOLOGY': 'Radiology Services',
  'MONTHLY_PHARMACY': 'Pharmacy Sales',
  'WEEKLY_CONSULTATION': 'Consultation Fees',
  'WEEKLY_LAB_TEST': 'Laboratory Tests',
  'WEEKLY_SURGERY': 'Surgical Procedures',
  'WEEKLY_RADIOLOGY': 'Radiology Services',
  'EMERGENCY_CONSULTATION': 'Emergency Consultation',
  'URGENT_LAB_TEST': 'Urgent Lab Tests',
  'EMERGENCY_XRAY': 'Emergency X-Ray',
  'ANNUAL_CONSULTATION': 'Annual Consultations',
  'ANNUAL_LAB_TEST': 'Annual Lab Tests',
  'ANNUAL_SURGERY': 'Annual Surgeries',
  'ANNUAL_RADIOLOGY': 'Annual Radiology',
  'ANNUAL_PHARMACY': 'Annual Pharmacy',
  'PAID_INVOICES': 'Paid Invoices',
  'INSURANCE_PAYMENTS': 'Insurance Payments',
  'PATIENT_PAYMENTS': 'Patient Payments',
  'SALARIES_WAGES': 'Salaries & Wages',
  'CONSULTATION': 'Consultation Services',
  'LABORATORY': 'Laboratory Tests',
  'RADIOLOGY': 'Radiology Services',
  'SURGERY': 'Surgical Services',
  'PHARMACY': 'Pharmacy Services',
  'EMERGENCY': 'Emergency Services',
  'CARDIOLOGY': 'Cardiology Services',
  'DENTAL': 'Dental Services',
  'THERAPY': 'Therapy Services',
  'ADMINISTRATIVE': 'Administrative Fees',
  'PREVENTIVE': 'Preventive Care',
  'default': 'Other Revenue'
};

function getCategoryLabel(category) {
  if (!category) return categoryLabels['default'];
  
  // Try exact match first
  if (categoryLabels[category]) {
    return categoryLabels[category];
  }
  
  // Try uppercase match
  const upperCategory = category.toUpperCase();
  if (categoryLabels[upperCategory]) {
    return categoryLabels[upperCategory];
  }
  
  // Try lowercase match
  const lowerCategory = category.toLowerCase();
  if (categoryLabels[lowerCategory]) {
    return categoryLabels[lowerCategory];
  }
  
  // Return default
  return categoryLabels['default'];
}

console.log('=== TESTING LABEL FUNCTION ===');
const testCategories = [
  'Surgery', 'Radiology', 'Consultation', 'Cardiology',
  'PAID_INVOICES', 'INSURANCE_PAYMENTS', 'PATIENT_PAYMENTS', 'SALARIES_WAGES'
];

testCategories.forEach(cat => {
  const label = getCategoryLabel(cat);
  console.log(`${cat} -> "${label}"`);
});

console.log('\n🔍 Testing exact matches:');
console.log('PAID_INVOICES in labels:', 'PAID_INVOICES' in categoryLabels);
console.log('Value for PAID_INVOICES:', categoryLabels['PAID_INVOICES']);
