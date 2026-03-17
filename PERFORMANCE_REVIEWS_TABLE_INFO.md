# 📊 Performance Reviews Table - Complete Info

## 🗄️ **Table: `performance_reviews`**

Your performance reviews are being stored in the **`performance_reviews`** table in the PostgreSQL database.

---

## 📋 **Table Structure**

| Column Name | Data Type | Nullable | Description |
|-------------|-----------|----------|-------------|
| **id** | uuid | NO | Primary key - unique review ID |
| **employee_id** | uuid | NO | Foreign key to staff table |
| **reviewer_id** | uuid | YES | Foreign key to staff table (reviewer) |
| **cycle_id** | varchar | NO | Review cycle identifier |
| **cycle_name** | varchar | YES | Review cycle display name |
| **review_period_start** | date | YES | Start date of review period |
| **review_period_end** | date | YES | End date of review period |
| **review_date** | date | YES | Date of review |
| **clinical_competence** | numeric | YES | Clinical rating (1-5) |
| **patient_care** | numeric | YES | Patient care rating (1-5) |
| **professionalism** | numeric | YES | Professionalism rating (1-5) |
| **teamwork** | numeric | YES | Teamwork rating (1-5) |
| **quality_safety** | numeric | YES | Quality & safety rating (1-5) |
| **attendance_score** | integer | YES | Attendance score (0-100) |
| **attendance_rating** | varchar | YES | Attendance rating text |
| **patient_feedback_score** | numeric | YES | Patient feedback score |
| **recognition_bonus** | numeric | YES | Recognition bonus points |
| **overall_rating** | numeric | YES | Calculated overall rating |
| **strengths** | text | YES | Strengths text |
| **improvements** | text | YES | Areas for improvement |
| **achievements** | text | YES | Key achievements |
| **goals_next_period** | text | YES | Goals for next period |
| **recommendation** | varchar | YES | Recommendation (Standard Increase, Promotion, etc.) |
| **status** | varchar | YES | Review status (IN_PROGRESS, FINALIZED, etc.) |
| **submitted_at** | timestamp | YES | When submitted |
| **reviewed_at** | timestamp | YES | When reviewed |
| **finalized_at** | timestamp | YES | When finalized |
| **created_at** | timestamp | YES | When created |
| **updated_at** | timestamp | YES | When updated |
| **created_by** | uuid | YES | Who created it |
| **updated_by** | uuid | YES | Who last updated it |

---

## 📈 **Recent Reviews in Database**

✅ **Your latest review just created:**
- **Review ID:** `9c77870b-0706-410c-b888-ee01fe9b6032`
- **Employee ID:** `1eae6ce0-cdd2-4c84-97a0-481a1c51a9b2` (yyyyyyyyyyyyyyyy yyyyyyyyyyyyyyyyyy)
- **Status:** `IN_PROGRESS`
- **Created:** `Sat Mar 14 2026 18:45:37 GMT+0100`
- **Ratings:** Clinical=2.1, Patient=3.2, Professional=4.0, Teamwork=4.7, Quality=5.0

---

## 🔗 **Foreign Key Relationships**

- **`employee_id`** → `staff(staffid)` - Employee being reviewed
- **`reviewer_id`** → `staff(staffid)` - Person conducting the review

---

## 🚀 **API Endpoints**

- **GET** `/api/hr/performance/reviews` - List all reviews
- **POST** `/api/hr/performance/reviews` - Create new review
- **GET** `/api/hr/performance/reviews/[id]` - Get specific review
- **PUT** `/api/hr/performance/reviews/[id]` - Update review
- **DELETE** `/api/hr/performance/reviews/[id]` - Delete review

---

## ⚠️ **Current Issue: NaN Rating**

The UI shows `NaN` for overall rating because:
1. The `overall_rating` field in database is `NULL`
2. The Performance page calculation has a bug
3. The API doesn't calculate `overall_rating` automatically

**Fix needed:** Update the Performance page rating calculation logic.

---

## 🎯 **Data Flow**

```
UI Form → POST /api/hr/performance/reviews → performance_reviews table
                                                    ↓
Performance page ← GET /api/hr/performance/reviews ← performance_reviews table
```

**All your performance review data is safely stored in the `performance_reviews` table!** 🎉
