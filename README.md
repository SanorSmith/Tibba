# Tibbna-EHR Hospital Management System

A comprehensive hospital management system with 6 interconnected modules plus authentication, built with Next.js 14, TypeScript, and Tailwind CSS.

## 🎯 Features

### ✅ Completed Modules

1. **Authentication System**
   - Login page with demo credentials
   - Zustand-based state management
   - Protected routes with middleware
   - Multiple user roles (Admin, Doctor, Nurse, Billing)

2. **Dashboard**
   - Key metrics overview
   - Today's activity tracking
   - Facilities management
   - Quick action cards

3. **Services Module**
   - 15+ pre-configured hospital services
   - Service catalog with pricing tiers
   - Category filtering and search
   - Detailed service information pages

4. **Inventory Management** (Stub)
   - Stock tracking overview
   - Low stock alerts
   - Expiring items monitoring

5. **Finance & Accounting** (Stub)
   - Revenue and expense tracking
   - Financial metrics dashboard

6. **Insurance Management** (Stub)
   - Claims tracking
   - Provider management
   - Coverage information

7. **Human Resources** (Stub)
   - Employee management
   - Attendance tracking
   - Leave management

8. **Billing & Invoicing** (Stub)
   - Invoice generation
   - Payment tracking
   - Revenue reports

9. **Existing System Integration** (Stubs)
   - Patients
   - Appointments
   - Staff/Contacts
   - Laboratories
   - Pharmacies
   - Departments

## 🎨 Design System

The application matches your existing Tibbna-EHR design with:

- **Primary Color**: #5B7FE8 (Blue)
- **Background**: #F5F5F5 (Light Gray)
- **Success**: #10B981 (Green)
- **Warning**: #F59E0B (Orange)
- **Error**: #EF4444 (Red)
- **Typography**: Inter font family

## 🚀 Getting Started

### Prerequisites

- **Node.js**: Version 20.9.0 or higher (REQUIRED)
- **npm**: Version 9.0.0 or higher

### Installation

1. **Check Node.js version:**
   ```bash
   node --version
   ```
   If you have Node.js 18.x, please upgrade to Node.js 20.x or higher.

2. **Install dependencies:**
   ```bash
   cd tibbna-hospital
   npm install
   ```

3. **Run development server:**
   ```bash
   npm run dev
   ```

