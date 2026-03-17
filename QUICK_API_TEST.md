# 🧪 Quick API Test

## **Test the API Routes Directly**

Open your browser console and run these commands:

### **1. Test List API (Should Work)**
```javascript
fetch('/api/hr/performance/reviews')
  .then(r => r.json())
  .then(console.log)
```

### **2. Test Individual Review (Currently Broken)**
```javascript
fetch('/api/hr/performance/reviews/9c77870b-0706-410c-b888-ee01fe9b6032')
  .then(r => r.json())
  .then(console.log)
```

### **3. Test Simple Test Route (Just Created)**
```javascript
fetch('/api/hr/performance/reviews/test-id/test')
  .then(r => r.json())
  .then(console.log)
```

## **Expected Results:**

✅ **List API should return:**
```json
{
  "success": true,
  "data": [...],
  "count": X
}
```

❌ **Individual Review currently returns:**
```
404 Not Found
```

🧪 **Test Route should return:**
```json
{
  "success": true,
  "message": "Test route working",
  "id": "test-id"
}
```

## **If Test Route Works:**
- The routing system is working
- The issue is with the main route.ts file
- Could be a syntax error or import issue

## **If Test Route Fails:**
- The routing system itself is broken
- Next.js not recognizing the [id] folder
- Need to restart Next.js server

**Run these tests in the browser console and let me know the results!**
