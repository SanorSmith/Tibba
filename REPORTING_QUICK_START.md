# 📊 HR Reporting System - Quick Start Guide

Get started with the HR Reporting System in 5 minutes.

---

## 🚀 Quick Setup

### **1. Dependencies Already Installed**

The following packages have been added to your project:
- ✅ `exceljs` - Excel file generation
- ✅ `pdfkit` - PDF file generation
- ✅ `node-cron` - Scheduled report automation
- ✅ `@types/node-cron` - TypeScript support
- ✅ `@types/pdfkit` - TypeScript support

### **2. Files Created**

```
src/
├── services/
│   ├── report-generator.ts       # 10 report types
│   ├── report-exporter.ts        # Excel & PDF export
│   └── report-scheduler.ts       # Automated scheduling
└── app/
    └── api/
        └── reports/
            └── [reportType]/
                └── route.ts      # API endpoint
```

---

## 📊 Available Reports

| # | Report Type | Description | Key Use Case |
|---|-------------|-------------|--------------|
| 1 | `daily-attendance` | Daily attendance summary | Track daily presence |
| 2 | `monthly-payroll` | Complete payroll breakdown | Monthly salary processing |
| 3 | `leave-balance` | Leave entitlements & usage | Monitor leave balances |
| 4 | `overtime-analysis` | Overtime hours by employee | Control overtime costs |
| 5 | `department-headcount` | Employee count by department | Workforce planning |
| 6 | `absence-report` | Employee absences tracking | Identify attendance issues |
| 7 | `late-arrivals` | Late arrival tracking | Punctuality monitoring |
| 8 | `employee-directory` | Complete employee contacts | Quick reference directory |
| 9 | `license-expiry` | Expiring licenses (90 days) | Compliance management |
| 10 | `payroll-cost` | Payroll costs by department | Budget analysis |

---

## 🎯 Usage Examples

### **Example 1: Download Today's Attendance (Excel)**

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:3000/api/reports/daily-attendance?format=excel" \
  -o attendance-today.xlsx
```

### **Example 2: Get Monthly Payroll (JSON)**

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:3000/api/reports/monthly-payroll?start_date=2024-03-01&end_date=2024-03-31&format=json"
```

### **Example 3: Export Leave Balances (PDF)**

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:3000/api/reports/leave-balance?format=pdf" \
  -o leave-balances.pdf
```

### **Example 4: Overtime Analysis (Excel)**

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:3000/api/reports/overtime-analysis?start_date=2024-03-01&end_date=2024-03-31&format=excel" \
  -o overtime-march.xlsx
```

---

## 💻 Programmatic Usage

### **Generate Report in Code**

```typescript
import { reportGenerator } from '@/services/report-generator';

// Generate daily attendance report
const report = await reportGenerator.generateReport('daily-attendance', {
  start_date: '2024-03-01'
});

console.log(report.title);
console.log(`Total employees: ${report.summary.total_employees}`);
console.log(`Present: ${report.summary.present}`);
console.log(`Data rows: ${report.data.length}`);
```

### **Export to Excel**

```typescript
import { reportGenerator } from '@/services/report-generator';
import { reportExporter } from '@/services/report-exporter';
import fs from 'fs';

// Generate report
const report = await reportGenerator.generateReport('monthly-payroll', {
  start_date: '2024-03-01',
  end_date: '2024-03-31'
});

// Export to Excel
const excelBuffer = await reportExporter.exportToExcel(report, 'monthly-payroll');

// Save to file
fs.writeFileSync('payroll-march-2024.xlsx', excelBuffer);
```

### **Export to PDF**

```typescript
import { reportGenerator } from '@/services/report-generator';
import { reportExporter } from '@/services/report-exporter';

const report = await reportGenerator.generateReport('leave-balance', {});
const pdfBuffer = await reportExporter.exportToPDF(report, 'leave-balance');

// Save or send via email
fs.writeFileSync('leave-balance.pdf', pdfBuffer);
```

