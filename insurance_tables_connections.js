console.log('🔗 Insurance Tables Connections');
console.log('='.repeat(50));

console.log('\n📊 Table Relationships Found:');

console.log('\n1️⃣ patient_insurance Table Connections:');
console.log('   ┌─ patient_insurance ─────────────────────┐');
console.log('   │ • insurance_id (UUID, PRIMARY KEY)      │');
console.log('   │ • patient_id → patients.patient_id      │ ← 🔗 CONNECTS TO PATIENTS');
console.log('   │ • provider_id → insurance_providers.provider_id │ ← 🔗 CONNECTS TO INSURANCE PROVIDERS');
console.log('   │ • policy_number, status, coverage_type  │');
console.log('   │ • created_at, updated_at               │');
console.log('   └─────────────────────────────────────────┘');

console.log('\n2️⃣ insurance_providers Table Connections:');
console.log('   ┌─ insurance_providers ───────────────────┐');
console.log('   │ • provider_id (UUID, PRIMARY KEY)       │');
console.log('   │ • provider_code (UNIQUE: INS-001)       │');
console.log('   │ • provider_name_ar, provider_name_en    │');
console.log('   │ • provider_type, phone, email           │');
console.log('   │ • support_frequency, total_annual_budget │');
console.log('   │ • is_active, created_at, updated_at     │');
console.log('   └─────────────────────────────────────────┘');
console.log('         ↑');
console.log('         │ Referenced by patient_insurance.provider_id');

console.log('\n3️⃣ insurance_companies Table Connections:');
console.log('   ┌─ insurance_companies ──────────────────┐');
console.log('   │ • id (UUID, PRIMARY KEY)               │');
console.log('   │ • organization_id → organizations.id   │ ← 🔗 CONNECTS TO ORGANIZATIONS');
console.log('   │ • company_code (UNIQUE)                │');
console.log('   │ • company_name, company_name_ar         │');
console.log('   │ • contact_person, phone, email          │');
console.log('   │ • default_discount_percentage           │');
console.log('   │ • default_copay_percentage              │');
console.log('   │ • claim_payment_terms_days              │');
console.log('   │ • coverage_limit, is_active             │');
console.log('   └─────────────────────────────────────────┘');

console.log('\n4️⃣ insurance_companies_basic Table:');
console.log('   ❌ NOT FOUND in any migration files');
console.log('   ℹ️  This table may not exist or may be a view/alias');

console.log('\n🔍 Complete Connection Diagram:');
console.log('');
console.log('organizations');
console.log('    │ (organization_id)');
console.log('    ↓');
console.log('insurance_companies ─── (provider_id) ─── patient_insurance ─── (patient_id) ─── patients');
console.log('                                ↑');
console.log('                                │');
console.log('                        insurance_providers');

console.log('\n📋 Connection Details:');

console.log('\n🔗 patients → patient_insurance:');
console.log('   • Relationship: One-to-Many');
console.log('   • Foreign Key: patient_insurance.patient_id → patients.patient_id');
console.log('   • Delete Action: CASCADE (delete patient insurance if patient deleted)');

console.log('\n🔗 insurance_providers → patient_insurance:');
console.log('   • Relationship: One-to-Many');
console.log('   • Foreign Key: patient_insurance.provider_id → insurance_providers.provider_id');
console.log('   • Delete Action: RESTRICT (cannot delete provider if patient insurance exists)');

console.log('\n🔗 organizations → insurance_companies:');
console.log('   • Relationship: One-to-Many');
console.log('   • Foreign Key: insurance_companies.organization_id → organizations.id');
console.log('   • Delete Action: Not specified (default behavior)');

console.log('\n💡 Key Points:');
console.log('• patient_insurance is the JUNCTION table connecting patients and insurance providers');
console.log('• insurance_providers and insurance_companies appear to be DIFFERENT tables');
console.log('• insurance_companies is linked to organizations (multi-tenant structure)');
console.log('• insurance_providers is standalone (single-tenant structure)');
console.log('• insurance_companies_basic was not found in any migration files');

console.log('\n🎯 Data Flow:');
console.log('1. patients (patient data)');
console.log('2. ↓ (patient_id)');
console.log('3. patient_insurance (insurance policies for patients)');
console.log('4. ↓ (provider_id)');
console.log('5. insurance_providers (insurance company information)');
console.log('');
console.log('Separate flow:');
console.log('1. organizations (tenant/company data)');
console.log('2. ↓ (organization_id)');
console.log('3. insurance_companies (company-specific insurance providers)');

console.log('\n📝 Summary:');
console.log('The insurance tables connect to:');
console.log('✅ patients table (via patient_insurance)');
console.log('✅ insurance_providers table (via patient_insurance)');
console.log('✅ organizations table (via insurance_companies)');
console.log('❌ insurance_companies_basic (table not found)');
