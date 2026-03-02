# 💰 Payslip & Bank File Generation System

Complete documentation for automated payslip generation and bank transfer file creation.

---

## 📋 Overview

The Payslip & Bank File Generation System automates the creation of employee payslips (PDF) and bank transfer files for payment processing in multiple formats.

**Key Features**:
- ✅ Professional PDF payslips with hospital branding
- ✅ Bulk payslip generation for entire periods
- ✅ Bank transfer files in 3 formats (CSV, XML, Fixed-width)
- ✅ Automatic validation before file generation
- ✅ Summary reports and analytics
- ✅ Secure account number masking
- ✅ RESTful API endpoints

---

## 📄 Payslip Generation

### **Features**

#### **Professional PDF Payslips**
- Hospital header with name and contact info
- Employee information (number, name, department, position)
- Pay period and payment date
- Detailed earnings breakdown
- Detailed deductions breakdown
- Large, bold net salary display
- Bank transfer details (masked account)
- Computer-generated footer (no signature required)

#### **Payslip Structure**

```
┌─────────────────────────────────────────────────────┐
│              Tibbna Hospital                        │
│          HR Management System                       │
│         Riyadh, Saudi Arabia                        │
│    Tel: +966 11 234 5678 | hr@tibbna.sa            │
├─────────────────────────────────────────────────────┤
│                                                      │
│              SALARY SLIP                            │
│              March 2024                             │
│                                                      │
├─────────────────────────────────────────────────────┤
│ Employee Number: EMP-2024-001  Department: Emergency│
│ Employee Name: Ahmed Ali        Position: Nurse     │
│                                 Payment: Mar 1, 2024│
├─────────────────────────────────────────────────────┤
│ EARNINGS                                            │
│ ─────────────────────────────────────────────────  │
│ Basic Salary                        SAR 50,000.00   │
│ Allowances                          SAR 20,000.00   │
│ Overtime Pay                        SAR  2,250.00   │
│ Bonus                               SAR  1,000.00   │
│ ─────────────────────────────────────────────────  │
│ GROSS SALARY                        SAR 73,250.00   │
├─────────────────────────────────────────────────────┤
│ DEDUCTIONS                                          │
│ ─────────────────────────────────────────────────  │
│ Social Security (9%)                SAR  6,592.50   │
│ Health Insurance                    SAR    500.00   │
│ Loan Deduction                      SAR  1,000.00   │
│ ─────────────────────────────────────────────────  │
│ TOTAL DEDUCTIONS                    SAR  8,092.50   │
├─────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────┐│
│ │ NET SALARY (SAR)                                ││
│ │                              SAR 65,157.50      ││
│ └─────────────────────────────────────────────────┘│
├─────────────────────────────────────────────────────┤
│ Payment Method: Bank Transfer                       │
│ Bank: Al Rajhi Bank                                 │
│ Account: **********1234                             │
├─────────────────────────────────────────────────────┤
│ This is a computer-generated payslip and does not   │
│ require a signature.                                │
│ Generated on: 2024-03-01 10:00:00                   │
└─────────────────────────────────────────────────────┘
```

---

## 🔧 API Endpoints

### **1. Generate Single Payslip**

**Endpoint**: `GET /api/payroll/payslips/:payrollId`

**Description**: Generate PDF payslip for a single payroll record.

**Authentication**: Required (Bearer token)

**Parameters**:
- `payrollId` (path parameter): UUID of payroll transaction

**Response**: PDF file download

**Example**:
```bash
curl -H "Authorization: Bearer TOKEN" \
  "http://localhost:3000/api/payroll/payslips/payroll-uuid-123" \
  -o payslip.pdf
```

**Response Headers**:
```
Content-Type: application/pdf
Content-Disposition: attachment; filename="payslip-payroll-uuid-123.pdf"
```

---

### **2. Generate Bulk Payslips**

**Endpoint**: `POST /api/payroll/payslips/bulk`

**Description**: Generate payslips for all employees in a period.

**Authentication**: Required (hr_manager, admin)

**Request Body**:
```json
{
  "period_id": "period-uuid-123",
  "delivery_method": "download"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "period_id": "period-uuid-123",
    "total_payslips": 75,
    "employees": [
      {
        "employee_id": "emp-uuid-1",
        "employee_number": "EMP-2024-001",
        "employee_name": "Ahmed Ali",
        "pdf_size": 45678
      }
    ],
    "message": "Generated 75 payslips successfully"
  }
}
```

