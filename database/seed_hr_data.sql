-- =====================================================
-- HR SYSTEM SEED DATA
-- Sample Leave Types, Shifts, and Holidays
-- =====================================================

-- =====================================================
-- LEAVE TYPES
-- =====================================================

INSERT INTO leave_types (
  name, name_ar, code, description, description_ar,
  max_days_per_year, is_paid, requires_approval, min_notice_days, max_consecutive_days,
  accrual_frequency, accrual_rate, carry_forward_allowed, carry_forward_limit,
  color, sort_order, is_active, created_by
) VALUES
  -- Annual Leave
  (
    'Annual Leave', 'إجازة سنوية', 'ANNUAL',
    'Regular annual vacation leave', 'إجازة سنوية منتظمة',
    21, true, true, 7, 14,
    'YEARLY', 1.75, true, 5,
    '#3B82F6', 1, true, 'system'
  ),
  
  -- Sick Leave
  (
    'Sick Leave', 'إجازة مرضية', 'SICK',
    'Leave for medical reasons with certificate', 'إجازة لأسباب طبية مع شهادة',
    15, true, false, 0, 30,
    'YEARLY', 1.25, false, 0,
    '#EF4444', 2, true, 'system'
  ),
  
  -- Emergency Leave
  (
    'Emergency Leave', 'إجازة طارئة', 'EMERGENCY',
    'Urgent personal matters', 'أمور شخصية عاجلة',
    5, true, true, 0, 3,
    'YEARLY', 0.42, false, 0,
    '#F59E0B', 3, true, 'system'
  ),
  
  -- Maternity Leave
  (
    'Maternity Leave', 'إجازة أمومة', 'MATERNITY',
    'Maternity leave for female employees', 'إجازة أمومة للموظفات',
    90, true, true, 30, 90,
    'YEARLY', 0, false, 0,
    '#EC4899', 4, true, 'system'
  ),
  
  -- Paternity Leave
  (
    'Paternity Leave', 'إجازة أبوة', 'PATERNITY',
    'Paternity leave for male employees', 'إجازة أبوة للموظفين',
    3, true, true, 7, 3,
    'YEARLY', 0, false, 0,
    '#8B5CF6', 5, true, 'system'
  ),
  
  -- Hajj Leave
  (
    'Hajj Leave', 'إجازة حج', 'HAJJ',
    'Leave for Hajj pilgrimage (once in service)', 'إجازة لأداء فريضة الحج (مرة واحدة)',
    15, true, true, 60, 15,
    'YEARLY', 0, false, 0,
    '#10B981', 6, true, 'system'
  ),
  
  -- Bereavement Leave
  (
    'Bereavement Leave', 'إجازة وفاة', 'BEREAVEMENT',
    'Leave for death of immediate family member', 'إجازة لوفاة أحد أفراد الأسرة المباشرين',
    5, true, false, 0, 5,
    'YEARLY', 0, false, 0,
    '#6B7280', 7, true, 'system'
  ),
  
  -- Marriage Leave
  (
    'Marriage Leave', 'إجازة زواج', 'MARRIAGE',
    'Leave for employee marriage', 'إجازة لزواج الموظف',
    5, true, true, 14, 5,
    'YEARLY', 0, false, 0,
    '#F472B6', 8, true, 'system'
  ),
  
  -- Study Leave
  (
    'Study Leave', 'إجازة دراسية', 'STUDY',
    'Leave for educational purposes', 'إجازة للأغراض التعليمية',
    10, false, true, 30, 10,
    'YEARLY', 0, false, 0,
    '#06B6D4', 9, true, 'system'
  ),
  
  -- Unpaid Leave
  (
    'Unpaid Leave', 'إجازة بدون راتب', 'UNPAID',
    'Leave without pay', 'إجازة بدون راتب',
    30, false, true, 14, 30,
    'YEARLY', 0, false, 0,
    '#9CA3AF', 10, true, 'system'
  ),
  
  -- Compensatory Leave
  (
    'Compensatory Leave', 'إجازة تعويضية', 'COMPENSATORY',
    'Leave in lieu of overtime work', 'إجازة مقابل العمل الإضافي',
    0, true, true, 1, 5,
    'MONTHLY', 0, true, 10,
    '#14B8A6', 11, true, 'system'
  );

-- =====================================================
-- SHIFTS
-- =====================================================