---

## 📅 Scheduled Reports

### **Automatic Report Generation**

The system automatically generates these reports:

| Report | Schedule | Time | Recipients |
|--------|----------|------|------------|
| Daily Attendance | Every day | 9:00 AM | HR Team |
| Monthly Payroll | 1st of month | 8:00 AM | Finance & HR |
| Weekly Overtime | Every Monday | 9:00 AM | Managers |
| License Expiry | Every Monday | 10:00 AM | Compliance |

### **Enable Scheduled Reports**

Scheduled reports run automatically in production:

```typescript
// In production, schedules auto-start
// In development, manually start:
import { reportScheduler } from '@/services/report-scheduler';

reportScheduler.initializeSchedules();
```

### **Check Scheduler Status**

```typescript
import { reportScheduler } from '@/services/report-scheduler';

const status = reportScheduler.getStatus();
console.log(status);
// [
//   { name: 'daily-attendance', running: true },
//   { name: 'monthly-payroll', running: true },
//   { name: 'weekly-overtime', running: true },
//   { name: 'license-expiry', running: true }
// ]
```

---

## 🎨 Excel Features

### **Professional Styling**
- ✅ Blue header with white text
- ✅ Alternating row colors
- ✅ Auto-sized columns
- ✅ Currency formatting (SAR)
- ✅ SUM formulas for totals
- ✅ Bold totals row
- ✅ Cell borders

### **Example Excel Output**

```
┌─────────────────────────────────────────────────────────┐
│         Monthly Payroll Report - March 2024             │ ← Title (Blue)
│         Generated: 2024-03-01 10:00:00                  │
├─────────────────────────────────────────────────────────┤
│ Emp #  │ Name      │ Dept  │ Basic  │ Gross  │ Net    │ ← Header (Dark Blue)
├─────────────────────────────────────────────────────────┤
│ E-001  │ Ahmed Ali │ ER    │ 50,000 │ 75,000 │ 68,000 │ ← Data (White)
│ E-002  │ Sara Khan │ ICU   │ 55,000 │ 82,000 │ 74,000 │ ← Data (Light Gray)
│ E-003  │ Omar Saad │ Lab   │ 45,000 │ 67,000 │ 61,000 │ ← Data (White)
├─────────────────────────────────────────────────────────┤
│        │ TOTAL     │       │150,000 │224,000 │203,000 │ ← Totals (Gray, Bold)
└─────────────────────────────────────────────────────────┘
```

---

## 📄 PDF Features

### **Document Structure**
- ✅ Hospital header
- ✅ Report title
- ✅ Generation timestamp
- ✅ Data table (first 50 rows)
- ✅ Summary statistics
- ✅ Page numbers
- ✅ Footer

**Note**: PDF exports are limited to 50 rows. For complete data, use Excel format.

---

## ⚡ Performance & Caching

### **Report Caching**
Reports are cached for **5 minutes** to improve performance.

**Example**:
```
First request:  Fetches from DB → 2 seconds
Second request: Returns from cache → 50ms
After 5 min:    Cache expires, fetches fresh data
```

### **Clear Cache Manually**

```typescript
import { reportGenerator } from '@/services/report-generator';

reportGenerator.clearCache();
```

---

## 🔧 API Parameters

### **Common Parameters**

| Parameter | Type | Required | Description | Example |
|-----------|------|----------|-------------|---------|
| `format` | string | No | Output format | `json`, `excel`, `pdf` |
| `start_date` | string | Varies | Start date | `2024-03-01` |
| `end_date` | string | Varies | End date | `2024-03-31` |
| `department_id` | UUID | No | Filter by dept | `dept-uuid-123` |
| `employee_id` | UUID | No | Filter by emp | `emp-uuid-456` |

### **Report-Specific Parameters**

#### **Daily Attendance**
- `start_date` (default: today)

