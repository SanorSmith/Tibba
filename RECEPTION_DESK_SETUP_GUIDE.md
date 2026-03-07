# Reception Desk Database Setup Guide

## 🎯 Overview

This guide provides complete SQL migration scripts for setting up the reception desk database schema, seed data, and API functions for the hospital management system.

## 📋 Migration Files

### 1. **001_reception_desk_schema.sql**
- **Purpose**: Creates all database tables for reception desk operations
- **Tables**: 15 core tables covering patients, insurance, billing, appointments, etc.
- **Features**: Complete schema with indexes, constraints, and triggers

### 2. **002_reception_desk_seed_data.sql**
- **Purpose**: Populates initial data for testing and development
- **Data**: Insurance providers, stakeholders, medical services, sample patients
- **Coverage**: Comprehensive seed data for all major entities

### 3. **003_reception_desk_api_setup.sql**
- **Purpose**: Creates API helper functions, views, and stored procedures
- **Features**: Number generation, data views, business logic, security functions

## 🗄️ Database Schema Overview

### **Core Tables**

#### **Patient Management**
- `patients` - Patient demographics and contact information
- `patient_insurance` - Patient insurance policies and coverage
- `insurance_providers` - Insurance company information

#### **Healthcare Providers**
- `stakeholders` - Doctors, nurses, lab technicians, pharmacists
- `medical_services` - Medical services with pricing
- `service_share_templates` - Revenue sharing configuration

#### **Billing & Invoicing**
- `invoices` - Patient invoices and billing
- `invoice_items` - Individual line items in invoices
- `invoice_shares` - Revenue sharing distribution
- `invoice_returns` - Returns and refunds
- `return_items` - Individual returned items
- `payments` - Payment transactions

#### **Appointments & Bookings**
- `appointments` - Scheduled patient appointments
- `bookings` - Patient booking requests
- `reception_todos` - Reception desk task management

#### **Suppliers**
- `suppliers` - Medical suppliers and vendors

## 🚀 Setup Instructions

### **Step 1: Run Schema Migration**

```sql
-- Execute the schema migration
\i migrations/001_reception_desk_schema.sql
```

**What this creates:**
- 15 database tables with proper relationships
- Indexes for performance optimization
- Constraints for data integrity
- Triggers for automatic timestamp updates

### **Step 2: Run Seed Data Migration**

```sql
-- Execute the seed data migration
\i migrations/002_reception_desk_seed_data.sql
```

**What this creates:**
- 5 insurance providers (government and private)
- 14 healthcare providers (doctors, nurses, technicians)
- 29 medical services (all categories)
- 5 sample patients with complete profiles
- 5 sample reception tasks
- Revenue sharing templates

### **Step 3: Run API Setup Migration**

```sql
-- Execute the API setup migration
\i migrations/003_reception_desk_api_setup.sql
```

**What this creates:**
- Number generation functions
- Comprehensive data views
- Stored procedures for common operations
- Security and access control functions
- Automatic triggers for business logic

## 🔧 Key Features

### **Automatic Number Generation**
- **Patients**: P-YYYY-NNNNN (e.g., P-2024-00001)
- **Invoices**: INV-YYYY-NNNNN (e.g., INV-2024-00001)
- **Appointments**: APT-YYYY-NNNNN (e.g., APT-2024-00001)
- **Bookings**: BKG-YYYY-NNNNN (e.g., BKG-2024-00001)
- **Payments**: PAY-YYYY-NNNNN (e.g., PAY-2024-00001)
- **Todos**: TODO-YYYY-NNNNN (e.g., TODO-2024-00001)

### **Comprehensive Data Views**
- `v_patient_details` - Patients with insurance information
- `v_invoice_details` - Invoices with patient and service details
- `v_appointment_details` - Appointments with doctor information
- `v_booking_details` - Bookings with patient details

### **Stored Procedures**
- `create_patient()` - Create new patient with automatic numbering
- `create_invoice()` - Create invoice with items and revenue sharing
- `create_appointment()` - Create appointment with automatic numbering

### **Automatic Business Logic**
- Patient balance updates when invoices are paid
- Insurance usage tracking
- Revenue sharing calculations
- Timestamp updates

## 📊 Sample Data Overview

### **Insurance Providers**
- Iraq National Insurance Company (Private)
- Iraq Ministry of Health (Government)
- United Health Insurance Company (Private)
- Iraq Social Security (Government)
- Al-Rafidain Insurance Company (Private)

### **Healthcare Providers**
- **Doctors**: Cardiology, Pediatrics, General Surgery, Gynecology
- **Nurses**: General, Emergency, Surgical
- **Lab Technicians**: Laboratory services
- **Pharmacists**: Pharmacy services
- **Anesthesiologists**: Anesthesia services

### **Medical Services**
- **Consultations**: General, Cardiology, Pediatrics, Gynecology, Surgery
- **Examinations**: Physical, Cardiopulmonary, Gynecological
- **Lab Tests**: CBC, Biochemistry, Hormones, Urine, Blood Sugar
- **Radiology**: X-Ray, CT Scan, MRI, Ultrasound
- **Procedures**: Suturing, Injections, Prescriptions
- **Surgery**: Minor, Major, Catheterization
- **Telemedicine**: Remote consultations

### **Sample Patients**
- 5 patients with complete demographic information
- Insurance coverage for all patients
- Emergency contact information
- Medical history records

