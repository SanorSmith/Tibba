import { NextResponse } from 'next/server';
import { Pool } from 'pg';

export const dynamic = 'force-dynamic';

export async function POST() {
  const databaseUrl = process.env.OPENEHR_DATABASE_URL;

  if (!databaseUrl) {
    return NextResponse.json(
      { error: 'Database not configured' },
      { status: 500 }
    );
  }

  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
  });

  try {
    // Insert leave types
    const leaveTypes = [
      {
        code: 'ANNUAL',
        name: 'Annual Leave',
        category: 'PAID',
        max_days: 30,
        max_consecutive: 15,
        carry_forward: true,
        max_carry_forward_days: 10,
        accrual_method: 'MONTHLY',
        accrual_rate: 2.5,
        notice_days: 7,
        requires_documentation: false,
        color: '#3B82F6'
      },
      {
        code: 'SICK',
        name: 'Sick Leave',
        category: 'PAID',
        max_days: 30,
        max_consecutive: 30,
        carry_forward: false,
        max_carry_forward_days: 0,
        accrual_method: 'ANNUAL',
        accrual_rate: 30,
        notice_days: 0,
        requires_documentation: true,
        color: '#EF4444'
      },
      {
        code: 'EMERGENCY',
        name: 'Emergency Leave',
        category: 'PAID',
        max_days: 5,
        max_consecutive: 3,
        carry_forward: false,
        max_carry_forward_days: 0,
        accrual_method: 'ANNUAL',
        accrual_rate: 5,
        notice_days: 0,
        requires_documentation: false,
        color: '#F59E0B'
      },
      {
        code: 'MATERNITY',
        name: 'Maternity Leave',
        category: 'PAID',
        max_days: 90,
        max_consecutive: 90,
        carry_forward: false,
        max_carry_forward_days: 0,
        accrual_method: 'NONE',
        accrual_rate: 0,
        notice_days: 30,
        requires_documentation: true,
        gender_specific: 'FEMALE',
        color: '#EC4899'
      },
      {
        code: 'PATERNITY',
        name: 'Paternity Leave',
        category: 'PAID',
        max_days: 5,
        max_consecutive: 5,
        carry_forward: false,
        max_carry_forward_days: 0,
        accrual_method: 'NONE',
        accrual_rate: 0,
        notice_days: 7,
        requires_documentation: true,
        gender_specific: 'MALE',
        color: '#8B5CF6'
      },
      {
        code: 'UNPAID',
        name: 'Unpaid Leave',
        category: 'UNPAID',
        max_days: 30,
        max_consecutive: 15,
        carry_forward: false,
        max_carry_forward_days: 0,
        accrual_method: 'NONE',
        accrual_rate: 0,
        notice_days: 14,
        requires_documentation: false,
        color: '#6B7280'
      },
      {
        code: 'HAJJ',
        name: 'Hajj Leave',
        category: 'UNPAID',
        max_days: 30,
        max_consecutive: 30,
        carry_forward: false,
        max_carry_forward_days: 0,
        accrual_method: 'NONE',
        accrual_rate: 0,
        notice_days: 60,
        requires_documentation: true,
        color: '#059669'
      },
      {
        code: 'STUDY',
        name: 'Study Leave',
        category: 'HALF_PAID',
        max_days: 15,
        max_consecutive: 10,
        carry_forward: false,
        max_carry_forward_days: 0,
        accrual_method: 'NONE',
        accrual_rate: 0,
        notice_days: 14,
        requires_documentation: true,
        color: '#0EA5E9'
      }
    ];

    for (const leaveType of leaveTypes) {
      await pool.query(`
        INSERT INTO leave_types (
          code, name, category, max_days, max_consecutive, carry_forward,
          max_carry_forward_days, accrual_method, accrual_rate, notice_days,
          requires_documentation, gender_specific, color, is_active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, true)
        ON CONFLICT (code) DO UPDATE SET
          name = EXCLUDED.name,
          category = EXCLUDED.category,
          max_days = EXCLUDED.max_days,
          updated_at = NOW()
      `, [
        leaveType.code,
        leaveType.name,
        leaveType.category,
        leaveType.max_days,
        leaveType.max_consecutive,
        leaveType.carry_forward,
        leaveType.max_carry_forward_days,
        leaveType.accrual_method,
        leaveType.accrual_rate,
        leaveType.notice_days,
        leaveType.requires_documentation,
        leaveType.gender_specific || null,
        leaveType.color
      ]);
    }

    // Insert holidays for 2026
    const holidays = [
      { name: "New Year's Day", date: '2026-01-01', type: 'NATIONAL', recurring: true },
      { name: 'Army Day', date: '2026-01-06', type: 'NATIONAL', recurring: true },
      { name: 'Eid al-Fitr (Day 1)', date: '2026-03-20', type: 'RELIGIOUS', recurring: false },
      { name: 'Eid al-Fitr (Day 2)', date: '2026-03-21', type: 'RELIGIOUS', recurring: false },
      { name: 'Eid al-Fitr (Day 3)', date: '2026-03-22', type: 'RELIGIOUS', recurring: false },
      { name: 'Labour Day', date: '2026-05-01', type: 'NATIONAL', recurring: true },
      { name: 'Eid al-Adha (Day 1)', date: '2026-05-27', type: 'RELIGIOUS', recurring: false },
      { name: 'Eid al-Adha (Day 2)', date: '2026-05-28', type: 'RELIGIOUS', recurring: false },
      { name: 'Eid al-Adha (Day 3)', date: '2026-05-29', type: 'RELIGIOUS', recurring: false },
      { name: 'Islamic New Year', date: '2026-06-17', type: 'RELIGIOUS', recurring: false },
      { name: 'Republic Day', date: '2026-07-14', type: 'NATIONAL', recurring: true },
      { name: 'Ashura', date: '2026-06-26', type: 'RELIGIOUS', recurring: false }
    ];

    for (const holiday of holidays) {
      await pool.query(`
        INSERT INTO holidays (name, date, type, recurring, is_active)
        VALUES ($1, $2, $3, $4, true)
        ON CONFLICT DO NOTHING
      `, [holiday.name, holiday.date, holiday.type, holiday.recurring]);
    }

    await pool.end();

    return NextResponse.json({
      success: true,
      message: 'Leave types and holidays seeded successfully',
      data: {
        leave_types: leaveTypes.length,
        holidays: holidays.length
      }
    });

  } catch (error) {
    console.error('Error seeding leave data:', error);
    await pool.end();
    
    return NextResponse.json(
      { 
        error: 'Failed to seed leave data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
