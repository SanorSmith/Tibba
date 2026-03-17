# 🎯 Performance Management Integration Plan

## Current Status ✅

Your Performance Management page already has:
1. ✅ Real staff data from database
2. ✅ Attendance performance tracking (integrated)
3. ✅ Competency rating bars (Clinical, Patient Care, Professional, Teamwork, Quality)
4. ✅ Overall performance ratings
5. ✅ Recognition recommendations based on attendance

## What Needs to Be Added 🔧

### 1. **Medical Competence Evaluation**
**Current**: Placeholder competency bars showing 0 ratings
**Needed**: 
- Create `performance_reviews` table in database
- Add API to save/retrieve competency ratings
- Link competency scores with attendance scores
- Calculate weighted overall score:
  ```
  Overall Score = (Competency Score × 70%) + (Attendance Score × 30%)
  ```

**Database Schema**:
```sql
CREATE TABLE performance_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES staff(id),
  cycle_id VARCHAR(50),
  reviewer_id UUID REFERENCES staff(id),
  review_date DATE DEFAULT CURRENT_DATE,
  
  -- Competency Ratings (1-5)
  clinical_competence DECIMAL(2,1),
  patient_care DECIMAL(2,1),
  professionalism DECIMAL(2,1),
  teamwork DECIMAL(2,1),
  quality_safety DECIMAL(2,1),
  
  -- Attendance Score (auto-calculated)
  attendance_score INTEGER,
  attendance_rating VARCHAR(20),
  
  -- Overall
  overall_rating DECIMAL(2,1),
  
  -- Text fields
  strengths TEXT,
  improvements TEXT,
  recommendation TEXT,
  
  -- Status
  status VARCHAR(20) DEFAULT 'NOT_STARTED',
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 2. **Patient Feedback Integration**
**Needed**:
- Create `patient_feedback` table
- Link patient feedback to staff performance
- Display patient satisfaction scores in reviews
- Include patient feedback in overall rating

**Database Schema**:
```sql
CREATE TABLE patient_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES staff(id),
  patient_id UUID,
  feedback_date DATE DEFAULT CURRENT_DATE,
  
  -- Ratings (1-5)
  communication_rating INTEGER,
  professionalism_rating INTEGER,
  care_quality_rating INTEGER,
  overall_satisfaction INTEGER,
  
  -- Comments
  positive_comments TEXT,
  improvement_areas TEXT,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 3. **Recognition Programs**
**Current**: Recommendations shown in attendance cards
**Needed**:
- Create `employee_recognitions` table (already exists in your code)
- Add recognition workflow:
  - Auto-suggest recognition based on performance
  - Manual recognition by managers
  - Recognition types: Spot Award, Excellence Award, Team Player, etc.
- Display recognition history on performance page

**Database Schema**:
```sql
CREATE TABLE employee_recognitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES staff(id),
  type VARCHAR(50), -- SPOT_AWARD, EXCELLENCE, TEAM_PLAYER, etc.
  title VARCHAR(200),
  reason TEXT,
  recognized_by UUID REFERENCES staff(id),
  recognition_date DATE DEFAULT CURRENT_DATE,
  monetary_reward DECIMAL(10,2),
  status VARCHAR(20) DEFAULT 'APPROVED',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 4. **Promotion Tracking**
**Needed**:
- Create `promotions` table
- Link promotions to performance reviews
- Track promotion eligibility based on:
  - Overall performance rating (>= 4.0)
  - Attendance score (>= 85)
  - Patient feedback (>= 4.0)
  - Years of service
  - Recognition count

**Database Schema**:
```sql
CREATE TABLE promotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES staff(id),
  from_position VARCHAR(100),
  to_position VARCHAR(100),
  promotion_date DATE,
  effective_date DATE,
  salary_increase DECIMAL(10,2),
  reason TEXT,
  approved_by UUID REFERENCES staff(id),
  status VARCHAR(20) DEFAULT 'PENDING',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## 🔄 Integration Workflow

