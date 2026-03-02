# 🚀 Vercel Deployment Guide

## ✅ Prerequisites Completed

- ✅ Code pushed to GitHub: `https://github.com/SanorSmith/Tibba.git`
- ✅ Environment variables protected in `.gitignore`
- ✅ Latest changes committed and pushed

---

## 📋 Deployment Steps

### **1. Deploy to Vercel**

#### **Option A: Using Vercel CLI (Recommended)**
```bash
# Install Vercel CLI globally
npm install -g vercel

# Login to Vercel
vercel login

# Deploy to production
vercel --prod
```

#### **Option B: Using Vercel Dashboard**
1. Go to [vercel.com](https://vercel.com)
2. Click "Add New Project"
3. Import your GitHub repository: `SanorSmith/Tibba`
4. Configure project settings:
   - **Framework Preset**: Next.js
   - **Root Directory**: `./`
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`

---

## 🔐 Environment Variables to Add on Vercel

You need to add these environment variables in the Vercel dashboard:

### **Required Environment Variables**

```bash
# Database Connection
OPENEHR_DATABASE_URL=your_neon_database_url_here

# Example format:
# OPENEHR_DATABASE_URL=postgresql://user:password@host.neon.tech/dbname?sslmode=require
```

### **How to Add Environment Variables on Vercel**

1. Go to your project on Vercel
2. Click **Settings** → **Environment Variables**
3. Add each variable:
   - **Key**: `OPENEHR_DATABASE_URL`
   - **Value**: Your Neon PostgreSQL connection string
   - **Environment**: Select all (Production, Preview, Development)
4. Click **Save**

---

## 📝 Important Notes

### **Environment Variable Security**
- ✅ `.env.local` is now in `.gitignore`
- ✅ Environment variables are NOT pushed to GitHub
- ✅ Add them manually in Vercel dashboard
- ⚠️ Never commit `.env.local` or `.env` files

### **Database Connection**
Your Neon PostgreSQL database URL should look like:
```
postgresql://username:password@ep-xxx-xxx.region.aws.neon.tech/dbname?sslmode=require
```

### **Build Configuration**
Vercel will automatically detect Next.js and use:
- **Build Command**: `npm run build` or `next build`
- **Output Directory**: `.next`
- **Install Command**: `npm install`

---

## 🎯 Deployment Checklist

- [x] Code pushed to GitHub
- [x] `.gitignore` updated with environment files
- [ ] Deploy to Vercel (CLI or Dashboard)
- [ ] Add `OPENEHR_DATABASE_URL` to Vercel environment variables
- [ ] Test deployment URL
- [ ] Verify database connection works
- [ ] Test specialty-department integration
- [ ] Test staff creation

---

## 🔍 Post-Deployment Testing

After deployment, test these features:

### **1. Database Connection**
- Visit: `https://your-app.vercel.app/api/departments`
- Should return list of departments

### **2. Specialties Integration**
- Navigate to: HR → Employees → Add Employee
- Select a department
- Verify specialties filter correctly

### **3. Staff Creation**
- Fill out employee form
- Select department and specialty
- Submit form
- Verify staff member created successfully

---

## 🐛 Troubleshooting

### **Build Fails**
- Check build logs in Vercel dashboard
- Verify all dependencies are in `package.json`
- Check for TypeScript errors

### **Database Connection Fails**
- Verify `OPENEHR_DATABASE_URL` is set correctly
- Check Neon database is accessible
- Verify SSL mode is included in connection string

### **Environment Variables Not Working**
- Redeploy after adding environment variables
- Check variable names match exactly
- Verify variables are set for correct environment

---

## 📊 Deployment URLs

After deployment, you'll get:
- **Production**: `https://your-app.vercel.app`
- **Preview**: `https://your-app-git-branch.vercel.app` (for each branch)

---

## 🎉 Success Indicators

Your deployment is successful when:
- ✅ Build completes without errors
- ✅ Application loads at Vercel URL
- ✅ Database connection works
- ✅ Departments and specialties load
- ✅ Staff creation works
- ✅ No environment variable errors

---

## 🔄 Continuous Deployment

Vercel automatically redeploys when you push to GitHub:
- **Main branch** → Production deployment
- **Other branches** → Preview deployments

To deploy updates:
```bash
git add .
git commit -m "your message"
git push origin main
```

Vercel will automatically build and deploy! 🚀