**Example**:
```bash
curl -X POST \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"period_id":"period-uuid-123"}' \
  http://localhost:3000/api/payroll/payslips/bulk
```

---

## 🏦 Bank File Generation

### **Supported Formats**

#### **1. CSV Format**
Standard comma-separated values file for easy import.

**Structure**:
```csv
Employee Number,Employee Name,Bank Name,Bank Code,Account Number,IBAN,Amount,Payment Reference,Payment Date
EMP-2024-001,"Ahmed Ali","Al Rajhi Bank",80,1234567890,SA0380000000608010167519,65157.50,PAY-EMP-2024-001-abc123,2024-03-03

TOTAL RECORDS,75
TOTAL AMOUNT,4886812.50
GENERATION DATE,2024-03-01
COMPANY NAME,"Tibbna Hospital"
COMPANY ACCOUNT,SA0380000000608010167519
```

**Use Case**: General bank imports, Excel analysis

---

#### **2. XML Format (ISO 20022 / SEPA)**
International standard for payment instructions.

**Structure**:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pain.001.001.03">
  <CstmrCdtTrfInitn>
    <GrpHdr>
      <MsgId>MSG-1709280000000</MsgId>
      <CreDtTm>2024-03-01T10:00:00Z</CreDtTm>
      <NbOfTxs>75</NbOfTxs>
      <CtrlSum>4886812.50</CtrlSum>
      <InitgPty>
        <Nm>Tibbna Hospital</Nm>
      </InitgPty>
    </GrpHdr>
    <PmtInf>
      <PmtInfId>PMT-1709280000000</PmtInfId>
      <PmtMtd>TRF</PmtMtd>
      <ReqdExctnDt>2024-03-03</ReqdExctnDt>
      <Dbtr>
        <Nm>Tibbna Hospital</Nm>
      </Dbtr>
      <DbtrAcct>
        <Id>
          <IBAN>SA0380000000608010167519</IBAN>
        </Id>
      </DbtrAcct>
      <CdtTrfTxInf>
        <PmtId>
          <EndToEndId>PAY-EMP-2024-001-abc123</EndToEndId>
        </PmtId>
        <Amt>
          <InstdAmt Ccy="SAR">65157.50</InstdAmt>
        </Amt>
        <Cdtr>
          <Nm>Ahmed Ali</Nm>
        </Cdtr>
        <CdtrAcct>
          <Id>
            <IBAN>SA0380000000608010167519</IBAN>
          </Id>
        </CdtrAcct>
        <RmtInf>
          <Ustrd>Salary Payment - EMP-2024-001</Ustrd>
        </RmtInf>
      </CdtTrfTxInf>
    </PmtInf>
  </CstmrCdtTrfInitn>
</Document>
```

**Use Case**: International banks, SEPA transfers, automated processing

---

#### **3. Fixed-Width Format**
Legacy format with fixed column widths for older banking systems.

**Structure**:
```
1Tibbna Hospital                   SA0380000000608010167519      20240301202403030000754886812500000000000000000000000000000000000000000000000000000000
200001EMP-2024-001      Ahmed Ali                          80        1234567890                        0000006515750PAY-EMP-2024-001-abc123       SAL                                   
200002EMP-2024-002      Sara Khan                          80        9876543210                        0000007234200PAY-EMP-2024-002-def456       SAL                                   
90000750000488681250000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
```

**Record Types**:
- **Type 1 (Header)**: Company info, dates, totals
- **Type 2 (Detail)**: Individual employee payments
- **Type 9 (Trailer)**: Summary totals

**Field Specifications**:

| Field | Position | Length | Format | Description |
|-------|----------|--------|--------|-------------|
| Record Type | 1 | 1 | N | 1=Header, 2=Detail, 9=Trailer |
| Company Name | 2-36 | 35 | AN | Right-padded with spaces |
| Company Account | 37-70 | 34 | AN | IBAN or account number |
| Generation Date | 71-78 | 8 | N | YYYYMMDD |
| Payment Date | 79-86 | 8 | N | YYYYMMDD |
| Total Records | 87-92 | 6 | N | Zero-padded |
| Total Amount | 93-107 | 15 | N | In fils (amount × 100) |

**Use Case**: Legacy banking systems, mainframe imports

---

## 🔧 Bank File API Endpoints

### **1. Generate Bank Transfer File**

**Endpoint**: `POST /api/payroll/bank-files`

**Description**: Generate bank transfer file in specified format.

**Authentication**: Required (hr_manager, admin)

**Request Body**:
```json
{
  "period_id": "period-uuid-123",
  "format": "csv",
  "validate_only": false
}
```

**Parameters**:
- `period_id` (required): UUID of payroll period
- `format` (optional): `csv`, `xml`, or `fixed-width` (default: `csv`)
- `validate_only` (optional): If true, only validate without generating file

**Response (File)**:
```
Content-Type: text/csv (or application/xml, text/plain)
Content-Disposition: attachment; filename="bank_transfer_period-uuid-123_1709280000.csv"
```

**Response (Validation Only)**:
```json
{
  "success": true,
  "data": {
    "valid": true,
    "errors": [],
    "warnings": [
      "Ahmed Ali: Net salary is zero or negative"
    ]
  }
}
```

**Example**:
```bash
# Generate CSV file
curl -X POST \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"period_id":"period-uuid-123","format":"csv"}' \
  http://localhost:3000/api/payroll/bank-files \
  -o bank_transfer.csv

