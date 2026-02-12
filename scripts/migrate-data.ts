/**
 * TIBBNA-EHR DATA MIGRATION SCRIPT
 * Migrates JSON demo data → Supabase database
 * 
 * Usage: npx ts-node --compiler-options '{"module":"commonjs"}' scripts/migrate-data.ts
 * Or:    npx tsx scripts/migrate-data.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const ORG_ID = '00000000-0000-0000-0000-000000000001';

function loadJSON(relativePath: string): any {
  const fullPath = path.join(process.cwd(), relativePath);
  if (!fs.existsSync(fullPath)) {
    console.warn(`⚠️  File not found: ${relativePath}`);
    return null;
  }
  return JSON.parse(fs.readFileSync(fullPath, 'utf-8'));
}

// Track ID mappings (old JSON id → new UUID)
const idMap: Record<string, Record<string, string>> = {
  departments: {},
  employees: {},
  patients: {},
  insurance_providers: {},
  suppliers: {},
  inventory_items: {},
  services: {},
  accounts: {},
  cost_centers: {},
  stakeholders: {},
  leave_types: {},
  salary_grades: {},
  journal_entries: {},
  invoices: {},
};

async function migrateOrganization() {
  console.log('🏥 Creating organization...');
  const { data, error } = await supabase
    .from('organizations')
    .upsert({
      id: ORG_ID,
      code: 'TIBBNA-001',
      name: 'Tibbna Hospital',
      name_ar: 'مستشفى تبنى',
      type: 'HOSPITAL',
      license_number: 'IQ-MOH-2024-001',
      active: true,
      address: {
        street: 'Medical City Complex',
        city: 'Baghdad',
        governorate: 'Baghdad',
        country: 'Iraq'
      },
      contact: {
        phone: '+964-770-000-0001',
        email: 'admin@tibbna.com',
        website: 'https://tibbna.com'
      }
    }, { onConflict: 'id' })
    .select()
    .single();

  if (error) console.error('  Error:', error.message);
  else console.log('  ✅ Organization created');
  return data;
}

async function migrateDepartments() {
  console.log('\n📁 Migrating departments...');
  const json = loadJSON('src/data/hr/departments.json');
  if (!json?.departments) return;

  let count = 0;
  for (const dept of json.departments) {
    const { data, error } = await supabase
      .from('departments')
      .insert({
        organization_id: ORG_ID,
        code: dept.code,
        name: dept.name,
        name_ar: dept.name_arabic || null,
        type: dept.type || null,
        active: dept.is_active !== false,
        budget_code: dept.code,
        metadata: {
          location: dept.location,
          phone_ext: dept.phone_ext,
          budget_annual: dept.budget_annual,
          original_id: dept.id
        }
      })
      .select('id')
      .single();

    if (error) {
      console.error(`  Error (${dept.code}):`, error.message);
    } else if (data) {
      idMap.departments[dept.id] = data.id;
      count++;
    }
  }
  console.log(`  ✅ ${count}/${json.departments.length} departments migrated`);
}

async function migrateEmployees() {
  console.log('\n👥 Migrating employees...');
  const json = loadJSON('src/data/hr/employees.json');
  if (!json?.employees) return;

  let count = 0;
  for (const emp of json.employees) {
    const departmentId = idMap.departments[emp.department_id] || null;

    const nameParts = emp.full_name_arabic?.split(' ') || [];
    const firstNameAr = nameParts[0] || null;
    const lastNameAr = nameParts.slice(1).join(' ') || null;

    const { data, error } = await supabase
      .from('employees')
      .insert({
        organization_id: ORG_ID,
        department_id: departmentId,
        employee_number: emp.employee_number || emp.id,
        national_id: emp.national_id || null,
        first_name: emp.first_name,
        last_name: emp.last_name,
        first_name_ar: firstNameAr,
        last_name_ar: lastNameAr,
        date_of_birth: emp.date_of_birth || null,
        gender: emp.gender || null,
        marital_status: emp.marital_status || null,
        nationality: emp.nationality || 'Iraqi',
        job_title: emp.job_title || null,
        employment_type: emp.employment_type || 'FULL_TIME',
        employment_status: emp.employment_status || 'ACTIVE',
        hire_date: emp.date_of_hire || null,
        salary_grade: emp.grade_id || null,
        base_salary: emp.basic_salary || null,
        currency: 'IQD',
        email: emp.email_work || null,
        phone: emp.phone_mobile || null,
        active: emp.employment_status === 'ACTIVE',
        emergency_contact: emp.emergency_contact || null,
        qualifications: emp.education || null,
        specialties: emp.licenses || null,
        license_number: emp.licenses?.[0]?.number || null,
        license_expiry: emp.licenses?.[0]?.expiry || null,
        address: emp.address || null,
        metadata: {
          blood_type: emp.blood_type,
          photo_url: emp.photo_url,
          employee_category: emp.employee_category,
          shift_id: emp.shift_id,
          reporting_to: emp.reporting_to,
          original_id: emp.id
        }
      })
      .select('id')
      .single();

    if (error) {
      console.error(`  Error (${emp.id}):`, error.message);
    } else if (data) {
      idMap.employees[emp.id] = data.id;
      count++;
    }
  }
  console.log(`  ✅ ${count}/${json.employees.length} employees migrated`);
}

async function migratePatients() {
  console.log('\n🏥 Migrating patients...');
  const json = loadJSON('src/data/finance/patients.json');
  if (!json?.patients) return;

  let count = 0;
  for (const pt of json.patients) {
    const { data, error } = await supabase
      .from('patients')
      .insert({
        organization_id: ORG_ID,
        medical_record_number: pt.patient_number,
        national_id: pt.national_id || null,
        first_name: pt.first_name_en || pt.first_name_ar,
        last_name: pt.last_name_en || pt.last_name_ar,
        first_name_ar: pt.first_name_ar || null,
        last_name_ar: pt.last_name_ar || null,
        date_of_birth: pt.date_of_birth || null,
        gender: pt.gender || null,
        nationality: 'Iraqi',
        email: pt.email || null,
        phone: pt.phone || pt.mobile || null,
        active: pt.is_active !== false,
        address: {
          governorate: pt.governorate,
          district: pt.district,
          neighborhood: pt.neighborhood
        },
        metadata: {
          emergency_contact_name: pt.emergency_contact_name_ar,
          emergency_contact_phone: pt.emergency_contact_phone,
          emergency_contact_relationship: pt.emergency_contact_relationship_ar,
          total_balance: pt.total_balance,
          original_id: pt.patient_id
        }
      })
      .select('id')
      .single();

    if (error) {
      console.error(`  Error (${pt.patient_id}):`, error.message);
    } else if (data) {
      idMap.patients[pt.patient_id] = data.id;
      count++;
    }
  }
  console.log(`  ✅ ${count}/${json.patients.length} patients migrated`);
}

async function migrateInsuranceProviders() {
  console.log('\n🛡️ Migrating insurance providers...');
  const json = loadJSON('src/data/finance/insurance.json');
  if (!json?.insurance_providers) return;

  let count = 0;
  for (const ins of json.insurance_providers) {
    const typeMap: Record<string, string> = {
      'MOH': 'GOVERNMENT',
      'GOVERNMENT': 'GOVERNMENT',
      'PRIVATE_INSURANCE': 'PRIVATE',
      'CORPORATE': 'CORPORATE'
    };

    const { data, error } = await supabase
      .from('insurance_providers')
      .insert({
        code: ins.provider_code,
        name: ins.provider_name_en || ins.provider_name_ar,
        name_ar: ins.provider_name_ar || null,
        type: typeMap[ins.provider_type] || 'PRIVATE',
        active: ins.is_active !== false,
        annual_budget: ins.total_annual_budget || null,
        contact: {
          phone: ins.phone,
          email: ins.email
        },
        address: {
          address_ar: ins.address_ar
        },
        metadata: {
          support_frequency: ins.support_frequency,
          original_id: ins.provider_id
        }
      })
      .select('id')
      .single();

    if (error) {
      console.error(`  Error (${ins.provider_code}):`, error.message);
    } else if (data) {
      idMap.insurance_providers[ins.provider_id] = data.id;
      count++;
    }
  }
  console.log(`  ✅ ${count}/${json.insurance_providers.length} insurance providers migrated`);
}

async function migrateSuppliers() {
  console.log('\n🚚 Migrating suppliers...');

  // Finance suppliers
  const finJson = loadJSON('src/data/finance/suppliers.json');
  if (finJson?.suppliers) {
    let count = 0;
    for (const sup of finJson.suppliers) {
      const catMap: Record<string, string> = {
        'MEDICAL_SUPPLIES': 'SUPPLIES',
        'PHARMACEUTICALS': 'PHARMACEUTICAL',
        'MEDICAL_EQUIPMENT': 'MEDICAL_EQUIPMENT',
        'LABORATORY': 'SUPPLIES',
        'GENERAL': 'SERVICES'
      };

      const { data, error } = await supabase
        .from('suppliers')
        .insert({
          code: sup.supplier_code,
          name: sup.company_name_en || sup.company_name_ar,
          name_ar: sup.company_name_ar || null,
          type: catMap[sup.supplier_category] || 'SUPPLIES',
          tax_id: sup.tax_registration_number || null,
          credit_limit: sup.credit_limit || null,
          currency: 'IQD',
          active: sup.is_active !== false,
          contact: {
            person: sup.contact_person_ar,
            phone: sup.phone,
            mobile: sup.mobile,
            email: sup.email
          },
          address: {
            governorate: sup.governorate,
            district: sup.district,
            address_ar: sup.address_ar
          },
          metadata: {
            bank_name: sup.bank_name_ar,
            account_number: sup.account_number,
            payment_terms: sup.payment_terms_ar,
            original_id: sup.supplier_id
          }
        })
        .select('id')
        .single();

      if (error) {
        console.error(`  Error (${sup.supplier_code}):`, error.message);
      } else if (data) {
        idMap.suppliers[sup.supplier_id] = data.id;
        count++;
      }
    }
    console.log(`  ✅ ${count}/${finJson.suppliers.length} finance suppliers migrated`);
  }

  // Inventory suppliers
  const invJson = loadJSON('src/data/inventory/suppliers.json');
  if (invJson?.suppliers) {
    let count = 0;
    for (const sup of invJson.suppliers) {
      const catMap: Record<string, string> = {
        'PHARMACEUTICAL': 'PHARMACEUTICAL',
        'LAB_EQUIPMENT': 'MEDICAL_EQUIPMENT',
        'MEDICAL_EQUIPMENT': 'MEDICAL_EQUIPMENT',
        'MEDICAL_SUPPLIES': 'SUPPLIES'
      };

      const { data, error } = await supabase
        .from('suppliers')
        .insert({
          code: sup.supplier_code,
          name: sup.supplier_name,
          type: catMap[sup.supplier_type] || 'SUPPLIES',
          rating: sup.performance_rating || null,
          active: sup.is_active !== false,
          contact: {
            person: sup.contact_person,
            phone: sup.phone,
            email: sup.email
          },
          address: {
            address: sup.address,
            city: sup.city,
            country: sup.country
          },
          metadata: {
            payment_terms: sup.payment_terms,
            lead_time_days: sup.lead_time_days,
            original_id: sup.id
          }
        })
        .select('id')
        .single();

      if (error) {
        // Might be duplicate code
        if (!error.message.includes('duplicate')) {
          console.error(`  Error (${sup.supplier_code}):`, error.message);
        }
      } else if (data) {
        idMap.suppliers[sup.id] = data.id;
        count++;
      }
    }
    console.log(`  ✅ ${count}/${invJson.suppliers.length} inventory suppliers migrated`);
  }
}

async function migrateServices() {
  console.log('\n🩺 Migrating services...');
  const json = loadJSON('src/data/services.json');
  if (!json?.services) return;

  let count = 0;
  for (const svc of json.services) {
    const { data, error } = await supabase
      .from('service_catalog')
      .insert({
        organization_id: ORG_ID,
        code: svc.id,
        name: svc.name,
        description: svc.description || null,
        category: svc.category || null,
        price_self_pay: svc.price?.selfPay || 0,
        price_insurance: svc.price?.insurance || 0,
        price_government: svc.price?.government || 0,
        currency: 'IQD',
        cpt_code: svc.cptCode || null,
        icd10_code: svc.icd10Code || null,
        duration_minutes: svc.duration || null,
        requires_appointment: svc.requiresAppointment || false,
        active: svc.status === 'active',
        metadata: {
          specialty: svc.specialty,
          equipment_needed: svc.equipmentNeeded,
          supplies_needed: svc.suppliesNeeded,
          staff_required: svc.staffRequired,
          original_id: svc.id
        }
      })
      .select('id')
      .single();

    if (error) {
      console.error(`  Error (${svc.id}):`, error.message);
    } else if (data) {
      idMap.services[svc.id] = data.id;
      count++;
    }
  }
  console.log(`  ✅ ${count}/${json.services.length} services migrated`);
}

async function migrateInventoryItems() {
  console.log('\n📦 Migrating inventory items...');
  const json = loadJSON('src/data/inventory/items.json');
  if (!json?.items) return;

  let count = 0;
  for (const item of json.items) {
    const catMap: Record<string, string> = {
      'Pharmacy': 'MEDICATION',
      'Medical Supplies': 'SUPPLY',
      'Laboratory': 'REAGENT',
      'Equipment': 'EQUIPMENT',
      'DRUG': 'MEDICATION'
    };

    const { data, error } = await supabase
      .from('inventory_items')
      .insert({
        organization_id: ORG_ID,
        code: item.item_code,
        barcode: item.barcode || null,
        name: item.item_name,
        description: item.generic_name || null,
        category: catMap[item.category] || catMap[item.item_type] || 'SUPPLY',
        subcategory: item.subcategory || null,
        rxnorm_code: item.medical_codes?.rxnorm || null,
        unit_of_measure: item.unit_of_measure || 'Unit',
        reorder_level: item.reorder_level || 0,
        reorder_quantity: item.maximum_stock || null,
        max_stock_level: item.maximum_stock || null,
        standard_cost: item.unit_cost || null,
        is_controlled_substance: item.is_controlled_substance || false,
        requires_prescription: item.pharmacy_ext?.is_high_alert_medication || false,
        strength: item.pharmacy_ext?.strength || null,
        dosage_form: item.pharmacy_ext?.dosage_form || null,
        active: item.is_active !== false,
        metadata: {
          brand_name: item.brand_name,
          manufacturer: item.manufacturer,
          selling_price: item.selling_price,
          storage_conditions: item.storage_conditions,
          medical_codes: item.medical_codes,
          conversion_factors: item.conversion_factors,
          pharmacy_ext: item.pharmacy_ext,
          original_id: item.id
        }
      })
      .select('id')
      .single();

    if (error) {
      console.error(`  Error (${item.item_code}):`, error.message);
    } else if (data) {
      idMap.inventory_items[item.id] = data.id;
      count++;
    }
  }
  console.log(`  ✅ ${count}/${json.items.length} inventory items migrated`);
}

async function migrateChartOfAccounts() {
  console.log('\n📊 Migrating chart of accounts...');
  const json = loadJSON('src/data/finance/accounting.json');
  if (!json?.chart_of_accounts) return;

  // First pass: create all accounts without parent references
  let count = 0;
  for (const acc of json.chart_of_accounts) {
    const { data, error } = await supabase
      .from('chart_of_accounts')
      .insert({
        organization_id: ORG_ID,
        account_code: acc.account_number,
        account_name: acc.account_name_en,
        account_name_ar: acc.account_name_ar || null,
        account_type: acc.account_type,
        normal_balance: acc.normal_balance,
        current_balance: acc.balance || 0,
        allow_posting: acc.allow_posting || false,
        active: acc.is_active !== false,
        metadata: {
          original_id: acc.account_id
        }
      })
      .select('id')
      .single();

    if (error) {
      console.error(`  Error (${acc.account_number}):`, error.message);
    } else if (data) {
      idMap.accounts[acc.account_id] = data.id;
      count++;
    }
  }

  // Second pass: set parent references
  for (const acc of json.chart_of_accounts) {
    if (acc.parent_account_id && idMap.accounts[acc.account_id] && idMap.accounts[acc.parent_account_id]) {
      await supabase
        .from('chart_of_accounts')
        .update({ parent_id: idMap.accounts[acc.parent_account_id] } as any)
        .eq('id', idMap.accounts[acc.account_id]);
    }
  }

  console.log(`  ✅ ${count}/${json.chart_of_accounts.length} accounts migrated`);
}

async function migrateCostCenters() {
  console.log('\n💰 Migrating cost centers...');
  const json = loadJSON('src/data/finance/accounting.json');
  if (!json?.cost_centers) return;

  let count = 0;
  for (const cc of json.cost_centers) {
    const typeMap: Record<string, string> = {
      'PROFIT_CENTER': 'PROFIT',
      'COST_CENTER': 'COST',
      'REVENUE_CENTER': 'REVENUE'
    };

    const { data, error } = await supabase
      .from('cost_centers')
      .insert({
        organization_id: ORG_ID,
        code: cc.cost_center_code,
        name: cc.name_en || cc.name_ar,
        name_ar: cc.name_ar || null,
        type: typeMap[cc.center_type] || 'COST',
        annual_budget: cc.annual_budget || 0,
        actual_spending: cc.actual_spending || 0,
        active: cc.is_active !== false,
        metadata: {
          department_id: cc.department_id,
          original_id: cc.cost_center_id
        }
      })
      .select('id')
      .single();

    if (error) {
      console.error(`  Error (${cc.cost_center_code}):`, error.message);
    } else if (data) {
      idMap.cost_centers[cc.cost_center_id] = data.id;
      count++;
    }
  }
  console.log(`  ✅ ${count}/${json.cost_centers.length} cost centers migrated`);
}

async function migrateJournalEntries() {
  console.log('\n📝 Migrating journal entries...');
  const json = loadJSON('src/data/finance/accounting.json');
  if (!json?.journal_entries) return;

  let count = 0;
  for (const je of json.journal_entries) {
    const { data, error } = await supabase
      .from('journal_entries')
      .insert({
        organization_id: ORG_ID,
        entry_number: je.entry_number,
        entry_date: je.entry_date,
        posting_date: je.posting_date || null,
        description: je.description_ar || `Journal Entry ${je.entry_number}`,
        reference: je.source_document_id || null,
        entry_type: je.entry_type || 'STANDARD',
        status: je.status || 'POSTED',
        total_debit: je.total_debits || 0,
        total_credit: je.total_credits || 0,
        posted_at: je.posted_at || null,
        metadata: {
          source_type: je.source_type,
          fiscal_year: je.fiscal_year,
          fiscal_month: je.fiscal_month,
          original_id: je.entry_id
        }
      })
      .select('id')
      .single();

    if (error) {
      console.error(`  Error (${je.entry_number}):`, error.message);
    } else if (data) {
      idMap.journal_entries[je.entry_id] = data.id;
      count++;
    }
  }
  console.log(`  ✅ ${count}/${json.journal_entries.length} journal entries migrated`);

  // Migrate journal entry lines
  if (json.journal_entry_lines) {
    let lineCount = 0;
    for (let i = 0; i < json.journal_entry_lines.length; i++) {
      const line = json.journal_entry_lines[i];
      const entryId = idMap.journal_entries[line.entry_id];
      const accountId = idMap.accounts[line.account_id];
      const costCenterId = line.cost_center_id ? idMap.cost_centers[line.cost_center_id] : null;

      if (!entryId) continue;

      const { error } = await supabase
        .from('journal_entry_lines')
        .insert({
          entry_id: entryId,
          line_number: i + 1,
          account_id: accountId || null,
          cost_center_id: costCenterId || null,
          description: line.line_description_ar || null,
          debit_amount: line.debit_amount || 0,
          credit_amount: line.credit_amount || 0
        } as any);

      if (!error) lineCount++;
    }
    console.log(`  ✅ ${lineCount}/${json.journal_entry_lines.length} journal entry lines migrated`);
  }
}

async function migrateInvoices() {
  console.log('\n🧾 Migrating invoices...');
  const json = loadJSON('src/data/finance/invoices.json');
  if (!json?.invoices) return;

  let count = 0;
  for (const inv of json.invoices) {
    const patientId = idMap.patients[inv.patient_id] || null;

    const paymentStatusMap: Record<string, string> = {
      'PAID': 'PAID',
      'PARTIALLY_PAID': 'PARTIALLY_PAID',
      'UNPAID': 'UNPAID',
      'OVERDUE': 'OVERDUE'
    };

    const { data, error } = await supabase
      .from('invoices')
      .insert({
        organization_id: ORG_ID,
        invoice_number: inv.invoice_number,
        invoice_date: inv.invoice_date,
        patient_id: patientId,
        subtotal: inv.subtotal || 0,
        discount_amount: inv.discount_amount || 0,
        discount_percentage: inv.discount_percentage || 0,
        total_amount: inv.total_amount || 0,
        insurance_coverage: inv.insurance_coverage_amount || 0,
        patient_responsibility: inv.patient_responsibility || 0,
        paid_amount: inv.amount_paid || 0,
        balance_due: inv.balance_due || 0,
        status: inv.status || 'ISSUED',
        payment_status: paymentStatusMap[inv.balance_due > 0 ? 'UNPAID' : 'PAID'] || 'UNPAID',
        notes: inv.notes || null,
        metadata: {
          payment_method: inv.payment_method,
          payment_date: inv.payment_date,
          insurance_provider_id: inv.insurance_provider_id,
          insurance_coverage_percentage: inv.insurance_coverage_percentage,
          original_id: inv.invoice_id
        }
      })
      .select('id')
      .single();

    if (error) {
      console.error(`  Error (${inv.invoice_number}):`, error.message);
    } else if (data) {
      idMap.invoices[inv.invoice_id] = data.id;
      count++;
    }
  }
  console.log(`  ✅ ${count}/${json.invoices.length} invoices migrated`);
}

async function migrateStakeholders() {
  console.log('\n🤝 Migrating stakeholders...');
  const json = loadJSON('src/data/finance/stakeholders.json');
  if (!json?.stakeholders) return;

  let count = 0;
  for (const sh of json.stakeholders) {
    const typeMap: Record<string, string> = {
      'HOSPITAL': 'FOUNDER',
      'DOCTOR': 'PARTNER',
      'INVESTOR': 'INVESTOR',
      'PARTNER': 'PARTNER',
      'SHAREHOLDER': 'SHAREHOLDER'
    };

    const { data, error } = await supabase
      .from('stakeholders')
      .insert({
        organization_id: ORG_ID,
        code: sh.stakeholder_code,
        name: sh.name_en || sh.name_ar,
        name_ar: sh.name_ar || null,
        type: typeMap[sh.role] || 'PARTNER',
        ownership_percentage: sh.default_share_percentage || null,
        active: sh.is_active !== false,
        contact: {
          mobile: sh.mobile,
          email: sh.email,
          specialty: sh.specialty_en,
          specialty_ar: sh.specialty_ar
        },
        metadata: {
          license_number: sh.license_number,
          license_expiry_date: sh.license_expiry_date,
          bank_name: sh.bank_name_ar,
          account_number: sh.account_number,
          share_type: sh.default_share_type,
          department_id: sh.department_id,
          original_id: sh.stakeholder_id
        }
      })
      .select('id')
      .single();

    if (error) {
      console.error(`  Error (${sh.stakeholder_code}):`, error.message);
    } else if (data) {
      idMap.stakeholders[sh.stakeholder_id] = data.id;
      count++;
    }
  }
  console.log(`  ✅ ${count}/${json.stakeholders.length} stakeholders migrated`);
}

async function migrateSalaryGrades() {
  console.log('\n💵 Migrating salary grades...');
  const json = loadJSON('src/data/hr/payroll.json');
  if (!json?.salary_grades) return;

  let count = 0;
  for (const sg of json.salary_grades) {
    const { data, error } = await supabase
      .from('salary_grades')
      .insert({
        organization_id: ORG_ID,
        grade_code: sg.code,
        title: sg.name,
        min_salary: sg.min_salary,
        max_salary: sg.max_salary,
        currency: sg.currency || 'IQD',
        active: true,
        metadata: {
          original_id: sg.id
        }
      })
      .select('id')
      .single();

    if (error) {
      console.error(`  Error (${sg.code}):`, error.message);
    } else if (data) {
      idMap.salary_grades[sg.id] = data.id;
      count++;
    }
  }
  console.log(`  ✅ ${count}/${json.salary_grades.length} salary grades migrated`);
}

async function migrateLeaveTypes() {
  console.log('\n🏖️ Migrating leave types...');
  const json = loadJSON('src/data/hr/leaves.json');
  if (!json?.leave_types) return;

  let count = 0;
  for (const lt of json.leave_types) {
    const { data, error } = await supabase
      .from('leave_types')
      .insert({
        organization_id: ORG_ID,
        code: lt.code,
        name: lt.name,
        max_days_per_year: lt.max_days || null,
        max_consecutive_days: lt.max_consecutive || null,
        requires_approval: true,
        requires_documentation: lt.requires_doc || false,
        carry_forward: lt.carry_forward || false,
        paid: lt.category === 'PAID',
        active: true,
        metadata: {
          accrual_method: lt.accrual_method,
          accrual_rate: lt.accrual_rate,
          notice_days: lt.notice_days,
          max_carry: lt.max_carry,
          color: lt.color,
          original_id: lt.id
        }
      })
      .select('id')
      .single();

    if (error) {
      console.error(`  Error (${lt.code}):`, error.message);
    } else if (data) {
      idMap.leave_types[lt.id] = data.id;
      count++;
    }
  }
  console.log(`  ✅ ${count}/${json.leave_types.length} leave types migrated`);
}

// ============================================================================
// MAIN MIGRATION
// ============================================================================

async function migrate() {
  console.log('🚀 TIBBNA-EHR DATA MIGRATION');
  console.log('='.repeat(50));
  console.log(`Target: ${supabaseUrl}`);
  console.log(`Org ID: ${ORG_ID}`);
  console.log('='.repeat(50));

  try {
    // Phase 1: Core entities (no dependencies)
    await migrateOrganization();
    await migrateDepartments();

    // Phase 2: Entities with department dependencies
    await migrateEmployees();
    await migratePatients();
    await migrateInsuranceProviders();
    await migrateSuppliers();
    await migrateServices();
    await migrateInventoryItems();

    // Phase 3: Financial data
    await migrateChartOfAccounts();
    await migrateCostCenters();
    await migrateJournalEntries();
    await migrateInvoices();

    // Phase 4: HR data
    await migrateSalaryGrades();
    await migrateLeaveTypes();

    // Phase 5: Stakeholders
    await migrateStakeholders();

    console.log('\n' + '='.repeat(50));
    console.log('🎉 MIGRATION COMPLETED SUCCESSFULLY!');
    console.log('='.repeat(50));

    // Print summary
    console.log('\n📊 ID Mapping Summary:');
    for (const [table, map] of Object.entries(idMap)) {
      const count = Object.keys(map).length;
      if (count > 0) {
        console.log(`  ${table}: ${count} records`);
      }
    }
  } catch (error) {
    console.error('\n❌ MIGRATION FAILED:', error);
    process.exit(1);
  }
}

migrate();
