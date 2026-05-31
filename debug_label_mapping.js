// Test the label mapping function directly
const categoryLabels = {
  'SURGERY': 'Surgical Services',
  'RADIOLOGY': 'Radiology Services',
  'CONSULTATION': 'Consultation Services',
  'CARDIOLOGY': 'Cardiology Services',
  'DENTAL': 'Dental Services',
  'THERAPY': 'Therapy Services',
  'ADMINISTRATIVE': 'Administrative Fees',
  'PREVENTIVE': 'Preventive Care',
  'LABORATORY': 'Laboratory Tests',
  'PAID_INVOICES': 'Paid Invoices',
  'INSURANCE_PAYMENTS': 'Insurance Payments',
  'PATIENT_PAYMENTS': 'Patient Payments',
  'default': 'Other Revenue'
};

function getCategoryLabel(category) {
  return categoryLabels[category] || categoryLabels['default'] || category;
}

console.log('=== LABEL MAPPING DEBUG ===');
const testCategories = ['Surgery', 'Radiology', 'Consultation', 'PAID_INVOICES', 'UNKNOWN_CATEGORY'];

testCategories.forEach(cat => {
  const label = getCategoryLabel(cat);
  const hasDirect = categoryLabels[cat] ? 'YES' : 'NO';
  console.log(`${cat} -> "${label}" (Direct: ${hasDirect})`);
});

console.log('\n🔍 Checking category object:');
console.log('SURGERY in labels:', 'SURGERY' in categoryLabels);
console.log('Surgery in labels:', 'Surgery' in categoryLabels);
console.log('Available keys:', Object.keys(categoryLabels));