# Validate only
curl -X POST \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"period_id":"period-uuid-123","validate_only":true}' \
  http://localhost:3000/api/payroll/bank-files
```

---

### **2. Get Bank File Summary**

**Endpoint**: `GET /api/payroll/bank-files?period_id=xxx`

**Description**: Get summary report for bank file.

**Authentication**: Required (hr_manager, admin)

**Query Parameters**:
- `period_id` (required): UUID of payroll period

**Response**:
```json
{
  "success": true,
  "data": {
    "total_employees": 75,
    "total_amount": 4886812.50,
    "by_bank": [
      {
        "bank_name": "Al Rajhi Bank",
        "count": 45,
        "amount": 2930487.50
      },
      {
        "bank_name": "Saudi National Bank",
        "count": 30,
        "amount": 1956325.00
      }
    ],
    "payment_date": "2024-03-03"
  }
}
```

**Example**:
```bash
curl -H "Authorization: Bearer TOKEN" \
  "http://localhost:3000/api/payroll/bank-files?period_id=period-uuid-123"
```

---

## 💻 Programmatic Usage

### **Generate Single Payslip**

```typescript
import { payslipGenerator } from '@/services/payslip-generator';
import fs from 'fs';

// Generate payslip
const pdfBuffer = await payslipGenerator.generatePayslip('payroll-uuid-123');

// Save to file
fs.writeFileSync('payslip.pdf', pdfBuffer);
```

### **Generate Bulk Payslips**

```typescript
import { payslipGenerator } from '@/services/payslip-generator';

// Generate all payslips for a period
const payslips = await payslipGenerator.generateBulkPayslips('period-uuid-123');

// Save each payslip
payslips.forEach((payslip) => {
  fs.writeFileSync(
    `payslips/${payslip.employee_number}.pdf`,
    payslip.pdf_buffer
  );
});

console.log(`Generated ${payslips.length} payslips`);
```

### **Generate Bank Transfer File**

```typescript
import { bankFileGenerator } from '@/services/bank-file-generator';

// Validate first
const validation = await bankFileGenerator.validateBankFile('period-uuid-123');

if (!validation.valid) {
  console.error('Validation errors:', validation.errors);
  return;
}

// Generate CSV file
const { content, filename, metadata } = await bankFileGenerator.generateBankTransferFile(
  'period-uuid-123',
  'csv'
);

// Save file
fs.writeFileSync(filename, content);

console.log(`Generated bank file: ${filename}`);
console.log(`Total employees: ${metadata.total_records}`);
console.log(`Total amount: SAR ${metadata.total_amount.toFixed(2)}`);
```

### **Generate XML Bank File**

```typescript
// Generate ISO 20022 XML file
const { content, filename } = await bankFileGenerator.generateBankTransferFile(
  'period-uuid-123',
  'xml'
);

fs.writeFileSync(filename, content);
```

### **Get Bank File Summary**

```typescript
const summary = await bankFileGenerator.generateSummaryReport('period-uuid-123');

console.log(`Total Employees: ${summary.total_employees}`);
console.log(`Total Amount: SAR ${summary.total_amount.toFixed(2)}`);
console.log(`Payment Date: ${summary.payment_date}`);

