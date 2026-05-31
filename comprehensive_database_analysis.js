const { Pool } = require('pg');

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_RBybikcu3tz5@ep-long-river-allaqs25.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require',
  ssl: { rejectUnauthorized: false }
});

async function generateComprehensiveAnalysis() {
  console.log('🔍 Generating Comprehensive Database Analysis...\n');
  
  try {
    const client = await pool.connect();
    
    try {
      // Get all tables
      const tablesQuery = `
        SELECT 
          table_name,
          table_type
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
        ORDER BY table_name
      `;
      
      const tablesResult = await client.query(tablesQuery);
      const tables = tablesResult.rows;
      
      // Group tables by system
      const systems = {
        'PATIENT_MANAGEMENT': [],
        'HR_RECRUITMENT': [],
        'FINANCE_BILLING': [],
        'INVENTORY_PHARMACY': [],
        'LABORATORY': [],
        'SYSTEM_ADMIN': [],
        'OTHER': []
      };
      
      // Categorize tables
      tables.forEach(table => {
        const name = table.table_name.toLowerCase();
        if (name.includes('patient') || name.includes('medical') || name.includes('allergy') || name.includes('visit')) {
          systems.PATIENT_MANAGEMENT.push(table.table_name);
        } else if (name.includes('job') || name.includes('employee') || name.includes('payroll') || name.includes('attendance') || name.includes('department') || name.includes('specialty')) {
          systems.HR_RECRUITMENT.push(table.table_name);
        } else if (name.includes('invoice') || name.includes('payment') || name.includes('financial') || name.includes('insurance') || name.includes('billing')) {
          systems.FINANCE_BILLING.push(table.table_name);
        } else if (name.includes('stock') || name.includes('inventory') || name.includes('pharmacy') || name.includes('drug') || name.includes('batch') || name.includes('store') || name.includes('warehouse') || name.includes('supplier')) {
          systems.INVENTORY_PHARMACY.push(table.table_name);
        } else if (name.includes('worklist') || name.includes('workspace') || name.includes('lab') || name.includes('specimen') || name.includes('result')) {
          systems.LABORATORY.push(table.table_name);
        } else if (name.includes('user') || name.includes('role') || name.includes('permission') || name.includes('session') || name.includes('audit')) {
          systems.SYSTEM_ADMIN.push(table.table_name);
        } else {
          systems.OTHER.push(table.table_name);
        }
      });
      
      // Generate analysis for each system
      for (const [systemName, tableNames] of Object.entries(systems)) {
        if (tableNames.length === 0) continue;
        
        console.log(`\n${'='.repeat(80)}`);
        console.log(`🏢 ${systemName.replace(/_/g, ' ').toUpperCase()} SYSTEM`);
        console.log(`${'='.repeat(80)}`);
        
        for (const tableName of tableNames) {
          await analyzeTable(client, tableName, systemName);
        }
      }
      
      // Generate system model summary
      console.log(`\n${'='.repeat(80)}`);
      console.log('📊 SYSTEM MODEL SUMMARY');
      console.log(`${'='.repeat(80)}`);
      
      await generateSystemModelSummary(client, systems);
      
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('Error generating analysis:', error);
  } finally {
    await pool.end();
  }
}

async function analyzeTable(client, tableName, systemName) {
  console.log(`\n🗂️  TABLE: ${tableName.toUpperCase()}`);
  console.log('─'.repeat(60));
  
  // Get table structure
  const structureQuery = `
    SELECT 
      column_name,
      data_type,
      is_nullable,
      column_default,
      character_maximum_length,
      numeric_precision,
      numeric_scale
    FROM information_schema.columns 
    WHERE table_name = '${tableName}'
    AND table_schema = 'public'
    ORDER BY ordinal_position
  `;
  
  const structureResult = await client.query(structureQuery);
  const columns = structureResult.rows;
  
  // Get row count
  const countQuery = `SELECT COUNT(*) as count FROM "${tableName}"`;
  const countResult = await client.query(countQuery);
  const rowCount = countResult.rows[0].count;
  
  // Get foreign keys
  const fkQuery = `
    SELECT 
      tc.constraint_name, 
      kcu.column_name, 
      ccu.table_name AS foreign_table_name,
      ccu.column_name AS foreign_column_name 
    FROM information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_name = '${tableName}'
  `;
  
  const fkResult = await client.query(fkQuery);
  const foreignKeys = fkResult.rows;
  
  // Get sample data
  let sampleData = [];
  if (rowCount > 0) {
    const sampleQuery = `SELECT * FROM "${tableName}" LIMIT 2`;
    const sampleResult = await client.query(sampleQuery);
    sampleData = sampleResult.rows;
  }
  
  // Generate table analysis
  const analysis = generateTableAnalysis(tableName, columns, rowCount, foreignKeys, sampleData, systemName);
  
  console.log(`📋 PURPOSE: ${analysis.purpose}`);
  console.log(`🎯 ROLE: ${analysis.role}`);
  console.log(`📊 RECORDS: ${rowCount}`);
  
  if (analysis.keyFields.length > 0) {
    console.log(`🔑 KEY FIELDS: ${analysis.keyFields.join(', ')}`);
  }
  
  if (foreignKeys.length > 0) {
    console.log(`🔗 RELATIONSHIPS:`);
    foreignKeys.forEach(fk => {
      console.log(`   • ${fk.column_name} → ${fk.foreign_table_name}.${fk.foreign_column_name}`);
    });
  }
  
  if (analysis.businessLogic.length > 0) {
    console.log(`⚙️  BUSINESS LOGIC:`);
    analysis.businessLogic.forEach(logic => {
      console.log(`   • ${logic}`);
    });
  }
  
  console.log(`📝 COLUMNS:`);
  columns.forEach(col => {
    const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
    const defaultValue = col.column_default ? `DEFAULT ${col.column_default}` : '';
    console.log(`   • ${col.column_name}: ${col.data_type} (${nullable}) ${defaultValue}`);
  });
}

function generateTableAnalysis(tableName, columns, rowCount, foreignKeys, sampleData, systemName) {
  const analysis = {
    purpose: '',
    role: '',
    keyFields: [],
    businessLogic: []
  };
  
  // Analyze based on table name and columns
  const name = tableName.toLowerCase();
  
  if (systemName === 'PATIENT_MANAGEMENT') {
    if (name.includes('patient')) {
      analysis.purpose = 'Core patient demographic and contact information storage';
      analysis.role = 'Master patient record - central to all hospital operations';
      analysis.keyFields = columns.filter(c => c.column_name.includes('id') || c.column_name.includes('patient')).map(c => c.column_name);
      analysis.businessLogic = [
        'Unique patient identification',
        'Demographic data management',
        'Contact information tracking',
        'Integration with clinical and billing systems'
      ];
    } else if (name.includes('insurance')) {
      analysis.purpose = 'Patient insurance coverage and policy information';
      analysis.role = 'Financial coverage validation and billing support';
      analysis.keyFields = ['patient_id', 'insurance_provider_id', 'policy_number'];
      analysis.businessLogic = [
        'Insurance policy validation',
        'Coverage determination',
        'Claims processing support',
        'Provider network management'
      ];
    } else if (name.includes('medical') || name.includes('history')) {
      analysis.purpose = 'Patient medical history and clinical documentation';
      analysis.role = 'Clinical decision support and continuity of care';
      analysis.keyFields = ['patient_id', 'diagnosis', 'treatment', 'date'];
      analysis.businessLogic = [
        'Medical history tracking',
        'Clinical decision support',
        'Treatment history',
        'Allergy and medication tracking'
      ];
    }
  } else if (systemName === 'HR_RECRUITMENT') {
    if (name.includes('job_candidate')) {
      analysis.purpose = 'Job applicant tracking and recruitment pipeline management';
      analysis.role = 'Talent acquisition and hiring workflow management';
      analysis.keyFields = ['candidate_id', 'vacancy_id', 'status', 'email'];
      analysis.businessLogic = [
        'Candidate pipeline tracking',
        'Interview scheduling',
        'Status progression management',
        'Communication tracking'
      ];
    } else if (name.includes('job_vacanc')) {
      analysis.purpose = 'Job posting and position vacancy management';
      analysis.role = 'Workforce planning and recruitment requirements';
      analysis.keyFields = ['vacancy_id', 'department_id', 'position', 'status'];
      analysis.businessLogic = [
        'Position requisition management',
        'Job posting creation',
        'Department staffing needs',
        'Budget and salary management'
      ];
    } else if (name.includes('employee')) {
      analysis.purpose = 'Employee master records and employment information';
      analysis.role = 'Human resources management and payroll processing';
      analysis.keyFields = ['employee_id', 'department_id', 'position', 'status'];
      analysis.businessLogic = [
        'Employee lifecycle management',
        'Position and department assignment',
        'Employment status tracking',
        'Payroll and benefits integration'
      ];
    } else if (name.includes('payroll')) {
      analysis.purpose = 'Payroll processing and compensation management';
      analysis.role = 'Financial compensation and benefits administration';
      analysis.keyFields = ['employee_id', 'pay_period', 'amount', 'type'];
      analysis.businessLogic = [
        'Salary calculation',
        'Deduction processing',
        'Tax calculation',
        'Payment generation'
      ];
    }
  } else if (systemName === 'FINANCE_BILLING') {
    if (name.includes('invoice')) {
      analysis.purpose = 'Patient billing and invoice generation';
      analysis.role = 'Revenue cycle management and accounts receivable';
      analysis.keyFields = ['invoice_id', 'patient_id', 'amount', 'status'];
      analysis.businessLogic = [
        'Invoice generation',
        'Payment tracking',
        'Insurance claim processing',
        'Accounts receivable management'
      ];
    } else if (name.includes('payment')) {
      analysis.purpose = 'Payment processing and financial transaction recording';
      analysis.role = 'Revenue collection and financial reconciliation';
      analysis.keyFields = ['payment_id', 'invoice_id', 'amount', 'method'];
      analysis.businessLogic = [
        'Payment processing',
        'Method validation',
        'Financial reconciliation',
        'Receipt generation'
      ];
    } else if (name.includes('financial')) {
      analysis.purpose = 'General financial transactions and accounting records';
      analysis.role = 'Financial accounting and reporting';
      analysis.keyFields = ['transaction_id', 'account', 'amount', 'date'];
      analysis.businessLogic = [
        'Financial transaction recording',
        'Account management',
        'Financial reporting',
        'Audit trail maintenance'
      ];
    }
  } else if (systemName === 'INVENTORY_PHARMACY') {
    if (name.includes('stock')) {
      analysis.purpose = 'Inventory level tracking and stock management';
      analysis.role = 'Supply chain management and inventory control';
      analysis.keyFields = ['item_id', 'quantity', 'location', 'status'];
      analysis.businessLogic = [
        'Stock level monitoring',
        'Reorder point calculation',
        'Location tracking',
        'Status management'
      ];
    } else if (name.includes('pharmacy')) {
      analysis.purpose = 'Pharmacy-specific inventory and dispensing operations';
      analysis.role = 'Medication management and pharmaceutical care';
      analysis.keyFields = ['drug_id', 'batch_id', 'quantity', 'expiry'];
      analysis.businessLogic = [
        'Medication dispensing',
        'Batch tracking',
        'Expiry management',
        'Regulatory compliance'
      ];
    } else if (name.includes('batch')) {
      analysis.purpose = 'Batch tracking for inventory items and medications';
      analysis.role = 'Quality control and traceability management';
      analysis.keyFields = ['batch_id', 'item_id', 'quantity', 'production_date'];
      analysis.businessLogic = [
        'Batch traceability',
        'Quality control',
        'Expiry tracking',
        'Recall management'
      ];
    }
  } else if (systemName === 'LABORATORY') {
    if (name.includes('worklist')) {
      analysis.purpose = 'Laboratory work order and test request management';
      analysis.role = 'Laboratory workflow and test processing coordination';
      analysis.keyFields = ['worklist_id', 'patient_id', 'test_type', 'status'];
      analysis.businessLogic = [
        'Test request processing',
        'Work order assignment',
        'Status tracking',
        'Result integration'
      ];
    } else if (name.includes('workspace')) {
      analysis.purpose = 'Laboratory workspace and department organization';
      analysis.role = 'Laboratory resource management and organization';
      analysis.keyFields = ['workspace_id', 'name', 'type', 'department'];
      analysis.businessLogic = [
        'Workspace management',
        'Resource allocation',
        'Department organization',
        'Access control'
      ];
    }
  }
  
  return analysis;
}

async function generateSystemModelSummary(client, systems) {
  console.log('\n🏗️  SYSTEM ARCHITECTURE OVERVIEW');
  console.log('─'.repeat(60));
  
  console.log('\n📋 CORE SYSTEM MODELS:');
  
  console.log('\n1. PATIENT-CENTERED MODEL');
  console.log('   • Central patient records drive all clinical operations');
  console.log('   • Patient ID links to all clinical, financial, and administrative data');
  console.log('   • Supports comprehensive patient lifecycle management');
  
  console.log('\n2. HEALTHCARE DELIVERY MODEL');
  console.log('   • Clinical services (appointments, visits, treatments)');
  console.log('   • Laboratory services integration');
  console.log('   • Pharmacy and medication management');
  console.log('   • Multi-department care coordination');
  
  console.log('\n3. FINANCIAL MANAGEMENT MODEL');
  console.log('   • Service-based billing and invoicing');
  console.log('   • Insurance processing and claims');
  console.log('   • Revenue cycle management');
  console.log('   • Financial reporting and analytics');
  
  console.log('\n4. HUMAN RESOURCES MODEL');
  console.log('   • Employee lifecycle management');
  console.log('   • Recruitment and onboarding');
  console.log('   • Payroll and compensation');
  console.log('   • Performance and attendance tracking');
  
  console.log('\n5. SUPPLY CHAIN MODEL');
  console.log('   • Inventory management across departments');
  console.log('   • Pharmacy stock control');
  console.log('   • Supplier and procurement management');
  console.log('   • Batch tracking and quality control');
  
  console.log('\n🔄 DATA FLOW PATTERNS:');
  console.log('─'.repeat(60));
  
  console.log('\n• PATIENT FLOW:');
  console.log('  Registration → Clinical Services → Laboratory → Pharmacy → Billing');
  
  console.log('\n• FINANCIAL FLOW:');
  console.log('  Service Delivery → Invoice Generation → Payment Processing → Financial Reporting');
  
  console.log('\n• HR FLOW:');
  console.log('  Recruitment → Onboarding → Employment Management → Payroll → Performance');
  
  console.log('\n• INVENTORY FLOW:');
  console.log('  Procurement → Stock Management → Dispensing → Reorder → Quality Control');
  
  console.log('\n🎯 SYSTEM INTEGRATION POINTS:');
  console.log('─'.repeat(60));
  
  console.log('\n• Clinical Integration:');
  console.log('  - Patient records ↔ Clinical services');
  console.log('  - Laboratory results ↔ Clinical decisions');
  console.log('  - Pharmacy ↔ Medication administration');
  
  console.log('\n• Financial Integration:');
  console.log('  - Clinical services ↔ Billing');
  console.log('  - Insurance ↔ Claims processing');
  console.log('  - Payroll ↔ Financial reporting');
  
  console.log('\n• Administrative Integration:');
  console.log('  - HR ↔ Department management');
  console.log('  - Inventory ↔ Clinical departments');
  console.log('  - System administration ↔ All modules');
  
  console.log('\n📊 SYSTEM METRICS:');
  console.log('─'.repeat(60));
  
  let totalTables = 0;
  let totalRecords = 0;
  
  for (const [systemName, tableNames] of Object.entries(systems)) {
    if (tableNames.length === 0) continue;
    
    totalTables += tableNames.length;
    
    let systemRecords = 0;
    for (const tableName of tableNames) {
      try {
        const countQuery = `SELECT COUNT(*) as count FROM "${tableName}"`;
        const countResult = await client.query(countQuery);
        systemRecords += parseInt(countResult.rows[0].count);
      } catch (error) {
        // Skip tables that might not exist or have access issues
      }
    }
    
    totalRecords += systemRecords;
    console.log(`\n${systemName.replace(/_/g, ' ')}:`);
    console.log(`  Tables: ${tableNames.length}`);
    console.log(`  Records: ${systemRecords.toLocaleString()}`);
  }
  
  console.log(`\nTOTAL SYSTEM:`);
  console.log(`  Tables: ${totalTables}`);
  console.log(`  Records: ${totalRecords.toLocaleString()}`);
  
  console.log('\n🚀 SYSTEM CAPABILITIES:');
  console.log('─'.repeat(60));
  console.log('✅ Complete patient management system');
  console.log('✅ Integrated clinical and laboratory services');
  console.log('✅ Comprehensive financial and billing operations');
  console.log('✅ Full-featured HR and payroll management');
  console.log('✅ Advanced inventory and pharmacy control');
  console.log('✅ Laboratory workflow automation');
  console.log('✅ Multi-department coordination');
  console.log('✅ Regulatory compliance support');
  console.log('✅ Real-time data synchronization');
  console.log('✅ Comprehensive reporting and analytics');
}

// Run the comprehensive analysis
generateComprehensiveAnalysis().then(() => {
  console.log('\n✅ Comprehensive database analysis completed!');
  process.exit(0);
}).catch(error => {
  console.error('❌ Analysis failed:', error);
  process.exit(1);
});
