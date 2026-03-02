# 🔄 Migration from Supabase SDK to Direct PostgreSQL

## Overview
Complete guide to migrate from Supabase SDK to direct PostgreSQL connections using the `postgres` library.

---

## 📋 **Files Created**

### **1. Direct PostgreSQL API Routes**
- ✅ `src/app/api/hr/dashboard/metrics/route-direct.ts`
- ✅ `src/app/api/hr/employees/route-direct.ts`
- ✅ `src/app/api/health/route-direct.ts`

### **2. Database Client Library**
- ✅ `src/services/database-client.ts` - Direct PostgreSQL client with helper functions

---

## 🔧 **Migration Steps**

### **Step 1: Replace Supabase SDK Imports**

**Before (Supabase SDK):**
```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(supabaseUrl, supabaseKey);
const { data } = await supabase.from('employees').select('*');
```

**After (Direct PostgreSQL):**
```typescript
import postgres from 'postgres';
import { db } from '@/services/database-client';

const { data } = await db.select('employees');
```

### **Step 2: Update Environment Variables**

**Add to .env.local:**
```env
# Direct PostgreSQL Connection
TIBBNA_DATABASE_URL=postgresql://username:password@host:port/database
DATABASE_URL=postgresql://username:password@host:port/database

# Remove or comment out Supabase variables
# NEXT_PUBLIC_SUPABASE_URL=...
# SUPABASE_SERVICE_ROLE_KEY=...
```

### **Step 3: Replace API Routes**

**For each API route, replace:**
1. Supabase client initialization
2. Query syntax
3. Error handling
4. Response format

---

## 📊 **Query Conversion Examples**

### **SELECT Operations**

**Supabase SDK:**
```typescript
const { data } = await supabase
  .from('employees')
  .select('*')
  .eq('department_id', deptId)
  .order('created_at', { ascending: false })
  .limit(50);
```

**Direct PostgreSQL:**
```typescript
const data = await db.select(
  'employees',
  '*',
  { department_id: deptId },
  'created_at DESC',
  50
);
```

### **INSERT Operations**

**Supabase SDK:**
```typescript
const { data } = await supabase
  .from('employees')
  .insert(newEmployee);
```

**Direct PostgreSQL:**
```typescript
const data = await db.insert('employees', newEmployee);
```

### **UPDATE Operations**

**Supabase SDK:**
```typescript
const { data } = await supabase
  .from('employees')
  .update({ name: 'Updated Name' })
  .eq('id', employeeId);
```

**Direct PostgreSQL:**
```typescript
const data = await db.update(
  'employees',
  { name: 'Updated Name' },
  { id: employeeId }
);
```

### **DELETE Operations**

**Supabase SDK:**
```typescript
const { data } = await supabase
  .from('employees')
  .delete()
  .eq('id', employeeId);
```

**Direct PostgreSQL:**
```typescript
const data = await db.delete('employees', { id: employeeId });
```

---

## 🔍 **Complex Query Examples**

### **Dashboard Metrics**

**Supabase SDK:**
```typescript
const { count: totalActiveEmployees } = await supabase
  .from('employees')
  .select('*', { count: 'exact', head: true })
  .eq('employment_status', 'active');
```

**Direct PostgreSQL:**
```typescript
const [totalActiveEmployees] = await sql`
  SELECT COUNT(*) as count 
  FROM employees 
  WHERE employment_status = 'ACTIVE'
`;
```

### **Joins**

**Supabase SDK:**
```typescript
const { data } = await supabase
  .from('employees')
  .select(`
    *,
    departments(name, code)
  `)
  .eq('departments.active', true);
```

**Direct PostgreSQL:**
```typescript
const data = await sql`
  SELECT 
    e.*,
    d.name as department_name,
    d.code as department_code
  FROM employees e
  LEFT JOIN departments d ON e.department_id = d.id
  WHERE d.active = true
`;
```

---

## 🚀 **Performance Benefits**

### **1. Direct Database Access**
- ✅ No SDK overhead
- ✅ Faster query execution
- ✅ Better connection control

### **2. Connection Pooling**
```typescript
const sql = postgres(databaseUrl, {
  ssl: 'require',
  max: 10,              // Maximum connections
  idle_timeout: 20,     // Idle timeout
  connect_timeout: 10,   // Connection timeout
});
```

### **3. Type Safety**
```typescript
interface Employee {
  id: string;
  name: string;
  email: string;
}

const employees: Employee[] = await db.select('employees');
```

---

## 🔧 **Database Client Features**

### **Helper Functions**
```typescript
// Select with conditions
const data = await db.select('employees', '*', { active: true });

// Count records
const count = await db.count('employees', { department_id: 'dept-001' });

// Raw SQL queries
const results = await db.query(`
  SELECT * FROM employees 
  WHERE created_at > $1
`, [startDate]);

// Transactions
await db.transaction(async (sql) => {
  await sql`INSERT INTO employees ...`;
  await sql`UPDATE departments ...`;
});
```

---

## 📋 **Migration Checklist**

### **Environment Setup**
- [ ] Add `TIBBNA_DATABASE_URL` to .env.local
- [ ] Install `postgres` package if not present
- [ ] Test database connection

### **Code Migration**
- [ ] Replace Supabase imports with postgres imports
- [ ] Update query syntax
- [ ] Update error handling
- [ ] Test all API endpoints

### **Testing**
- [ ] Test database connection
- [ ] Test CRUD operations
- [ ] Test complex queries
- [ ] Test error handling

### **Deployment**
- [ ] Update production environment variables
- [ ] Test production database connection
- [ ] Monitor performance

---

## 🔄 **Rollback Plan**

If you need to rollback to Supabase:

1. **Restore Supabase environment variables:**
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

2. **Restore Supabase imports:**
```typescript
import { createClient } from '@supabase/supabase-js';
```

3. **Replace direct routes with original routes**
- Move `route.ts` files back
- Remove `-direct` suffixes

---

## 🎯 **Benefits of Direct PostgreSQL**

### **Performance**
- ⚡ Faster query execution
- ⚡ No SDK overhead
- ⚡ Better connection management

### **Control**
- 🔧 Complete SQL control
- 🔧 Custom connection pooling
- 🔧 Direct error handling

### **Flexibility**
- 🔄 Easy to switch databases
- 🔄 Raw SQL support
- 🔄 Custom queries

### **Cost**
- 💰 No Supabase subscription needed
- 💰 Direct database costs only
- 💰 Better resource utilization

---

## 🚨 **Considerations**

### **Lost Features**
- ❌ Supabase Authentication (need separate auth system)
- ❌ Real-time subscriptions (need WebSocket implementation)
- ❌ Row Level Security (need manual implementation)
- ❌ File Storage (need separate storage solution)

### **Required Implementations**
- 🔐 Authentication system
- 📡 Real-time updates (if needed)
- 🔒 Manual security policies
- 📁 File upload/download system

---

## 📚 **Next Steps**

1. **Test the direct routes** with `-direct` suffix
2. **Compare performance** between Supabase and direct
3. **Implement missing features** (auth, real-time, etc.)
4. **Gradual migration** of all routes
5. **Monitor and optimize** performance

---

**The direct PostgreSQL approach gives you complete control over your database operations with better performance and flexibility!** 🚀