summary.by_bank.forEach((bank) => {
  console.log(`${bank.bank_name}: ${bank.count} employees, SAR ${bank.amount.toFixed(2)}`);
});
```

---

## ✅ Validation Rules

### **Bank File Validation**

Before generating a bank file, the system validates:

1. **Employee Bank Details**
   - ✅ Account number exists
   - ✅ Bank name exists
   - ✅ IBAN or account number present
   - ⚠️ Net salary > 0

2. **Payroll Status**
   - ✅ Payroll status = 'approved'
   - ✅ Period exists
   - ✅ At least one employee with bank details

3. **Data Integrity**
   - ✅ No duplicate employee records
   - ✅ Valid amount formats
   - ✅ Valid date formats

**Validation Response**:
```json
{
  "valid": false,
  "errors": [
    "Ahmed Ali: Missing account number",
    "Sara Khan: Missing bank name"
  ],
  "warnings": [
    "Omar Saad: Net salary is zero"
  ]
}
```

---

## 🔐 Security Features

### **Account Number Masking**
Employee account numbers are masked in payslips for security:
```
Original: 1234567890
Masked:   ******7890
```

### **Access Control**
- **Payslip Generation**: Authenticated users
- **Bulk Payslips**: hr_manager, admin
- **Bank Files**: hr_manager, admin

### **Audit Logging**
All operations are logged:
- User who generated the file
- Timestamp
- Period ID
- Number of records
- Total amount

---

## 📊 Use Cases

### **Use Case 1: Monthly Payroll Processing**

```bash
# 1. Generate payroll for the month
POST /api/hr/payroll/calculate
{
  "period_id": "march-2024"
}

# 2. Generate bulk payslips
POST /api/payroll/payslips/bulk
{
  "period_id": "march-2024"
}

# 3. Validate bank file
POST /api/payroll/bank-files
{
  "period_id": "march-2024",
  "validate_only": true
}

# 4. Generate bank transfer file
POST /api/payroll/bank-files
{
  "period_id": "march-2024",
  "format": "csv"
}

# 5. Upload to bank portal
```

### **Use Case 2: Individual Payslip Request**

```bash
# Employee requests their payslip
GET /api/payroll/payslips/payroll-uuid-123
```

### **Use Case 3: Bank File Summary**

```bash
# Finance team reviews summary before generating file
GET /api/payroll/bank-files?period_id=march-2024

# Response shows:
# - Total employees: 75
# - Total amount: SAR 4,886,812.50
# - Breakdown by bank
```

---

## 📁 File Structure

```
src/
├── services/
│   ├── payslip-generator.ts       # PDF payslip generation
│   └── bank-file-generator.ts     # Bank file generation
└── app/
    └── api/
        └── payroll/
            ├── payslips/
            │   ├── [payrollId]/route.ts    # Single payslip
            │   └── bulk/route.ts           # Bulk payslips
            └── bank-files/
                └── route.ts                # Bank file generation

docs/
└── PAYSLIP_AND_BANK_FILES.md
```

---

## 🚀 Future Enhancements

### **Planned Features**
- [ ] Email delivery for payslips
- [ ] ZIP file download for bulk payslips
- [ ] Multi-language payslips (Arabic RTL)
- [ ] Custom payslip templates
- [ ] Digital signatures
- [ ] Payslip encryption
- [ ] Bank file encryption
- [ ] Direct bank API integration
- [ ] Payment status tracking
- [ ] Failed payment handling
- [ ] Payslip portal for employees
- [ ] SMS notifications
- [ ] QR code for verification

---

## 🐛 Troubleshooting

### **Payslip Generation Fails**
**Issue**: PDF generation error

**Solutions**:
1. Check payroll record exists
2. Verify employee details are complete
3. Check PDFKit installation
4. Review server logs

### **Bank File Validation Fails**
**Issue**: Missing bank details

**Solutions**:
1. Update employee bank information
2. Ensure all approved payroll has bank details
3. Check IBAN format
4. Verify account numbers

### **Empty Bank File**
**Issue**: No employees in bank file

**Solutions**:
1. Ensure payroll status is 'approved'
2. Check employees have bank details
3. Verify period_id is correct
4. Check net_salary > 0

---

## 📞 Support

**Documentation**: See this file for complete details

**API Endpoints**:
- `GET /api/payroll/payslips/:payrollId`
- `POST /api/payroll/payslips/bulk`
- `POST /api/payroll/bank-files`
- `GET /api/payroll/bank-files`

**Formats Supported**:
- Payslips: PDF
- Bank Files: CSV, XML (ISO 20022), Fixed-width

---

**Last Updated**: 2024-02-28  
**Version**: 1.0.0  
**Status**: ✅ Production Ready
