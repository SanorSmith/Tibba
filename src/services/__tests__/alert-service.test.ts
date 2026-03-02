/**
 * Alert Service Unit Tests
 * Tests for automated alert detection and notification system
 */

import { alertService } from '../alert-service';

// Mock Supabase client
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      lte: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
    })),
  })),
}));

describe('AlertService', () => {
  let service: typeof alertService;

  beforeEach(() => {
    service = new alertService();
    jest.clearAllMocks();
  });

  describe('checkLicenseExpiry', () => {
    test('should detect licenses expiring in 90 days', async () => {
      // Mock employee with license expiring in 90 days
      const mockEmployees = [
        {
          id: 'emp-1',
          metadata: {
            licenses: [
              {
                type: 'Medical License',
                number: 'ML-123456',
                expiry_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
              }
            ]
          }
        }
      ];

      // Mock the database calls
      const mockSupabase = require('@supabase/supabase-js').createClient();
      mockSupabase.from.mockReturnValue({
        select: mockSupabase.select.mockReturnValue({
          eq: mockSupabase.eq.mockResolvedValue({ data: mockEmployees })
        })
      });

      await service.checkLicenseExpiry();

      // Verify alert was created for 90-day expiry
      expect(mockSupababase.from).toHaveBeenCalledWith('employees');
      expect(mockSupababase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          alert_type: 'license_expiry',
          severity: 'warning',
          title: 'License Expiring in 90 Days',
        })
      );
    });

    test('should detect licenses expiring in 7 days (urgent)', async () => {
      const mockEmployees = [
        {
          id: 'emp-2',
          metadata: {
            licenses: [
              {
                type: 'Medical License',
                number: 'ML-789012',
                expiry_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
              }
            ]
          }
        }
      ];

      const mockSupabase = require('@supabase/supabase-js').createClient();
      mockSupabase.from.mockReturnValue({
        select: mockSupabase.select.mockReturnValue({
          eq: mockSupabase.eq.mockResolvedValue({ data: mockEmployees })
        })
      });

      await service.checkLicenseExpiry();

      expect(mockSupababase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          alert_type: 'license_expiry',
          severity: 'urgent',
          title: 'License Expiring in 7 Days',
        })
      );
    });

    test('should not create alerts for non-expiring licenses', async () => {
      const mockEmployees = [
        {
          id: 'emp-3',
          metadata: {
            licenses: [
              {
                type: 'Medical License',
                number: 'ML-345678',
                expiry_date: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
              }
            ]
          }
        }
      ];

      const mockSupabase = require('@supabase/supabase-js').createClient();
      mockSupabase.from.mockReturnValue({
        select: mockSupabase.select.mockReturnValue({
          eq: mockSupabase.eq.mockResolvedValue({ data: mockEmployees })
        })
      });

      await service.checkLicenseExpiry();

      // Should not create any alerts for 180-day expiry
      expect(mockSupababase.insert).not.toHaveBeenCalled();
    });
  });

  describe('checkAttendanceAnomalies', () => {
    test('should detect frequent late arrivals', async () => {
      const mockLateRecords = [
        { employee_id: 'emp-1', status: 'LATE' },
        { employee_id: 'emp-1', status: 'LATE' },
        { employee_id: 'emp-1', status: 'LATE' },
        { employee_id: 'emp-1', status: 'LATE' },
        { employee_id: 'emp-1', status: 'LATE' },
      ];

      const mockSupabase = require('@supabase/supabase-js').createClient();
      mockSupabase.from.mockReturnValue({
        select: mockSupabase.select.mockReturnValue({
          eq: mockSupabase.eq.mockResolvedValue({ data: mockLateRecords })
        })
      });

      await service.checkAttendanceAnomalies();

      expect(mockSupababase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          alert_type: 'late_arrival',
          severity: 'critical',
          title: 'Frequent Late Arrivals',
        })
      );
    });

    test('should detect missing check-outs', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const dateStr = yesterday.toISOString().split('T')[0];

      const mockMissingCheckout = [
        {
          employee_id: 'emp-2',
          attendance_date: dateStr,
          check_in: '08:00',
          check_out: null,
        }
      ];

      const mockSupabase = require('@supabase/supabase-js').createClient();
      mockSupabase.from.mockReturnValue({
        select: mockSupabase.select.mockReturnValue({
          eq: mockSupabase.eq.mockResolvedValue({ data: mockMissingCheckout })
        })
      });

      await service.checkAttendanceAnomalies();

      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          alert_type: 'missing_checkout',
          severity: 'warning',
          title: 'Missing Check-Out',
        })
      );
    });

    test('should detect high overtime hours', async () => {
      const mockHighOTRecords = [
        { employee_id: 'emp-3', overtime_hours: 25 },
        { employee_id: 'emp-3', overtime_hours: 15 },
        { employee_id: 'emp-3', overtime_hours: 20 },
      ];

      const mockSupabase = require('@supabase/supabase-js').createClient();
      mockSupabase.from.mockReturnValue({
        select: mockSupabase.select.mockReturnValue({
          eq: mockSupabase.eq.mockResolvedValue({ data: mockHighOTRecords })
        })
      });

      await service.checkAttendanceAnomalies();

      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          alert_type: 'high_overtime',
          severity: 'warning',
          title: 'High Overtime Hours',
        })
      );
    });

    test('should detect consecutive absences', async () => {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const mockAbsences = [
        { employee_id: 'emp-4', attendance_date: sevenDaysAgo.toISOString().split('T')[0], status: 'ABSENT' },
        { employee_id: 'emp-4', attendance_date: new Date(sevenDaysAgo.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0], status: 'ABSENT' },
        { employee_id: 'emp-4', attendance_date: new Date(sevenDaysAgo.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], status: 'ABSENT' },
        { employee_id: 'emp-4', attendance_date: new Date(sevenDaysAgo.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], status: 'ABSENT' },
      ];

      const mockSupabase = require('@supabase/supabase-js').createClient();
      mockSupabase.from.mockReturnValue({
        select: mockSupabase.select.mockReturnValue({
          eq: mockSupabase.eq.mockResolvedValue({ data: mockAbsences })
        })
      });

      await service.checkAttendanceAnomalies();

      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          alert_type: 'consecutive_absence',
          severity: 'critical',
          title: 'Consecutive Absences Detected',
        })
      );
    });
  });

  describe('checkLeaveBalances', () => {
    test('should warn employees with low leave balance', async () => {
      const mockEmployees = [
        {
          id: 'emp-5',
          metadata: { annual_leave_days: 30 }
        }
      ];

      const mockLeaves = [
        { total_days: 26, leave_type: 'annual', status: 'APPROVED' }
      ];

      const mockSupabase = require('@supabase/supabase-js').createClient();
      
      // Mock employees query
      mockSupabase.from.mockImplementation((table) => {
        if (table === 'employees') {
          return {
            select: mockSupabase.select.mockReturnValue({
              eq: mockSupabase.eq.mockResolvedValue({ data: mockEmployees })
            })
          };
        }
        if (table === 'leave_requests') {
          return {
            select: mockSupabase.select.mockReturnValue({
              eq: mockSupabase.eq.mockResolvedValue({ data: mockLeaves })
            })
          };
        }
        return mockSupabase.from(table);
      });

      await service.checkLeaveBalances();

      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          alert_type: 'leave_balance',
          severity: 'warning',
          title: 'Low Leave Balance',
        })
      );
    });

    test('should warn about expiring annual leave', async () => {
      const today = new Date();
      const endOfYear = new Date(today.getFullYear(), 11, 31);
      const daysUntilYearEnd = Math.ceil((endOfYear.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      if (daysUntilYearEnd <= 60) {
        const mockEmployees = [
          {
            id: 'emp-6',
            metadata: { annual_leave_days: 30 }
          }
        ];

        const mockLeaves = [
          { total_days: 10, leave_type: 'annual', status: 'APPROVED' }
        ];

        const mockSupabase = require('@supabase/supabase-js').createClient();
        mockSupabase.from.mockImplementation((table) => {
          if (table === 'employees') {
            return {
              select: mockSupabase.select.mockReturnValue({
                eq: mockSupabase.eq.mockResolvedValue({ data: mockEmployees })
              })
            };
          }
          if (table === 'leave_requests') {
            return {
              select: mockSupabase.select.mockReturnValue({
                eq: mockSupabase.eq.mockResolvedValue({ data: mockLeaves })
              })
            };
          }
          return mockSupabase.from(table);
        });

        await service.checkLeaveBalances();

        expect(mockSupabase.insert).toHaveBeenCalledWith(
          expect.objectContaining({
            alert_type: 'leave_balance',
            severity: 'info',
            title: 'Annual Leave Expiring Soon',
          })
        );
      }
    });
  });

  describe('initializeSchedules', () => {
    test('should initialize all scheduled tasks', () => {
      const status = service.getStatus();
      
      expect(status).toHaveLength(3);
      expect(status[0].name).toBe('license-expiry');
      expect(status[1].name).toBe('attendance-anomaly');
      expect(status[2].name).toBe('leave-balance');
    });

    test('should stop all scheduled tasks', () => {
      service.stopAll();
      
      const status = service.getStatus();
      expect(status).toHaveLength(0);
    });
  });

  describe('Helper Methods', () => {
    test('should send email notification', async () => {
      const mockSupabase = require('@supabase/supabase-js').createClient();
      mockSupabase.from.mockReturnValue({
        select: mockSupabase.select.mockReturnValue({
          eq: mockSupabase.eq.mockResolvedValue({ data: [{ email: 'test@example.com' }] })
        })
      });

      // Access private method via type assertion
      const service = alertService as any;
      await service.sendEmailNotification('test@example.com', 'Test Subject', 'Test Body');

      expect(mockSupabase.from).toHaveBeenCalledWith('notification_queue');
      expect(mockSupababase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          notification_type: 'email',
          recipient_email: 'test@example.com',
          subject: 'Test Subject',
          body: 'Test Body',
        })
      );
    });

    test('should notify HR manager', async () => {
      const mockSupabase = require('@supabase/supabase-js').createClient();
      mockSupabase.from.mockReturnValue({
        select: mockSupabase.select.mockReturnValue({
          eq: mockSupabase.eq.mockResolvedValue({ data: [{ email: 'hr@example.com' }] })
        })
      });

      const service = alertService as any;
      await service.notifyHRManager('Test Alert', 'Test Message');

      expect(mockSupabase.from).toHaveBeenCalledWith('employees');
      expect(mockSupababase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          notification_type: 'email',
          recipient_email: 'hr@example.com',
          subject: 'Test Alert',
          body: 'Test Message',
        })
      );
    });
  });
});
