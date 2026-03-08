# 🧪 How to Test the Payroll System

## 🎯 Testing Locations

### **Primary Testing Interface**
```
URL: /hr/payroll/new-page.tsx
```
This is the main payroll dashboard where you can:
- View current period statistics
- Calculate payroll with one click
- Review employee transactions
- Generate bank files
- Access reports

### **Employee Self-Service**
```
URL: /staff/payslips
URL: /staff/compensation
```

### **API Testing**
```
POST /api/hr/payroll/calculate
GET /api/hr/payroll/periods
GET /api/hr/payroll/transactions
```

---

## 🔧 Step-by-Step Testing

### **Step 1: Access the Payroll Dashboard**

1. **Open your browser**
2. **Navigate to**: `http://localhost:3000/hr/payroll/new-page.tsx`
3. **You should see**:
   - Payroll Management dashboard
   - KPI cards (Total Gross, Total Net, Deductions, Employees)
   - Period dropdown with "March 2026"
   - "Calculate Payroll" button

### **Step 2: Calculate Payroll (First Test)**

1. **Select Period**: Choose "March 2026" from dropdown
2. **Click "Calculate Payroll"** button
3. **Wait for processing** (5-10 seconds for 42 employees)
4. **Expected Results**:
   - Success message: "Payroll calculated for X employees"
   - Transaction table populated with 42 employee records
   - KPI cards updated with totals

### **Step 3: Review Results**

After calculation, you should see:
- **Total Gross**: Around $126,000 (42 employees × $3,000 average)
- **Total Net**: Around $114,000 (after 9% social security)
- **Employees**: 42
- **Transaction Table**: Complete employee breakdown

### **Step 4: Test Employee Views**

**Test Payslips:**
1. Navigate to `/staff/payslips`
2. **Expected**: Year-to-date summary and payslip details

**Test Compensation:**
1. Navigate to `/staff/compensation`
2. **Expected**: Salary breakdown and loan/advance tracking

---

## 🔍 API Testing (Advanced)

### **Test 1: Calculate Payroll via API**

```bash
curl -X POST http://localhost:3000/api/hr/payroll/calculate \
  -H "Content-Type: application/json" \
  -d '{"period_id": "your-period-uuid"}'
```

### **Test 2: Get Payroll Periods**

```bash
curl http://localhost:3000/api/hr/payroll/periods
```

### **Test 3: Get Transactions**

```bash
curl http://localhost:3000/api/hr/payroll/transactions?period_id=your-period-uuid
```

---

## 📊 Expected Test Results

### **Payroll Dashboard Should Show:**
- ✅ 4 KPI cards with real data
- ✅ Period dropdown with options
- ✅ "Calculate Payroll" button
- ✅ Employee transaction table (42 rows after calculation)
- ✅ Quick action links

### **Employee Views Should Show:**
- ✅ Payslips with YTD summary
- ✅ Compensation details with salary breakdown
- ✅ Loan/advance tracking (currently empty)

### **API Responses Should Show:**
- ✅ Success status
- ✅ Employee count (42)
- ✅ Total amounts
- ✅ Transaction details

---

## 🚨 Troubleshooting

### **If Dashboard Doesn't Load:**
1. Check if server is running: `npm run dev`
2. Verify URL path: `/hr/payroll/new-page.tsx`
3. Check browser console for errors

### **If Calculation Fails:**
1. Ensure database migrations were applied
2. Check if employee compensation records exist
3. Verify attendance data is available

### **If No Data Shows:**
1. Run: `node -e "require('dotenv').config(); const {Pool} = require('pg'); const pool = new Pool({connectionString: process.env.DATABASE_URL}); pool.query('SELECT COUNT(*) FROM employee_compensation').then(r => console.log('Compensation records:', r.rows[0].count)).finally(() => pool.end())"`
2. Should show: "Compensation records: 42"

---

## 🎯 Quick Test Checklist

- [ ] Dashboard loads at `/hr/payroll/new-page.tsx`
- [ ] Period dropdown shows "March 2026"
- [ ] "Calculate Payroll" button is clickable
- [ ] Calculation processes successfully
- [ ] Transaction table shows 42 employees
- [ ] KPI cards update with totals
- [ ] Employee payslips page loads
- [ ] Employee compensation page loads
- [ ] API endpoints respond correctly

---

## 📞 Support

### **Common Issues:**
1. **Page not found**: Check URL path carefully
2. **No data**: Verify database connection
3. **Calculation fails**: Check employee compensation records
4. **API errors**: Check server logs

### **Debug Commands:**
```bash
# Check database connection
node -e "require('dotenv').config(); const {Pool} = require('pg'); const pool = new Pool({connectionString: process.env.DATABASE_URL}); pool.query('SELECT NOW()').then(r => console.log('Database OK:', r.rows[0].now)).catch(e => console.error('DB Error:', e.message)).finally(() => pool.end())"

# Check employee records
node -e "require('dotenv').config(); const {Pool} = require('pg'); const pool = new Pool({connectionString: process.env.DATABASE_URL}); pool.query('SELECT COUNT(*) FROM employee_compensation').then(r => console.log('Employees:', r.rows[0].count)).finally(() => pool.end())"

# Check payroll periods
node -e "require('dotenv').config(); const {Pool} = require('pg'); const pool = new Pool({connectionString: process.env.DATABASE_URL}); pool.query('SELECT period_name, status FROM payroll_periods').then(r => console.log('Periods:', r.rows)).finally(() => pool.end())"
```

---

**Ready to test! Start with the dashboard at `/hr/payroll/new-page.tsx`** 🚀
