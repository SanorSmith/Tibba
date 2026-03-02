# 🚀 Deployment Instructions

## ✅ Step 1: Dependencies Installed
```bash
npm install
```
**Status**: ✅ COMPLETED

---

## 📋 Step 2: Database Migrations

### Option A: Using Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Run each migration file in order:

#### Migration 1: Shift Management
Copy and paste contents of:
```
supabase/migrations/003_shift_management_simple.sql
```
Click **Run** in SQL Editor

#### Migration 2: Alerts & Workflows
Copy and paste contents of:
```
supabase/migrations/004_alerts_workflows_fixed.sql
```
Click **Run** in SQL Editor

#### Migration 3: Performance Indexes
Copy and paste contents of:
```
supabase/migrations/005_performance_indexes.sql
```
Click **Run** in SQL Editor

### Option B: Using psql Command Line

If you have direct database access:

```bash
# Set your database connection string
$env:DATABASE_URL="postgresql://postgres:[password]@[host]:[port]/postgres"

# Run migrations
psql $env:DATABASE_URL -f supabase/migrations/003_shift_management_simple.sql
psql $env:DATABASE_URL -f supabase/migrations/004_alerts_workflows_fixed.sql
psql $env:DATABASE_URL -f supabase/migrations/005_performance_indexes.sql
```

---

## 🧪 Step 3: Run Tests

```bash
npm test
```

Expected output:
```
Test Suites: 3 passed, 3 total
Tests:       33 passed, 33 total
Time:        ~1.2s
```

---

## 🚀 Step 4: Start Development Server

```bash
npm run dev
```

Server will start at: `http://localhost:3000`

---

## 🏥 Step 5: Check System Health

Open browser or use curl:
```bash
curl http://localhost:3000/api/health
```

Expected response:
```json
{
  "status": "healthy",
  "checks": [
    { "name": "Database Connection", "status": "healthy" },
    { "name": "Table: employees", "status": "healthy" },
    { "name": "Recent Activity", "status": "healthy" },
    { "name": "System Resources", "status": "healthy" }
  ]
}
```

---

## 📊 Step 6: View Dashboard

Open in browser:
```
http://localhost:3000/hr/dashboard
```

You should see:
- Total active employees
- Today's attendance rate
- Pending leave requests
- Upcoming license expiries
- Current month payroll status
- Active alerts
- Charts and visualizations

---

## ⚠️ Important Notes

### Database Connection
Make sure your `.env.local` file has:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

### Migration Files Location
All migration files are in:
```
supabase/migrations/
├── 003_shift_management_simple.sql
├── 004_alerts_workflows_fixed.sql
└── 005_performance_indexes.sql
```

### Troubleshooting

**If migrations fail:**
1. Check database connection in `.env.local`
2. Verify you have admin access to database
3. Check if tables already exist (migrations use `IF NOT EXISTS`)

**If tests fail:**
1. Run `npm test -- --clearCache`
2. Check if all dependencies installed
3. Verify Jest configuration

**If dev server won't start:**
1. Check if port 3000 is available
2. Verify environment variables
3. Check for TypeScript errors: `npm run build`

---

## 🎯 Quick Verification Checklist

- [ ] Dependencies installed (`npm install`)
- [ ] Database migrations run (all 3 files)
- [ ] Tests passing (33/33)
- [ ] Dev server running (`npm run dev`)
- [ ] Health check returns "healthy"
- [ ] Dashboard loads with data

---

## 📚 Next Steps

Once everything is running:

1. **Generate Test Data** (optional):
   ```bash
   node scripts/generate-test-data.ts
   ```

2. **Validate Data Integrity**:
   ```bash
   node scripts/validate-data.ts
   ```

3. **Explore the System**:
   - Dashboard: `/hr/dashboard`
   - Employees: `/hr/employees`
   - Attendance: `/hr/attendance`
   - Leave Management: `/hr/leaves`
   - Payroll: `/hr/payroll`
   - Reports: `/hr/reports`

---

**System Status**: Ready for deployment after migrations complete! 🎉