4. **Open your browser:**
   Navigate to [http://localhost:3000](http://localhost:3000)

### Demo Credentials

Use these credentials to log in:

| Role | Username | Password |
|------|----------|----------|
| Administrator | `demo` | `demo123` |
| Administrator | `admin` | `admin123` |
| Doctor | `doctor` | `doctor123` |
| Nurse | `nurse` | `nurse123` |
| Billing Staff | `billing` | `billing123` |

## 📁 Project Structure

```
tibbna-hospital/
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   └── login/           # Login page
│   │   ├── (dashboard)/
│   │   │   ├── dashboard/       # Main dashboard
│   │   │   ├── services/        # Services module
│   │   │   ├── inventory/       # Inventory module
│   │   │   ├── finance/         # Finance module
│   │   │   ├── insurance/       # Insurance module
│   │   │   ├── hr/              # HR module
│   │   │   ├── billing/         # Billing module
│   │   │   ├── patients/        # Patients (stub)
│   │   │   ├── appointments/    # Appointments (stub)
│   │   │   ├── staff/           # Staff (stub)
│   │   │   ├── laboratories/    # Laboratories (stub)
│   │   │   ├── pharmacies/      # Pharmacies (stub)
│   │   │   └── departments/     # Departments (stub)
│   │   ├── layout.tsx           # Root layout
│   │   ├── page.tsx             # Home page (redirects)
│   │   └── globals.css          # Global styles
│   ├── components/
│   │   ├── layout/
│   │   │   ├── navbar.tsx       # Top navigation
│   │   │   ├── sidebar.tsx      # Side navigation
│   │   │   └── user-menu.tsx    # User dropdown
│   │   └── ui/                  # shadcn/ui components
│   ├── data/
│   │   ├── users.json           # Demo users
│   │   ├── services.json        # Services data
│   │   └── dashboard.json       # Dashboard metrics
│   ├── lib/
│   │   ├── utils.ts             # Utility functions
│   │   └── constants.ts         # App constants
│   ├── store/
│   │   └── auth-store.ts        # Zustand auth store
│   ├── types/
│   │   ├── auth.ts              # Auth types
│   │   └── service.ts           # Service types
│   └── middleware.ts            # Route protection
├── public/                      # Static assets
├── tailwind.config.ts           # Tailwind configuration
├── tsconfig.json                # TypeScript configuration
├── package.json                 # Dependencies
└── README.md                    # This file
```

## 🔐 Authentication Flow

1. User visits any protected route
2. Middleware checks authentication status
3. Unauthenticated users → redirected to `/login`
4. User enters credentials
5. Zustand store validates against mock data
6. Successful login → redirected to `/dashboard`
7. User info stored in localStorage (persisted)

## 🎯 Module Details

### Services Module (Fully Functional)

**Features:**
- Browse 15 pre-configured hospital services
- Filter by category (Consultation, Diagnostics, Laboratory, etc.)
- Search by name or specialty
- View detailed service information
- See pricing for Insurance, Self-Pay, and Government
- View required equipment, supplies, and staff

**Mock Data Includes:**
- General Consultation
- X-Ray Chest
- Blood Test - Complete Panel
- Cardiology Consultation
- MRI Scan - Brain
- Physical Therapy Session
- Ultrasound - Abdominal
- Dental Cleaning
- Emergency Room Visit
- Vaccination - Flu Shot
- CT Scan - Abdomen
- Pediatric Checkup
- Surgical Procedure - Minor
- Dermatology Consultation
- Ophthalmology Exam

### Other Modules (Stubs)

All other modules have placeholder pages with:
- Module-specific dashboards
- Key metrics cards
- Coming soon messages
- Proper navigation integration

## 🛠️ Technology Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui (Radix UI)
- **State Management**: Zustand
- **Icons**: Lucide React
- **Forms**: React Hook Form + Zod (ready to use)
- **Charts**: Recharts (ready to use)

## 📝 Development Notes

### No Backend Required

This is a **frontend-only demo** application:
- ✅ All data from JSON files
- ✅ Client-side authentication
- ✅ LocalStorage persistence
- ❌ No database
- ❌ No API calls
- ❌ No Supabase

### Mock Data Location

All mock data is in `src/data/`:
- `users.json` - Demo user accounts
- `services.json` - Hospital services
- `dashboard.json` - Dashboard metrics

### Adding New Services

Edit `src/data/services.json` and add a new service object:

```json
{
  "id": "SVC016",
  "name": "Your Service Name",
  "category": "Consultation",
  "specialty": "Your Specialty",
  "duration": 30,
  "price": {
    "insurance": 150,
    "selfPay": 200,
    "government": 100
  },
  "cptCode": "99213",
  "icd10Code": "Z00.00",
  "description": "Service description",
  "status": "active",
  "requiresAppointment": true,
  "equipmentNeeded": [],
  "suppliesNeeded": [],
  "staffRequired": {
    "doctor": 1
  }
}
```

## 🎨 Customization

### Colors

Edit `tailwind.config.ts` to change the color scheme:

```typescript
colors: {
  primary: '#5B7FE8',  // Main brand color
  success: '#10B981',  // Success states
  warning: '#F59E0B',  // Warning states
  error: '#EF4444',    // Error states
}
```

### Navigation

Edit `src/components/layout/sidebar.tsx` to modify navigation links.

## 🚧 Future Development

To expand the modules:

1. **Add Mock Data**: Create JSON files for each module
2. **Create Types**: Define TypeScript interfaces
3. **Build Components**: Create module-specific components
4. **Add Pages**: Implement list, detail, and form pages
5. **Integrate**: Connect with existing FHIR/HL7 systems

## 📦 Build for Production

```bash
npm run build
npm start
```

## 🐛 Troubleshooting

### Node.js Version Error

**Error**: "Node.js version >=20.9.0 is required"

**Solution**: 
1. Install Node.js 20.x from [nodejs.org](https://nodejs.org/)
2. Or use nvm: `nvm install 20 && nvm use 20`

### Port Already in Use

**Error**: "Port 3000 is already in use"

**Solution**: 
```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Or use a different port
npm run dev -- -p 3001
```

### Module Not Found Errors

**Solution**: 
```bash
rm -rf node_modules package-lock.json
npm install
```

## 📄 License

This project is for demonstration purposes.

## 👥 Support

For questions or issues:
1. Check the troubleshooting section
2. Review the code comments
3. Inspect the mock data structure

## 🎉 Quick Start Summary

1. **Upgrade Node.js to 20.x or higher**
2. Run `npm install`
3. Run `npm run dev`
4. Open http://localhost:3000
5. Login with `demo` / `demo123`
6. Explore the dashboard and modules!

---

**Built with ❤️ for Tibbna-EHR Hospital Management System**