INSERT INTO shifts (
  name, name_ar, code, description, description_ar,
  start_time, end_time, break_minutes, total_hours,
  is_night_shift, is_weekend_shift, is_holiday_shift,
  grace_period_minutes, overtime_start_after, overtime_rate,
  color, sort_order, is_active, created_by
) VALUES
  -- Day Shift
  (
    'Day Shift', 'الوردية النهارية', 'DAY',
    'Regular day shift', 'الوردية النهارية العادية',
    '08:00', '16:00', 60, 7.00,
    false, false, false,
    15, 0, 1.50,
    '#3B82F6', 1, true, 'system'
  ),
  
  -- Night Shift
  (
    'Night Shift', 'الوردية الليلية', 'NIGHT',
    'Night shift with premium pay', 'الوردية الليلية مع بدل ليلي',
    '20:00', '08:00', 60, 11.00,
    true, false, false,
    15, 0, 2.00,
    '#6366F1', 2, true, 'system'
  ),
  
  -- Afternoon Shift
  (
    'Afternoon Shift', 'وردية المساء', 'AFTERNOON',
    'Afternoon shift', 'وردية المساء',
    '14:00', '22:00', 60, 7.00,
    false, false, false,
    15, 0, 1.50,
    '#8B5CF6', 3, true, 'system'
  ),
  
  -- Morning Shift
  (
    'Morning Shift', 'الوردية الصباحية', 'MORNING',
    'Early morning shift', 'الوردية الصباحية المبكرة',
    '06:00', '14:00', 60, 7.00,
    false, false, false,
    15, 0, 1.50,
    '#10B981', 4, true, 'system'
  ),
  
  -- Ramadan Shift
  (
    'Ramadan Shift', 'وردية رمضان', 'RAMADAN',
    'Special shift during Ramadan', 'وردية خاصة خلال شهر رمضان',
    '09:00', '15:00', 0, 6.00,
    false, false, false,
    15, 0, 1.50,
    '#F59E0B', 5, true, 'system'
  ),
  
  -- Weekend Shift
  (
    'Weekend Shift', 'وردية نهاية الأسبوع', 'WEEKEND',
    'Weekend duty shift', 'وردية عمل نهاية الأسبوع',
    '08:00', '16:00', 60, 7.00,
    false, true, false,
    15, 0, 2.00,
    '#EC4899', 6, true, 'system'
  ),
  
  -- On-Call Shift
  (
    'On-Call Shift', 'وردية الاستدعاء', 'ONCALL',
    'On-call emergency shift', 'وردية استدعاء الطوارئ',
    '00:00', '00:00', 0, 0.00,
    false, false, false,
    0, 0, 2.50,
    '#EF4444', 7, true, 'system'
  ),
  
  -- 12-Hour Day
  (
    '12-Hour Day Shift', 'وردية 12 ساعة نهارية', '12H-DAY',
    '12-hour day shift for nursing staff', 'وردية 12 ساعة نهارية للتمريض',
    '07:00', '19:00', 60, 11.00,
    false, false, false,
    15, 0, 1.50,
    '#06B6D4', 8, true, 'system'
  ),
  
  -- 12-Hour Night
  (
    '12-Hour Night Shift', 'وردية 12 ساعة ليلية', '12H-NIGHT',
    '12-hour night shift for nursing staff', 'وردية 12 ساعة ليلية للتمريض',
    '19:00', '07:00', 60, 11.00,
    true, false, false,
    15, 0, 2.00,
    '#7C3AED', 9, true, 'system'
  );

-- =====================================================
-- OFFICIAL HOLIDAYS (2026)
-- =====================================================

INSERT INTO official_holidays (
  name, name_ar, date, is_recurring, is_paid_holiday, is_optional,
  color, is_active, created_by
) VALUES
  -- Fixed Holidays
  ('New Year''s Day', 'رأس السنة الميلادية', '2026-01-01', true, true, false, '#EF4444', true, 'system'),
  ('Labor Day', 'عيد العمال', '2026-05-01', true, true, false, '#F59E0B', true, 'system'),
  ('National Day', 'اليوم الوطني', '2026-09-23', true, true, false, '#10B981', true, 'system'),
  
  -- Islamic Holidays (approximate dates for 2026)
  ('Eid Al-Fitr Day 1', 'عيد الفطر - اليوم الأول', '2026-03-31', false, true, false, '#8B5CF6', true, 'system'),
  ('Eid Al-Fitr Day 2', 'عيد الفطر - اليوم الثاني', '2026-04-01', false, true, false, '#8B5CF6', true, 'system'),
  ('Eid Al-Fitr Day 3', 'عيد الفطر - اليوم الثالث', '2026-04-02', false, true, false, '#8B5CF6', true, 'system'),
  
  ('Arafat Day', 'يوم عرفة', '2026-06-16', false, true, false, '#06B6D4', true, 'system'),
  ('Eid Al-Adha Day 1', 'عيد الأضحى - اليوم الأول', '2026-06-17', false, true, false, '#EC4899', true, 'system'),
  ('Eid Al-Adha Day 2', 'عيد الأضحى - اليوم الثاني', '2026-06-18', false, true, false, '#EC4899', true, 'system'),
  ('Eid Al-Adha Day 3', 'عيد الأضحى - اليوم الثالث', '2026-06-19', false, true, false, '#EC4899', true, 'system'),
  
  ('Islamic New Year', 'رأس السنة الهجرية', '2026-07-08', false, true, false, '#3B82F6', true, 'system'),
  ('Prophet''s Birthday', 'المولد النبوي الشريف', '2026-09-16', false, true, false, '#10B981', true, 'system');

-- =====================================================
-- SUMMARY
-- =====================================================

-- Display summary
SELECT 'Leave Types Created' as category, COUNT(*) as count FROM leave_types
UNION ALL
SELECT 'Shifts Created', COUNT(*) FROM shifts
UNION ALL
SELECT 'Holidays Created', COUNT(*) FROM official_holidays;