#### **Monthly Payroll**
- `start_date` (required)
- `end_date` (required)

#### **Overtime Analysis**
- `start_date` (required)
- `end_date` (required)

#### **Leave Balance**
- No parameters (shows all active employees)

#### **Department Headcount**
- No parameters (shows all departments)

---

## 🎯 Common Use Cases

### **Use Case 1: Daily HR Dashboard**

```bash
# Morning routine - download today's attendance
curl -H "Authorization: Bearer TOKEN" \
  "http://localhost:3000/api/reports/daily-attendance?format=excel" \
  -o attendance-$(date +%Y-%m-%d).xlsx
```

### **Use Case 2: Monthly Payroll Processing**

```bash
# End of month - generate payroll report
curl -H "Authorization: Bearer TOKEN" \
  "http://localhost:3000/api/reports/monthly-payroll?start_date=2024-03-01&end_date=2024-03-31&format=excel" \
  -o payroll-march-2024.xlsx
```

### **Use Case 3: Compliance Check**

```bash
# Weekly - check expiring licenses
curl -H "Authorization: Bearer TOKEN" \
  "http://localhost:3000/api/reports/license-expiry?format=excel" \
  -o licenses-expiring.xlsx
```

### **Use Case 4: Department Analysis**

```bash
# Monthly - analyze department costs
curl -H "Authorization: Bearer TOKEN" \
  "http://localhost:3000/api/reports/payroll-cost?start_date=2024-03-01&end_date=2024-03-31&format=excel" \
  -o dept-costs-march.xlsx
```

---

## 🐛 Troubleshooting

### **Issue: Report returns empty data**
**Solution**: Check date parameters and ensure data exists for that period.

```bash
# Check if attendance records exist
curl "http://localhost:3000/api/reports/daily-attendance?start_date=2024-03-01&format=json"
```

### **Issue: Excel file won't open**
**Solution**: Ensure you're saving the binary response correctly.

```bash
# Use -o flag to save binary data
curl -H "Authorization: Bearer TOKEN" \
  "http://localhost:3000/api/reports/daily-attendance?format=excel" \
  -o attendance.xlsx
```

### **Issue: Scheduled reports not running**
**Solution**: Check if scheduler is initialized.

```typescript
import { reportScheduler } from '@/services/report-scheduler';

// Check status
console.log(reportScheduler.getStatus());

// Restart if needed
reportScheduler.stopAll();
reportScheduler.initializeSchedules();
```

---

## 📚 Next Steps

1. **Test Each Report**
   - Try all 10 report types
   - Test JSON, Excel, and PDF formats
   - Verify data accuracy

2. **Set Up Email Delivery**
   - Configure SMTP settings
   - Add email recipients
   - Test scheduled email delivery

3. **Customize Reports**
   - Add company logo to PDFs
   - Customize Excel styling
   - Add additional data fields

4. **Monitor Performance**
   - Check cache hit rates
   - Monitor database query times
   - Optimize slow reports

5. **Create Custom Reports**
   - Add new report types
   - Implement custom filters
   - Build report templates

---

## 📞 Support

**Documentation**: See `docs/REPORTING_SYSTEM.md` for complete details

**API Endpoint**: `GET /api/reports/:reportType`

**Report Types**: 10 pre-built reports available

**Formats**: JSON, Excel (.xlsx), PDF

**Caching**: 5-minute TTL

**Scheduling**: 4 automated reports

---

## ✅ Summary

You now have a complete reporting system with:

✅ **10 critical HR reports** pulling live data  
✅ **Excel export** with professional styling  
✅ **PDF export** with hospital branding  
✅ **RESTful API** with authentication  
✅ **Report caching** for performance  
✅ **Scheduled reports** with email delivery  
✅ **Comprehensive documentation**  

**Start generating reports now!** 🎉

---

**Last Updated**: 2024-02-28  
**Version**: 1.0.0
