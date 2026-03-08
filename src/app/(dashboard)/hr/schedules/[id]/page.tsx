"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Download, Printer, Calendar, Clock, User, Building2 } from 'lucide-react';
// Using browser alert instead of react-hot-toast to avoid dependency issues

interface DailyDetail {
  day_of_week: number;
  start_time: string;
  end_time: string;
  lunch_start?: string;
  lunch_end?: string;
  total_work_hours: number;
  net_work_hours: number;
}

interface Schedule {
  id: string;
  employee_id: string;
  employee_name: string;
  department_name: string;
  shift_id: string;
  shift_name: string;
  shift_code: string;
  effective_date: string;
  end_date?: string;
  schedule_type: string;
  status: string;
  daily_details?: DailyDetail[];
}

export default function ScheduleDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentWeek, setCurrentWeek] = useState(0);
  const [viewMode, setViewMode] = useState<'detailed' | 'summary'>('detailed');

  useEffect(() => {
    fetchSchedule();
  }, [params.id]);

  const fetchSchedule = async () => {
    try {
      // Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!params.id || !uuidRegex.test(params.id as string)) {
        throw new Error('Invalid schedule ID format');
      }

      const response = await fetch(`/api/hr/schedules?id=${params.id}`);
      if (!response.ok) throw new Error('Failed to fetch schedule');
      
      const result = await response.json();
      if (result.success) {
        setSchedule(result.data);
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      alert(error.message);
      router.push('/hr/schedules');
    } finally {
      setLoading(false);
    }
  };

  const generateWeekDates = (weekOffset: number) => {
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay() + (weekOffset * 7));
    
    const week = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      week.push(date);
    }
    return week;
  };

  const getDaySchedule = (dayOfWeek: number) => {
    if (!schedule?.daily_details) return null;
    return schedule.daily_details.find(detail => detail.day_of_week === dayOfWeek);
  };

  const formatTime = (time: string) => {
    return time ? time.slice(0, 5) : '--:--';
  };

  const handleDownload = () => {
    if (!schedule) return;
    
    try {
      // Generate PDF content
      const pdfContent = generatePDFHTML();
      
      // Create a new window for PDF generation
      const pdfWindow = window.open('', '_blank', 'width=800,height=600');
      if (!pdfWindow) {
        alert('Please allow popups to download PDF');
        return;
      }
      
      // Write content to the new window
      pdfWindow.document.write(pdfContent);
      pdfWindow.document.close();
      
      // Wait for content to load, then trigger print to PDF
      pdfWindow.onload = () => {
        setTimeout(() => {
          pdfWindow.print();
          pdfWindow.close();
        }, 250);
      };
      
      alert('PDF download window opened - use "Save as PDF" in print dialog');
    } catch (error) {
      console.error('PDF generation error:', error);
      alert('Failed to generate PDF. Please check your popup settings.');
    }
  };

  const handlePrint = () => {
    if (!schedule) {
      alert('No schedule data available');
      return;
    }
    
    try {
      // Generate HTML content first
      const htmlContent = generatePrintHTML();
      
      // Create a new window for printing
      const printWindow = window.open('', '_blank', 'width=1200,height=600');
      
      if (!printWindow) {
        // Fallback: try opening without dimensions
        const fallbackWindow = window.open('', '_blank');
        if (!fallbackWindow) {
          // Final fallback: use current window with print styles
          useCurrentWindowPrint();
          return;
        }
        writeContentAndPrint(fallbackWindow, htmlContent);
        return;
      }
      
      writeContentAndPrint(printWindow, htmlContent);
    } catch (error) {
      console.error('Print error:', error);
      // Fallback to current window
      useCurrentWindowPrint();
    }
  };

  const writeContentAndPrint = (printWindow: any, htmlContent: string) => {
    try {
      // Write content to the new window
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      
      // Wait for content to load, then print
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print();
          printWindow.close();
        }, 250);
      };
      
      alert('Print window opened - use your browser\'s print dialog');
    } catch (error) {
      console.error('Print window error:', error);
      printWindow.close();
      useCurrentWindowPrint();
    }
  };

  const useCurrentWindowPrint = () => {
    // Create a hidden print div and use current window
    const printDiv = document.createElement('div');
    printDiv.style.display = 'none';
    printDiv.innerHTML = generatePrintHTML().replace(/<!DOCTYPE html><html><head>[\s\S]*?<\/head><body>/, '').replace(/<\/body><\/html>$/, '');
    
    // Add print styles
    const style = document.createElement('style');
    style.textContent = `
      @media print {
        body * { visibility: hidden; }
        #print-content, #print-content * { visibility: visible; }
        #print-content { position: absolute; left: 0; top: 0; width: 100%; }
      }
    `;
    
    printDiv.id = 'print-content';
    document.head.appendChild(style);
    document.body.appendChild(printDiv);
    
    window.print();
    
    // Clean up
    setTimeout(() => {
      document.head.removeChild(style);
      document.body.removeChild(printDiv);
    }, 1000);
    
    alert('Print dialog opened - use your browser\'s print dialog');
  };

  const generatePrintHTML = () => {
    if (!schedule) return '';
    
    // Generate table for 4 weeks
    let tablesHTML = '';
    for (let week = 0; week < 4; week++) {
      const weekDates = generateWeekDates(week);
      
      let rowsHTML = '';
      weekDates.forEach(date => {
        const dayOfWeek = date.getDay() || 7;
        const daySchedule = getDaySchedule(dayOfWeek);
        
        const hasSchedule = daySchedule && daySchedule.start_time;
        const rowClass = hasSchedule ? '' : 'no-schedule';
        
        rowsHTML += `
          <tr class="${rowClass}">
            <td>${date.toLocaleDateString()}</td>
            <td>${date.toLocaleDateString('en-US', { weekday: 'long' })}</td>
            <td>${hasSchedule ? schedule.shift_name || 'N/A' : 'No Schedule'}</td>
            <td>${daySchedule?.start_time || '-'}</td>
            <td>${daySchedule?.end_time || '-'}</td>
            <td>${daySchedule?.lunch_start || '-'}</td>
            <td>${daySchedule?.lunch_end || '-'}</td>
            <td>${hasSchedule ? parseFloat(String(daySchedule?.total_work_hours || 0)).toFixed(1) + 'h' : '-'}</td>
            <td>${hasSchedule ? parseFloat(String(daySchedule?.net_work_hours || 0)).toFixed(1) + 'h' : '-'}</td>
          </tr>
        `;
      });
      
      tablesHTML += `
        <h3>Week ${week + 1}</h3>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Day</th>
              <th>Shift</th>
              <th>Start Time</th>
              <th>End Time</th>
              <th>Lunch Start</th>
              <th>Lunch End</th>
              <th>Total Hours</th>
              <th>Net Hours</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHTML}
          </tbody>
        </table>
      `;
    }
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Schedule - ${schedule.employee_name}</title>
        <style>
          @page {
            size: A4 landscape;
            margin: 1cm;
          }
          body {
            font-family: Arial, sans-serif;
            font-size: 12px;
            margin: 0;
            padding: 20px;
          }
          .header {
            margin-bottom: 20px;
            border-bottom: 1px solid #ccc;
            padding-bottom: 10px;
          }
          .header h2 {
            margin: 0 0 10px 0;
            font-size: 18px;
          }
          .header-info {
            display: flex;
            gap: 30px;
            margin-bottom: 10px;
          }
          .header-info span {
            font-size: 12px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
          }
          th, td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
            font-size: 11px;
          }
          th {
            background-color: #f5f5f5;
            font-weight: bold;
          }
          .no-schedule {
            background-color: #f9f9f9;
            font-style: italic;
            color: #666;
          }
          h3 {
            margin: 20px 0 10px 0;
            font-size: 16px;
            color: #333;
          }
          @media print {
            body { margin: 0; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h2>Employee Schedule</h2>
          <div class="header-info">
            <span><strong>Employee:</strong> ${schedule.employee_name}</span>
            <span><strong>Department:</strong> ${schedule.department_name}</span>
            <span><strong>Shift:</strong> ${schedule.shift_name}</span>
          </div>
          <div class="header-info">
            <span><strong>Period:</strong> ${new Date(schedule.effective_date).toLocaleDateString()} - ${schedule.end_date ? new Date(schedule.end_date).toLocaleDateString() : 'Ongoing'}</span>
            <span><strong>Status:</strong> ${schedule.status}</span>
          </div>
        </div>
        ${tablesHTML}
      </body>
      </html>
    `;
  };

  const generatePDFHTML = () => {
    if (!schedule) return '';
    
    // Generate table for 4 weeks in PDF format
    let tablesHTML = '';
    for (let week = 0; week < 4; week++) {
      const weekDates = generateWeekDates(week);
      
      let rowsHTML = '';
      weekDates.forEach(date => {
        const dayOfWeek = date.getDay() || 7;
        const daySchedule = getDaySchedule(dayOfWeek);
        
        const hasSchedule = daySchedule && daySchedule.start_time;
        
        rowsHTML += `
          <tr>
            <td>${date.toLocaleDateString()}</td>
            <td>${date.toLocaleDateString('en-US', { weekday: 'long' })}</td>
            <td>${hasSchedule ? schedule.shift_name || 'N/A' : 'No Schedule'}</td>
            <td>${daySchedule?.start_time || '-'}</td>
            <td>${daySchedule?.end_time || '-'}</td>
            <td>${daySchedule?.lunch_start || '-'}</td>
            <td>${daySchedule?.lunch_end || '-'}</td>
            <td>${hasSchedule ? parseFloat(String(daySchedule?.total_work_hours || 0)).toFixed(1) + 'h' : '-'}</td>
            <td>${hasSchedule ? parseFloat(String(daySchedule?.net_work_hours || 0)).toFixed(1) + 'h' : '-'}</td>
          </tr>
        `;
      });
      
      tablesHTML += `
        <h3>Week ${week + 1}</h3>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Day</th>
              <th>Shift</th>
              <th>Start Time</th>
              <th>End Time</th>
              <th>Lunch Start</th>
              <th>Lunch End</th>
              <th>Total Hours</th>
              <th>Net Hours</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHTML}
          </tbody>
        </table>
      `;
    }
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Employee Schedule - ${schedule.employee_name}</title>
        <style>
          @page {
            size: A4 landscape;
            margin: 1cm;
          }
          body {
            font-family: Arial, sans-serif;
            font-size: 12px;
            margin: 0;
            padding: 20px;
          }
          .header {
            margin-bottom: 20px;
            border-bottom: 1px solid #ccc;
            padding-bottom: 10px;
          }
          .header h2 {
            margin: 0 0 10px 0;
            font-size: 18px;
          }
          .header-info {
            display: flex;
            gap: 30px;
            margin-bottom: 10px;
          }
          .header-info span {
            font-size: 12px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
          }
          th, td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
            font-size: 11px;
          }
          th {
            background-color: #f5f5f5;
            font-weight: bold;
          }
          h3 {
            margin: 20px 0 10px 0;
            font-size: 16px;
            color: #333;
          }
          @media print {
            body { margin: 0; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h2>Employee Schedule</h2>
          <div class="header-info">
            <span><strong>Employee:</strong> ${schedule.employee_name}</span>
            <span><strong>Department:</strong> ${schedule.department_name}</span>
            <span><strong>Shift:</strong> ${schedule.shift_name}</span>
          </div>
          <div class="header-info">
            <span><strong>Period:</strong> ${new Date(schedule.effective_date).toLocaleDateString()} - ${schedule.end_date ? new Date(schedule.end_date).toLocaleDateString() : 'Ongoing'}</span>
            <span><strong>Status:</strong> ${schedule.status}</span>
          </div>
        </div>
        ${tablesHTML}
      </body>
      </html>
    `;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!schedule) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Schedule Not Found</h2>
          <p className="text-gray-600 mb-4">The requested schedule could not be found.</p>
          <button
            onClick={() => router.back()}
            className="btn-primary"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 print:p-4">
      {/* Header */}
      <div className="flex justify-between items-center mb-6 print:hidden">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Schedules
        </button>
        
        <div className="flex gap-2">
          <button
            onClick={handleDownload}
            className="btn-secondary flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Download PDF
          </button>
          <button
            onClick={handlePrint}
            className="btn-primary flex items-center gap-2"
          >
            <Printer className="w-4 h-4" />
            Print
          </button>
        </div>
      </div>

      {/* Schedule Info Card */}
      <div className="tibbna-card mb-6">
        <div className="tibbna-card-header">
          <h2 className="text-xl font-bold text-gray-900">Employee Schedule Details</h2>
        </div>
        <div className="tibbna-card-content">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="flex items-center gap-3">
              <User className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-500">Employee</p>
                <p className="font-medium">{schedule.employee_name}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Building2 className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-500">Department</p>
                <p className="font-medium">{schedule.department_name}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-500">Shift</p>
                <p className="font-medium">{schedule.shift_name}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-500">Period</p>
                <p className="font-medium">
                  {new Date(schedule.effective_date).toLocaleDateString()} - 
                  {schedule.end_date ? new Date(schedule.end_date).toLocaleDateString() : 'Ongoing'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* View Mode Toggle */}
      <div className="tibbna-card mb-4 print:hidden">
        <div className="tibbna-card-header">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Schedule View</h3>
            <div className="flex gap-2">
              <button
                onClick={() => setViewMode('detailed')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  viewMode === 'detailed'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                1 Week Detailed
              </button>
              <button
                onClick={() => setViewMode('summary')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  viewMode === 'summary'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                4 Weeks Summary
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Week Navigation for Detailed View */}
      {viewMode === 'detailed' && (
        <div className="mb-4 flex gap-2 print:hidden">
          {[0, 1, 2, 3].map((week) => (
            <button
              key={week}
              onClick={() => setCurrentWeek(week)}
              className={`px-3 py-1 rounded-lg text-sm font-medium ${
                currentWeek === week
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Week {week + 1}
            </button>
          ))}
        </div>
      )}

      {/* 1 Week Detailed View */}
      {viewMode === 'detailed' && (
        <div className="tibbna-card">
          <div className="tibbna-card-content">
            <h3 className="text-lg font-semibold mb-4">Week {currentWeek + 1} - Detailed Schedule</h3>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="border border-gray-200 bg-gray-50 p-3 text-left font-medium text-gray-900">Day</th>
                    <th className="border border-gray-200 bg-gray-50 p-3 text-left font-medium text-gray-900">Date</th>
                    <th className="border border-gray-200 bg-gray-50 p-3 text-left font-medium text-gray-900">Shift</th>
                    <th className="border border-gray-200 bg-gray-50 p-3 text-left font-medium text-gray-900">Start Time</th>
                    <th className="border border-gray-200 bg-gray-50 p-3 text-left font-medium text-gray-900">End Time</th>
                    <th className="border border-gray-200 bg-gray-50 p-3 text-left font-medium text-gray-900">Lunch Break</th>
                    <th className="border border-gray-200 bg-gray-50 p-3 text-left font-medium text-gray-900">Total Hours</th>
                    <th className="border border-gray-200 bg-gray-50 p-3 text-left font-medium text-gray-900">Net Hours</th>
                  </tr>
                </thead>
                <tbody>
                  {generateWeekDates(currentWeek).map((date, index) => {
                    const dayOfWeek = date.getDay() || 7;
                    const daySchedule = getDaySchedule(dayOfWeek);
                    const isToday = date.toDateString() === new Date().toDateString();
                    
                    return (
                      <tr key={index} className={isToday ? 'bg-blue-50' : index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="border border-gray-200 p-3">
                          <div className="font-medium">
                            {date.toLocaleDateString('en-US', { weekday: 'long' })}
                            {isToday && <span className="ml-2 px-2 py-1 bg-blue-600 text-white text-xs rounded-full">Today</span>}
                          </div>
                        </td>
                        <td className="border border-gray-200 p-3">{date.toLocaleDateString()}</td>
                        <td className="border border-gray-200 p-3">
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">{schedule.shift_name || 'N/A'}</span>
                        </td>
                        <td className="border border-gray-200 p-3">{formatTime(daySchedule?.start_time || '')}</td>
                        <td className="border border-gray-200 p-3">{formatTime(daySchedule?.end_time || '')}</td>
                        <td className="border border-gray-200 p-3">
                          {daySchedule?.lunch_start && daySchedule?.lunch_end ? (
                            <span className="text-sm">{formatTime(daySchedule.lunch_start)} - {formatTime(daySchedule.lunch_end)}</span>
                          ) : (
                            <span className="text-gray-400">No break</span>
                          )}
                        </td>
                        <td className="border border-gray-200 p-3">
                          <span className="font-medium">{parseFloat(String(daySchedule?.total_work_hours || 0)).toFixed(1)}h</span>
                        </td>
                        <td className="border border-gray-200 p-3">
                          <span className="font-medium text-green-600">{parseFloat(String(daySchedule?.net_work_hours || 0)).toFixed(1)}h</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Week Summary */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Weekly Total Hours</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {generateWeekDates(currentWeek).reduce((total, date) => {
                      const dayOfWeek = date.getDay() || 7;
                      const daySchedule = getDaySchedule(dayOfWeek);
                      return total + parseFloat(String(daySchedule?.total_work_hours || 0));
                    }, 0).toFixed(1)}h
                  </p>
                </div>
                
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Weekly Net Hours</p>
                  <p className="text-2xl font-bold text-green-600">
                    {generateWeekDates(currentWeek).reduce((total, date) => {
                      const dayOfWeek = date.getDay() || 7;
                      const daySchedule = getDaySchedule(dayOfWeek);
                      return total + parseFloat(String(daySchedule?.net_work_hours || 0));
                    }, 0).toFixed(1)}h
                  </p>
                </div>
                
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Working Days</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {generateWeekDates(currentWeek).filter(date => {
                      const dayOfWeek = date.getDay() || 7;
                      return getDaySchedule(dayOfWeek);
                    }).length}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4 Weeks Summary View */}
      {viewMode === 'summary' && (
        <div className="tibbna-card">
          <div className="tibbna-card-content">
            <h3 className="text-lg font-semibold mb-4">4 Weeks Summary</h3>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr>
                    <th className="border border-gray-200 bg-gray-50 p-2 text-left font-medium text-gray-900">Date</th>
                    <th className="border border-gray-200 bg-gray-50 p-2 text-left font-medium text-gray-900">Day</th>
                    <th className="border border-gray-200 bg-gray-50 p-2 text-left font-medium text-gray-900">Time</th>
                    <th className="border border-gray-200 bg-gray-50 p-2 text-left font-medium text-gray-900">Hours</th>
                  </tr>
                </thead>
                <tbody>
                  {[0, 1, 2, 3].map((week) => (
                    <React.Fragment key={week}>
                      <tr className="bg-gray-100">
                        <td colSpan={4} className="border border-gray-200 p-2 font-semibold">Week {week + 1}</td>
                      </tr>
                      {generateWeekDates(week).map((date, index) => {
                        const dayOfWeek = date.getDay() || 7;
                        const daySchedule = getDaySchedule(dayOfWeek);
                        const isToday = date.toDateString() === new Date().toDateString();
                        
                        return (
                          <tr key={`${week}-${index}`} className={isToday ? 'bg-blue-50' : ''}>
                            <td className="border border-gray-200 p-2">{date.toLocaleDateString()}</td>
                            <td className="border border-gray-200 p-2">{date.toLocaleDateString('en-US', { weekday: 'short' })}</td>
                            <td className="border border-gray-200 p-2">
                              {daySchedule?.start_time && daySchedule?.end_time 
                                ? `${formatTime(daySchedule.start_time)} - ${formatTime(daySchedule.end_time)}`
                                : '-'}
                            </td>
                            <td className="border border-gray-200 p-2">
                              {daySchedule?.total_work_hours 
                                ? `${parseFloat(String(daySchedule.total_work_hours)).toFixed(1)}h`
                                : '-'}
                            </td>
                          </tr>
                        );
                      })}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 4-Week Summary Stats */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Total Hours (4 Weeks)</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {[0, 1, 2, 3].reduce((total, week) => {
                      return total + generateWeekDates(week).reduce((weekTotal, date) => {
                        const dayOfWeek = date.getDay() || 7;
                        const daySchedule = getDaySchedule(dayOfWeek);
                        return weekTotal + parseFloat(String(daySchedule?.total_work_hours || 0));
                      }, 0);
                    }, 0).toFixed(1)}h
                  </p>
                </div>
                
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Net Hours (4 Weeks)</p>
                  <p className="text-2xl font-bold text-green-600">
                    {[0, 1, 2, 3].reduce((total, week) => {
                      return total + generateWeekDates(week).reduce((weekTotal, date) => {
                        const dayOfWeek = date.getDay() || 7;
                        const daySchedule = getDaySchedule(dayOfWeek);
                        return weekTotal + parseFloat(String(daySchedule?.net_work_hours || 0));
                      }, 0);
                    }, 0).toFixed(1)}h
                  </p>
                </div>
                
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Working Days (4 Weeks)</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {[0, 1, 2, 3].reduce((total, week) => {
                      return total + generateWeekDates(week).filter(date => {
                        const dayOfWeek = date.getDay() || 7;
                        return getDaySchedule(dayOfWeek);
                      }).length;
                    }, 0)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Print Header (hidden in normal view) */}
      <div className="hidden print:block print:mb-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Employee Schedule Report</h1>
          <p className="text-gray-600">
            {schedule.employee_name} - {schedule.department_name}
          </p>
          <p className="text-sm text-gray-500">
            Generated on {new Date().toLocaleDateString()}
          </p>
        </div>
      </div>
    </div>
  );
}
