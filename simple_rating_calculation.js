// Manual calculation examples from your database data

console.log('📊 How Rating Categories Are Calculated from Performance Reviews');
console.log('='.repeat(70));

console.log('\n🔍 Example Calculations from Your Data:');
console.log('-'.repeat(50));

// Example 1: High performer
const review1 = {
  clinical_competence: 4.7,
  patient_care: 4.8,
  professionalism: 4.6,
  teamwork: 4.6,
  quality_safety: 4.7
};

const avg1 = (review1.clinical_competence + review1.patient_care + review1.professionalism + review1.teamwork + review1.quality_safety) / 5;
console.log('\n1. High Performer:');
console.log(`   Scores: ${review1.clinical_competence} + ${review1.patient_care} + ${review1.professionalism} + ${review1.teamwork} + ${review1.quality_safety}`);
console.log(`   Average: ${avg1.toFixed(2)}`);
console.log(`   Category: ${avg1 >= 4.0 ? '4.0-4.9 - Exceeds 🔵' : 'Other'}`);

// Example 2: Moderate performer
const review2 = {
  clinical_competence: 4.2,
  patient_care: 4.2,
  professionalism: 4.5,
  teamwork: 4.6,
  quality_safety: 1.1
};

const avg2 = (review2.clinical_competence + review2.patient_care + review2.professionalism + review2.teamwork + review2.quality_safety) / 5;
console.log('\n2. Moderate Performer:');
console.log(`   Scores: ${review2.clinical_competence} + ${review2.patient_care} + ${review2.professionalism} + ${review2.teamwork} + ${review2.quality_safety}`);
console.log(`   Average: ${avg2.toFixed(2)}`);
console.log(`   Category: ${avg2 >= 3.0 && avg2 < 4.0 ? '3.0-3.9 - Meets 🟡' : 'Other'}`);

// Example 3: Good performer
const review3 = {
  clinical_competence: 3.9,
  patient_care: 4.0,
  professionalism: 4.0,
  teamwork: 4.3,
  quality_safety: 4.2
};

const avg3 = (review3.clinical_competence + review3.patient_care + review3.professionalism + review3.teamwork + review3.quality_safety) / 5;
console.log('\n3. Good Performer:');
console.log(`   Scores: ${review3.clinical_competence} + ${review3.patient_care} + ${review3.professionalism} + ${review3.teamwork} + ${review3.quality_safety}`);
console.log(`   Average: ${avg3.toFixed(2)}`);
console.log(`   Category: ${avg3 >= 4.0 ? '4.0-4.9 - Exceeds 🔵' : avg3 >= 3.0 ? '3.0-3.9 - Meets 🟡' : 'Other'}`);

console.log('\n📈 How Categories Are Determined:');
console.log('-'.repeat(40));
console.log('if (average >= 5.0) → "5.0 - Outstanding 🟢"');
console.log('else if (average >= 4.0) → "4.0-4.9 - Exceeds 🔵"');
console.log('else if (average >= 3.0) → "3.0-3.9 - Meets 🟡"');
console.log('else if (average >= 2.0) → "2.0-2.9 - Below 🔴"');
console.log('else → "1.0-1.9 - Unsatisfactory 🔴"');

console.log('\n🎯 Based on Your Current UI Display:');
console.log('-'.repeat(40));
console.log('4.0-4.9 - Exceeds: 5 reviews (45%)');
console.log('3.0-3.9 - Meets: 6 reviews (55%)');
console.log('This means you have:');
console.log('• 5 staff members with averages 4.0-4.9');
console.log('• 6 staff members with averages 3.0-3.9');

console.log('\n💡 What This Means:');
console.log('-'.repeat(20));
console.log('• 45% of staff are strong performers (Exceeds)');
console.log('• 55% meet expectations (Meets)');
console.log('• No poor performers (Below/Unsatisfactory)');
console.log('• Overall good performance culture!');