## 🎯 API Integration Points

### **Patient Management**
```sql
-- Create new patient
CALL create_patient(
    'أحمد', 'Ahmed', 'محمد', 'علي', 'Ali',
    '1985-03-15', 'MALE', 'O+', '198503150001',
    '+964-1-3000001', '+964-770-300-0001',
    'ahmed.ali@email.com', 'بغداد', 'الكرادة',
    'محمد علي', '+964-770-300-0002', 'أب',
    NULL, NULL, NULL
);
```

### **Invoice Creation**
```sql
-- Create invoice with items
CALL create_invoice(
    'patient_uuid', 'أحمد محمد علي',
    '[
        {"service_id": "service_uuid", "quantity": 1, "unit_price": 50000},
        {"service_id": "service_uuid2", "quantity": 2, "unit_price": 25000}
    ]',
    'insurance_uuid', 10, 'Regular consultation', 'user_id',
    NULL, NULL
);
```

### **Appointment Scheduling**
```sql
-- Create appointment
CALL create_appointment(
    'patient_uuid', 'أحمد محمد علي',
    'service_uuid', 'استشارة طبية عامة', 'GENERAL',
    'doctor_uuid', 'د. أحمد محمد علي',
    '2026-03-10', '10:00:00', 30,
    'Regular checkup', 'user_id',
    NULL, NULL
);
```

## 🔒 Security Features

### **Access Control Functions**
- `has_patient_access()` - Check patient data access
- `can_modify_invoice()` - Check invoice modification permissions

### **Data Integrity**
- Foreign key constraints
- Check constraints for enums
- Unique constraints for business keys
- Automatic timestamp updates

## 📈 Performance Optimizations

### **Indexes Created**
- Patient numbers, names, phone, national ID
- Invoice numbers, dates, patient IDs
- Appointment dates, doctor IDs
- Service codes and categories
- Insurance provider codes

### **Generated Columns**
- `balance_due` in invoices (calculated)
- `line_total` in invoice items (calculated)
- `return_amount` in return items (calculated)

## 🧪 Testing the Setup

### **Verify Schema**
```sql
-- Check table creation
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name LIKE '%patients%';

-- Check indexes
SELECT indexname FROM pg_indexes 
WHERE tablename = 'patients';
```

### **Verify Seed Data**
```sql
-- Check patients
SELECT COUNT(*) FROM patients; -- Should be 5

-- Check insurance providers
SELECT COUNT(*) FROM insurance_providers; -- Should be 5

-- Check medical services
SELECT COUNT(*) FROM medical_services; -- Should be 29

-- Check stakeholders
SELECT COUNT(*) FROM stakeholders; -- Should be 14
```

### **Test API Functions**
```sql
-- Test number generation
SELECT generate_patient_number();
SELECT generate_invoice_number();
SELECT generate_appointment_number();

-- Test views
SELECT * FROM v_patient_details LIMIT 1;
SELECT * FROM v_invoice_details LIMIT 1;
```

## 🔄 Maintenance Tasks

### **Regular Maintenance**
- Update insurance coverage limits annually
- Archive old invoices (7+ years)
- Update service prices quarterly
- Clean up completed todos weekly

### **Data Validation**
- Check for duplicate patient numbers
- Validate insurance policy dates
- Verify revenue sharing calculations
- Audit payment reconciliations

## 📝 Customization Guide

### **Adding New Services**
```sql
INSERT INTO medical_services (
    service_code, service_name_ar, service_name_en,
    service_category, base_price, currency
) VALUES ('SVC-XXX', 'خدمة جديدة', 'New Service', 'CATEGORY', 100000, 'IQD');
```

### **Adding New Stakeholders**
```sql
INSERT INTO stakeholders (
    stakeholder_code, name_ar, name_en, role, specialty_ar,
    mobile, email, department_id, default_share_type,
    default_share_percentage
) VALUES ('SH-XXX', 'اسم جديد', 'New Name', 'ROLE', 'SPECIALTY',
    '+964-770-XXX-XXXX', 'email@example.com', 'DEPT', 'PERCENTAGE', 20);
```

### **Updating Revenue Sharing**
```sql
INSERT INTO service_share_templates (
    service_id, stakeholder_id, share_type, share_percentage, display_order
) VALUES ('service_uuid', 'stakeholder_uuid', 'PERCENTAGE', 15, 1);
```

## ✅ Success Indicators

After running all migrations, you should have:

- ✅ **15 tables** created with proper relationships
- ✅ **50+ indexes** for performance optimization
- ✅ **4 data views** for common queries
- ✅ **6 number generation functions**
- ✅ **3 stored procedures** for common operations
- ✅ **5 insurance providers** with different types
- ✅ **14 healthcare providers** across all roles
- ✅ **29 medical services** in all categories
- ✅ **5 sample patients** with insurance coverage
- ✅ **Automatic triggers** for business logic
- ✅ **Security functions** for access control

## 🚀 Next Steps

1. **API Development**: Build REST API endpoints using the stored procedures
2. **Frontend Integration**: Connect React components to the database views
3. **Authentication**: Implement proper user authentication and authorization
4. **Reporting**: Create financial and operational reports
5. **Audit Trail**: Add comprehensive audit logging
6. **Backup Strategy**: Implement regular database backups
7. **Performance Monitoring**: Set up database performance monitoring

Your reception desk database is now fully configured and ready for production use! 🎉
