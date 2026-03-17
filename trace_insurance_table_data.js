console.log('🔍 Tracing Insurance Table Data Source');
console.log('='.repeat(50));

console.log('\n📊 Table Data Analysis:');
console.log('From the HTML table, I can see:');
console.log('• INS005 - Asia Insurance Company (Inactive)');
console.log('• INS003 - Gulf Insurance (Inactive)');
console.log('• INS001 - Iraq Insurance Company (Inactive)');
console.log('• INS004 - Middle East Insurance (Inactive)');
console.log('• INS002 - National Insurance (Inactive)');

console.log('\n🔍 Data Structure Analysis:');
console.log('Columns visible in table:');
console.log('• Company Code (INS001, INS002, etc.)');
console.log('• Company Name (Asia Insurance Company, etc.)');
console.log('• Contact Person (-)');
console.log('• Contact Info (-)');
console.log('• Discount % (0%)');
console.log('• Copay % (0%)');
console.log('• Payment Terms (30 days)');
console.log('• Coverage Limit (-)');
console.log('• Status (Inactive)');
console.log('• Actions (Edit/Deactivate buttons)');

console.log('\n🗂️ Potential Source Tables:');

console.log('\n1️⃣ insurance_companies Table (Most Likely)');
console.log('   📋 Schema Match:');
console.log('   ✅ company_code → INS001, INS002, etc.');
console.log('   ✅ company_name → "Asia Insurance Company", etc.');
console.log('   ✅ default_discount_percentage → 0%');
console.log('   ✅ default_copay_percentage → 0%');
console.log('   ✅ claim_payment_terms_days → "30 days"');
console.log('   ✅ coverage_limit → "-" (null/empty)');
console.log('   ✅ is_active → "Inactive" (false)');
console.log('   ❓ contact_person → "-" (null/empty)');
console.log('   ❓ phone/email → "-" (null/empty)');

console.log('\n2️⃣ insurance_providers Table (Less Likely)');
console.log('   📋 Schema Comparison:');
console.log('   ✅ provider_code → Could match INS001, etc.');
console.log('   ✅ provider_name_en → Could match company names');
console.log('   ✅ is_active → Could match status');
console.log('   ❌ Missing: discount%, copay%, payment terms, coverage limit');
console.log('   ❌ Has: support_frequency, total_annual_budget (not in table)');

console.log('\n3️⃣ insurance_companies_basic Table (Unknown)');
console.log('   ❌ Table not found in migration files');
console.log('   ❓ Could be a view or alias');

console.log('\n🎯 Most Likely Source: insurance_companies');
console.log('');
console.log('Evidence:');
console.log('✅ Column names match exactly');
console.log('✅ Data structure matches (discount%, copay%, etc.)');
console.log('✅ Company codes format matches (INS001 format)');
console.log('✅ All companies show "Inactive" status (is_active = false)');
console.log('✅ Empty contact fields suggest null values in database');

console.log('\n📝 Expected SQL Query:');
console.log('SELECT');
console.log('  company_code,');
console.log('  company_name,');
console.log('  contact_person,');
console.log('  phone,');
console.log('  email,');
console.log('  default_discount_percentage,');
console.log('  default_copay_percentage,');
console.log('  claim_payment_terms_days,');
console.log('  coverage_limit,');
console.log('  is_active');
console.log('FROM insurance_companies');
console.log('ORDER BY company_code');

console.log('\n💡 Why insurance_companies (not insurance_providers):');
console.log('• insurance_companies has pricing fields (discount%, copay%)');
console.log('• insurance_companies has payment terms (claim_payment_terms_days)');
console.log('• insurance_companies has coverage limits');
console.log('• insurance_providers lacks these business/financial fields');
console.log('• Table structure matches business insurance management needs');

console.log('\n🔗 Connection to Other Tables:');
console.log('insurance_companies.organization_id → organizations.id');
console.log('(Multi-tenant structure - each organization has its own insurance companies)');

console.log('\n📊 Summary:');
console.log('The insurance table data is MOST LIKELY fetched from:');
console.log('🎯 Table: insurance_companies');
console.log('📋 Key Fields: company_code, company_name, default_discount_percentage, default_copay_percentage, claim_payment_terms_days, coverage_limit, is_active');
console.log('🔗 Connected to: organizations table (multi-tenant)');