### **Comprehensive Performance Score Calculation**:
```javascript
function calculateOverallPerformance(employee) {
  // 1. Competency Score (40%)
  const competencyScore = (
    clinical_competence + 
    patient_care + 
    professionalism + 
    teamwork + 
    quality_safety
  ) / 5;
  
  // 2. Attendance Score (30%)
  const attendanceScore = calculateAttendanceScore(employee.id);
  
  // 3. Patient Feedback Score (20%)
  const patientScore = getAveragePatientFeedback(employee.id);
  
  // 4. Recognition Bonus (10%)
  const recognitionBonus = getRecognitionScore(employee.id);
  
  // Weighted Overall Score
  const overallScore = 
    (competencyScore * 0.40) +
    (attendanceScore / 20) + // Convert 100-point to 5-point
    (patientScore * 0.20) +
    (recognitionBonus * 0.10);
  
  return overallScore;
}
```

### **Auto-Recognition Triggers**:
```javascript
function checkRecognitionEligibility(employee) {
  const performance = calculateOverallPerformance(employee);
  const attendance = getAttendanceScore(employee.id);
  
  if (attendance >= 95 && performance >= 4.5) {
    return {
      eligible: true,
      type: 'EXCELLENCE_AWARD',
      reason: 'Outstanding performance and perfect attendance'
    };
  }
  
  if (attendance >= 90 && performance >= 4.0) {
    return {
      eligible: true,
      type: 'SPOT_AWARD',
      reason: 'Excellent performance and attendance'
    };
  }
  
  return { eligible: false };
}
```

### **Promotion Eligibility Check**:
```javascript
function checkPromotionEligibility(employee) {
  const performance = calculateOverallPerformance(employee);
  const attendance = getAttendanceScore(employee.id);
  const yearsOfService = getYearsOfService(employee.id);
  const recognitions = getRecognitionCount(employee.id);
  
  const eligible = 
    performance >= 4.0 &&
    attendance >= 85 &&
    yearsOfService >= 2 &&
    recognitions >= 1;
  
  return {
    eligible,
    score: performance,
    details: {
      performance,
      attendance,
      yearsOfService,
      recognitions
    }
  };
}
```

## 📋 Implementation Steps

### **Phase 1: Database Setup** (1-2 hours)
1. Create `performance_reviews` table
2. Create `patient_feedback` table
3. Create `employee_recognitions` table
4. Create `promotions` table

### **Phase 2: API Development** (2-3 hours)
1. Create API routes for performance reviews (CRUD)
2. Create API routes for patient feedback
3. Create API routes for recognitions
4. Create API routes for promotions
5. Create comprehensive score calculation API

### **Phase 3: UI Integration** (2-3 hours)
1. Update performance page to save/edit real reviews
2. Add patient feedback display
3. Add recognition workflow UI
4. Add promotion eligibility indicators
5. Update overall score calculation to include all factors

### **Phase 4: Automation** (1-2 hours)
1. Auto-calculate attendance scores
2. Auto-suggest recognitions
3. Auto-check promotion eligibility
4. Send notifications for pending reviews

## 🎯 Final Result

Once complete, your Performance Management system will:

✅ **Track medical competence** through structured evaluations
✅ **Integrate patient feedback** into performance scores
✅ **Automate recognition** based on performance + attendance
✅ **Identify promotion candidates** using comprehensive criteria
✅ **Calculate holistic scores** combining all performance factors
✅ **Provide actionable insights** for HR and managers

## 🚀 Quick Start

Would you like me to:
1. **Create the database tables** for performance reviews, patient feedback, and recognitions?
2. **Build the API endpoints** for saving and retrieving performance data?
3. **Update the UI** to allow editing real performance reviews?
4. **Implement the comprehensive scoring algorithm**?

Let me know which phase you'd like to start with!
