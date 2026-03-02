/**
 * Report Generator Unit Tests
 * Tests for report generation and export functionality
 */

import { ReportGenerator } from '../report-generator';

describe('ReportGenerator', () => {
  let reportGenerator: ReportGenerator;

  beforeEach(() => {
    reportGenerator = new ReportGenerator();
  });

  describe('generateReport', () => {
    test('should generate attendance report', async () => {
      const report = await reportGenerator.generateReport('attendance', {
        startDate: '2024-02-01',
        endDate: '2024-02-29',
      });

      expect(report).toBeDefined();
      expect(report.data).toBeDefined();
      expect(report.reportType).toBe('attendance');
    });

    test('should generate payroll report', async () => {
      const report = await reportGenerator.generateReport('payroll', {
        periodId: 'period-uuid-123',
      });

      expect(report).toBeDefined();
      expect(report.data).toBeDefined();
      expect(report.reportType).toBe('payroll');
    });

    test('should generate leave report', async () => {
      const report = await reportGenerator.generateReport('leave', {
        startDate: '2024-02-01',
        endDate: '2024-02-29',
      });

      expect(report).toBeDefined();
      expect(report.data).toBeDefined();
      expect(report.reportType).toBe('leave');
    });

    test('should reject invalid report type', async () => {
      await expect(
        reportGenerator.generateReport('invalid-type', {})
      ).rejects.toThrow('Invalid report type');
    });

    test('should handle missing required parameters', async () => {
      await expect(
        reportGenerator.generateReport('attendance', {})
      ).rejects.toThrow('Missing required parameters');
    });
  });

  describe('exportToExcel', () => {
    test('should export report to Excel format', async () => {
      const mockReport = {
        reportType: 'attendance',
        data: [
          { employee: 'John Doe', days: 22, overtime: 5 },
          { employee: 'Jane Smith', days: 20, overtime: 3 },
        ],
      };

      const excelBuffer = await reportGenerator.exportToExcel(mockReport);

      expect(excelBuffer).toBeInstanceOf(Buffer);
      expect(excelBuffer.length).toBeGreaterThan(0);
    });

    test('should create valid Excel file structure', async () => {
      const mockReport = {
        reportType: 'payroll',
        data: [
          { employee: 'John Doe', gross: 10000, net: 8500 },
          { employee: 'Jane Smith', gross: 12000, net: 10200 },
        ],
      };

      const excelBuffer = await reportGenerator.exportToExcel(mockReport);

      // Excel files should have valid headers
      expect(excelBuffer.length).toBeGreaterThan(1000);
    });

    test('should handle empty report data', async () => {
      const mockReport = {
        reportType: 'attendance',
        data: [],
      };

      const excelBuffer = await reportGenerator.exportToExcel(mockReport);

      expect(excelBuffer).toBeInstanceOf(Buffer);
      expect(excelBuffer.length).toBeGreaterThan(0);
    });
  });

  describe('exportToPDF', () => {
    test('should export report to PDF format', async () => {
      const mockReport = {
        reportType: 'attendance',
        data: [
          { employee: 'John Doe', days: 22, overtime: 5 },
          { employee: 'Jane Smith', days: 20, overtime: 3 },
        ],
      };

      const pdfBuffer = await reportGenerator.exportToPDF(mockReport);

      expect(pdfBuffer).toBeInstanceOf(Buffer);
      expect(pdfBuffer.length).toBeGreaterThan(0);
    });

    test('should create valid PDF file structure', async () => {
      const mockReport = {
        reportType: 'payroll',
        data: [
          { employee: 'John Doe', gross: 10000, net: 8500 },
          { employee: 'Jane Smith', gross: 12000, net: 10200 },
        ],
      };

      const pdfBuffer = await reportGenerator.exportToPDF(mockReport);

      // PDF files should start with %PDF header
      expect(pdfBuffer.toString().startsWith('%PDF')).toBe(true);
    });

    test('should include report metadata in PDF', async () => {
      const mockReport = {
        reportType: 'attendance',
        data: [{ employee: 'John Doe', days: 22 }],
        metadata: {
          generatedAt: new Date().toISOString(),
          generatedBy: 'test-user',
        },
      };

      const pdfBuffer = await reportGenerator.exportToPDF(mockReport);

      expect(pdfBuffer).toBeInstanceOf(Buffer);
      expect(pdfBuffer.length).toBeGreaterThan(1000);
    });
  });

  describe('getCachedReport', () => {
    test('should return cached report if available', async () => {
      // First, generate and cache a report
      await reportGenerator.generateReport('attendance', {
        startDate: '2024-02-01',
        endDate: '2024-02-29',
      });

      // Then retrieve from cache
      const cachedReport = await reportGenerator.getCachedReport('attendance', {
        startDate: '2024-02-01',
        endDate: '2024-02-29',
      });

      expect(cachedReport).toBeDefined();
      expect(cachedReport.reportType).toBe('attendance');
    });

    test('should return null for non-cached report', async () => {
      const cachedReport = await reportGenerator.getCachedReport('attendance', {
        startDate: '2024-03-01',
        endDate: '2024-03-31',
      });

      expect(cachedReport).toBeNull();
    });
  });

  describe('validateReportParameters', () => {
    test('should validate attendance report parameters', () => {
      const validParams = {
        startDate: '2024-02-01',
        endDate: '2024-02-29',
      };

      expect(() => {
        reportGenerator.validateReportParameters('attendance', validParams);
      }).not.toThrow();
    });

    test('should validate payroll report parameters', () => {
      const validParams = {
        periodId: 'period-uuid-123',
      };

      expect(() => {
        reportGenerator.validateReportParameters('payroll', validParams);
      }).not.toThrow();
    });

    test('should reject invalid date range', () => {
      const invalidParams = {
        startDate: '2024-02-29',
        endDate: '2024-02-01', // End before start
      };

      expect(() => {
        reportGenerator.validateReportParameters('attendance', invalidParams);
      }).toThrow('Invalid date range');
    });

    test('should reject missing period ID for payroll', () => {
      const invalidParams = {};

      expect(() => {
        reportGenerator.validateReportParameters('payroll', invalidParams);
      }).toThrow('Period ID is required');
    });
  });
});
