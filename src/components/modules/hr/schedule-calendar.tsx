'use client';

import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Clock, Calendar, Coffee, Utensils } from 'lucide-react';

interface ScheduleCalendarProps {
  onScheduleChange: (schedules: any[]) => void;
  initialSchedules?: any[];
}

export default function ScheduleCalendar({ onScheduleChange, initialSchedules = [] }: ScheduleCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedSchedule, setSelectedSchedule] = useState<any>(null);
  const [schedules, setSchedules] = useState<any[]>(initialSchedules);
  const [editingDay, setEditingDay] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<'month' | 'year'>('month');
  const [bulkEditMode, setBulkEditMode] = useState<'none' | 'week' | 'weekend' | 'month' | 'year'>('none');
  const [bulkSchedule, setBulkSchedule] = useState({
    start_time: '08:00',
    end_time: '16:00',
    lunch_start: '12:00',
    lunch_end: '13:00',
    morning_break_start: '10:00',
    morning_break_end: '10:15',
    afternoon_break_start: '14:00',
    afternoon_break_end: '14:15',
  });

  const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
  const daysInMonth = monthEnd.getDate();
  const startDayOfWeek = monthStart.getDay();

  const calendarDays = useMemo(() => {
    const days = [];
    
    // Add empty cells for days before month starts
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push(null);
    }
    
    // Add all days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }
    
    return days;
  }, [daysInMonth, startDayOfWeek]);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const getScheduleForDay = (day: number) => {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    const dateStr = date.toISOString().split('T')[0];
    return schedules.find(s => s.date === dateStr);
  };

  const handleDayClick = (day: number) => {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    const dateStr = date.toISOString().split('T')[0];
    const existingSchedule = getScheduleForDay(day);
    
    if (existingSchedule) {
      setSelectedSchedule(existingSchedule);
      setEditingDay(day);
    } else {
      setEditingDay(day);
      setSelectedSchedule({
        date: dateStr,
        day_of_week: date.getDay(),
        start_time: '08:00',
        end_time: '16:00',
        lunch_start: '12:00',
        lunch_end: '13:00',
        lunch_duration: 60,
        morning_break_start: '10:00',
        morning_break_end: '10:15',
        afternoon_break_start: '14:00',
        afternoon_break_end: '14:15',
        break_duration: 15,
        total_hours: 8,
        net_hours: 6.5,
        is_active: true,
      });
    }
  };

  const createRegularSchedule = (day: number) => {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    const dateStr = date.toISOString().split('T')[0];
    
    const regularSchedule = {
      date: dateStr,
      day_of_week: date.getDay(),
      start_time: '08:00',
      end_time: '16:00',
      lunch_start: '12:00',
      lunch_end: '13:00',
      lunch_duration: 60,
      morning_break_start: '10:00',
      morning_break_end: '10:15',
      afternoon_break_start: '14:00',
      afternoon_break_end: '14:15',
      break_duration: 15,
      total_hours: 8,
      net_hours: 6.5,
      is_active: true,
    };
    
    const updatedSchedules = schedules.filter(s => s.date !== dateStr);
    updatedSchedules.push(regularSchedule);
    updatedSchedules.sort((a, b) => a.date.localeCompare(b.date));
    
    setSchedules(updatedSchedules);
    onScheduleChange(updatedSchedules);
    setEditingDay(null);
    setSelectedSchedule(null);
  };

  const createNightSchedule = (day: number) => {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    const dateStr = date.toISOString().split('T')[0];
    
    const nightSchedule = {
      date: dateStr,
      day_of_week: date.getDay(),
      start_time: '20:00',
      end_time: '08:00',
      lunch_start: '00:00',
      lunch_end: '01:00',
      lunch_duration: 60,
      morning_break_start: null,
      morning_break_end: null,
      afternoon_break_start: '04:00',
      afternoon_break_end: '04:15',
      break_duration: 15,
      total_hours: 12,
      net_hours: 10.5,
      is_active: true,
    };
    
    const updatedSchedules = schedules.filter(s => s.date !== dateStr);
    updatedSchedules.push(nightSchedule);
    updatedSchedules.sort((a, b) => a.date.localeCompare(b.date));
    
    setSchedules(updatedSchedules);
    onScheduleChange(updatedSchedules);
    setEditingDay(null);
    setSelectedSchedule(null);
  };

  const createAfternoonSchedule = (day: number) => {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    const dateStr = date.toISOString().split('T')[0];
    
    const afternoonSchedule = {
      date: dateStr,
      day_of_week: date.getDay(),
      start_time: '14:00',
      end_time: '22:00',
      lunch_start: '18:00',
      lunch_end: '19:00',
      lunch_duration: 60,
      morning_break_start: null,
      morning_break_end: null,
      afternoon_break_start: '16:00',
      afternoon_break_end: '16:15',
      break_duration: 15,
      total_hours: 8,
      net_hours: 6.5,
      is_active: true,
    };
    
    const updatedSchedules = schedules.filter(s => s.date !== dateStr);
    updatedSchedules.push(afternoonSchedule);
    updatedSchedules.sort((a, b) => a.date.localeCompare(b.date));
    
    setSchedules(updatedSchedules);
    onScheduleChange(updatedSchedules);
    setEditingDay(null);
    setSelectedSchedule(null);
  };

  const applyBulkEdit = () => {
    const newSchedules = [...schedules];
    let startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    let endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

    if (bulkEditMode === 'year') {
      startDate = new Date(currentDate.getFullYear(), 0, 1);
      endDate = new Date(currentDate.getFullYear(), 11, 31);
    }

    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      const dayOfWeek = d.getDay();
      
      let shouldApply = false;
      
      if (bulkEditMode === 'week' && dayOfWeek >= 1 && dayOfWeek <= 5) shouldApply = true;
      if (bulkEditMode === 'weekend' && (dayOfWeek === 0 || dayOfWeek === 6)) shouldApply = true;
      if (bulkEditMode === 'month') shouldApply = true;
      if (bulkEditMode === 'year') shouldApply = true;

      if (shouldApply) {
        const scheduleData = {
          date: dateStr,
          day_of_week: dayOfWeek,
          start_time: bulkSchedule.start_time,
          end_time: bulkSchedule.end_time,
          lunch_start: bulkSchedule.lunch_start,
          lunch_end: bulkSchedule.lunch_end,
          lunch_duration: 60,
          morning_break_start: bulkSchedule.morning_break_start,
          morning_break_end: bulkSchedule.morning_break_end,
          afternoon_break_start: bulkSchedule.afternoon_break_start,
          afternoon_break_end: bulkSchedule.afternoon_break_end,
          break_duration: 15,
          total_hours: 8,
          net_hours: 6.5,
          is_active: true,
        };

        // Remove existing schedule for this date
        const filteredSchedules = newSchedules.filter(s => s.date !== dateStr);
        filteredSchedules.push(scheduleData);
        
        // Sort back to newSchedules
        filteredSchedules.sort((a, b) => a.date.localeCompare(b.date));
        newSchedules.length = 0;
        newSchedules.push(...filteredSchedules);
      }
    }

    setSchedules(newSchedules);
    onScheduleChange(newSchedules);
    setBulkEditMode('none');
  };

  const clearBulkEdit = () => {
    let startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    let endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

    if (bulkEditMode === 'year') {
      startDate = new Date(currentDate.getFullYear(), 0, 1);
      endDate = new Date(currentDate.getFullYear(), 11, 31);
    }

    const newSchedules = schedules.filter(s => {
      const scheduleDate = new Date(s.date);
      return scheduleDate < startDate || scheduleDate > endDate;
    });

    setSchedules(newSchedules);
    onScheduleChange(newSchedules);
    setBulkEditMode('none');
  };

  const saveSchedule = () => {
    if (!selectedSchedule) return;
    
    const updatedSchedules = schedules.filter(s => s.date !== selectedSchedule.date);
    updatedSchedules.push(selectedSchedule);
    updatedSchedules.sort((a, b) => a.date.localeCompare(b.date));
    
    setSchedules(updatedSchedules);
    onScheduleChange(updatedSchedules);
    setSelectedSchedule(null);
    setEditingDay(null);
  };

  const deleteSchedule = () => {
    if (!selectedSchedule) return;
    
    const updatedSchedules = schedules.filter(s => s.date !== selectedSchedule.date);
    setSchedules(updatedSchedules);
    onScheduleChange(updatedSchedules);
    setSelectedSchedule(null);
    setEditingDay(null);
  };

  const navigateMonth = (direction: number) => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + direction, 1));
  };

  const getScheduleType = (schedule: any) => {
    if (!schedule) return 'empty';
    if (schedule.start_time === '08:00' && schedule.end_time === '16:00') return 'regular';
    if (schedule.start_time === '20:00' || schedule.end_time === '08:00') return 'night';
    if (schedule.start_time === '14:00' && schedule.end_time === '22:00') return 'afternoon';
    return 'custom';
  };

  const getScheduleColor = (type: string) => {
    switch (type) {
      case 'regular': return '#3B82F6';
      case 'night': return '#6366F1';
      case 'afternoon': return '#8B5CF6';
      case 'custom': return '#F59E0B';
      default: return '#E5E7EB';
    }
  };

  return (
    <div className="schedule-calendar">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigateMonth(-1)}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ChevronLeft size={20} />
          </button>
          <h3 className="text-lg font-semibold">
            {viewMode === 'month' 
              ? `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`
              : `${currentDate.getFullYear()}`
            }
          </h3>
          <button
            onClick={() => navigateMonth(1)}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ChevronRight size={20} />
          </button>
        </div>
        
        {/* View Mode Toggle */}
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setViewMode('month')}
            className={`px-3 py-1 text-sm rounded ${viewMode === 'month' ? 'bg-white shadow-sm' : 'text-gray-600'}`}
          >
            Month
          </button>
          <button
            onClick={() => setViewMode('year')}
            className={`px-3 py-1 text-sm rounded ${viewMode === 'year' ? 'bg-white shadow-sm' : 'text-gray-600'}`}
          >
            Year
          </button>
        </div>
      </div>

      {/* Bulk Editing Tools */}
      <div className="mb-4">
        {bulkEditMode === 'none' ? (
          <div className="flex flex-wrap gap-2 p-3 bg-gray-50 rounded-lg">
            <span className="text-sm font-medium">Bulk Edit:</span>
            <button
              onClick={() => setBulkEditMode('week')}
              className="text-xs px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Weekdays
            </button>
            <button
              onClick={() => setBulkEditMode('weekend')}
              className="text-xs px-2 py-1 bg-green-500 text-white rounded hover:bg-green-600"
            >
              Weekends
            </button>
            <button
              onClick={() => setBulkEditMode('month')}
              className="text-xs px-2 py-1 bg-purple-500 text-white rounded hover:bg-purple-600"
            >
              {viewMode === 'month' ? 'Month' : 'Current Month'}
            </button>
            <button
              onClick={() => setBulkEditMode('year')}
              className="text-xs px-2 py-1 bg-orange-500 text-white rounded hover:bg-orange-600"
            >
              Year
            </button>
            <button
              onClick={() => {
                setSchedules([]);
                onScheduleChange([]);
                setEditingDay(null);
                setSelectedSchedule(null);
              }}
              className="text-xs px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600"
            >
              Clear All
            </button>
          </div>
        ) : (
          <div className="p-4 border rounded-lg bg-blue-50">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold">
                Bulk Edit: {bulkEditMode === 'week' ? 'Weekdays' : bulkEditMode === 'weekend' ? 'Weekends' : bulkEditMode === 'month' ? 'Month' : 'Year'}
              </h4>
              <button
                onClick={() => setBulkEditMode('none')}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-3">
              <div>
                <label className="text-xs font-medium">Start Time</label>
                <input
                  type="time"
                  value={bulkSchedule.start_time}
                  onChange={(e) => setBulkSchedule({...bulkSchedule, start_time: e.target.value})}
                  className="w-full p-1 text-xs border rounded"
                />
              </div>
              <div>
                <label className="text-xs font-medium">End Time</label>
                <input
                  type="time"
                  value={bulkSchedule.end_time}
                  onChange={(e) => setBulkSchedule({...bulkSchedule, end_time: e.target.value})}
                  className="w-full p-1 text-xs border rounded"
                />
              </div>
              <div>
                <label className="text-xs font-medium">Lunch Start</label>
                <input
                  type="time"
                  value={bulkSchedule.lunch_start}
                  onChange={(e) => setBulkSchedule({...bulkSchedule, lunch_start: e.target.value})}
                  className="w-full p-1 text-xs border rounded"
                />
              </div>
              <div>
                <label className="text-xs font-medium">Lunch End</label>
                <input
                  type="time"
                  value={bulkSchedule.lunch_end}
                  onChange={(e) => setBulkSchedule({...bulkSchedule, lunch_end: e.target.value})}
                  className="w-full p-1 text-xs border rounded"
                />
              </div>
              <div>
                <label className="text-xs font-medium">Morning Break</label>
                <input
                  type="time"
                  value={bulkSchedule.morning_break_start}
                  onChange={(e) => setBulkSchedule({...bulkSchedule, morning_break_start: e.target.value})}
                  className="w-full p-1 text-xs border rounded"
                />
              </div>
              <div>
                <label className="text-xs font-medium">Afternoon Break</label>
                <input
                  type="time"
                  value={bulkSchedule.afternoon_break_start}
                  onChange={(e) => setBulkSchedule({...bulkSchedule, afternoon_break_start: e.target.value})}
                  className="w-full p-1 text-xs border rounded"
                />
              </div>
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={applyBulkEdit}
                className="text-xs px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Apply to {bulkEditMode === 'week' ? 'Weekdays' : bulkEditMode === 'weekend' ? 'Weekends' : bulkEditMode === 'month' ? 'Month' : 'Year'}
              </button>
              <button
                onClick={clearBulkEdit}
                className="text-xs px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
              >
                Clear {bulkEditMode === 'week' ? 'Weekdays' : bulkEditMode === 'weekend' ? 'Weekends' : bulkEditMode === 'month' ? 'Month' : 'Year'}
              </button>
              <button
                onClick={() => setBulkEditMode('none')}
                className="text-xs px-3 py-1 border border-gray-300 rounded hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Calendar Grid */}
      <div className="mb-6">
        {/* Day headers */}
        <div className="grid grid-cols-7 gap-2 mb-2">
          {dayNames.map(day => (
            <div key={day} className="text-center text-sm font-medium text-gray-600">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar days */}
        <div className="grid grid-cols-7 gap-2">
          {calendarDays.map((day, index) => {
            if (day === null) {
              return <div key={`empty-${index}`} className="h-20" />;
            }

            const schedule = getScheduleForDay(day);
            const scheduleType = getScheduleType(schedule);
            const isToday = new Date().toDateString() === new Date(currentDate.getFullYear(), currentDate.getMonth(), day).toDateString();

            return (
              <div
                key={day}
                className={`h-auto border rounded-lg p-2 transition-colors ${
                  isToday ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                }`}
              >
                <div className="text-sm font-medium mb-2">{day}</div>
                
                {!schedule && !editingDay && (
                  <div className="space-y-1">
                    {/* Fast creation buttons */}
                    <div className="flex gap-1">
                      <button
                        onClick={(e) => { e.stopPropagation(); createRegularSchedule(day); }}
                        className="text-xs px-1 py-0.5 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                        title="Regular Shift (8:00-16:00)"
                      >
                        8-16
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); createNightSchedule(day); }}
                        className="text-xs px-1 py-0.5 bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200"
                        title="Night Shift (20:00-8:00)"
                      >
                        20-8
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); createAfternoonSchedule(day); }}
                        className="text-xs px-1 py-0.5 bg-purple-100 text-purple-700 rounded hover:bg-purple-200"
                        title="Afternoon Shift (14:00-22:00)"
                      >
                        14-22
                      </button>
                    </div>
                    <button
                      onClick={() => handleDayClick(day)}
                      className="text-xs text-gray-500 hover:text-gray-700 w-full"
                      title="Custom Schedule"
                    >
                      + Custom
                    </button>
                  </div>
                )}

                {schedule && !editingDay && (
                  <div className="space-y-1">
                    <div
                      className="text-xs px-1 py-0.5 rounded text-white text-center cursor-pointer hover:opacity-80"
                      style={{ backgroundColor: getScheduleColor(scheduleType) }}
                      onClick={() => handleDayClick(day)}
                      title="Click to edit"
                    >
                      {schedule.start_time} - {schedule.end_time}
                    </div>
                    <div className="flex gap-1">
                      {schedule.lunch_start && (
                        <div className="text-xs bg-orange-100 text-orange-700 px-1 rounded" title="Lunch">
                          <Utensils size={10} />
                        </div>
                      )}
                      {schedule.morning_break_start && (
                        <div className="text-xs bg-green-100 text-green-700 px-1 rounded" title="Break">
                          <Coffee size={10} />
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {editingDay === day && selectedSchedule && (
                  <div className="border rounded-lg p-2 bg-gray-50 space-y-2">
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar size={14} />
                      <span className="text-sm font-semibold">
                        {new Date(selectedSchedule.date).toLocaleDateString()}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-1">
                      <div>
                        <label className="text-xs font-medium">Start</label>
                        <input
                          type="time"
                          value={selectedSchedule.start_time}
                          onChange={(e) => setSelectedSchedule({...selectedSchedule, start_time: e.target.value})}
                          className="w-full p-1 text-xs border rounded"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium">End</label>
                        <input
                          type="time"
                          value={selectedSchedule.end_time}
                          onChange={(e) => setSelectedSchedule({...selectedSchedule, end_time: e.target.value})}
                          className="w-full p-1 text-xs border rounded"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium">Lunch</label>
                        <input
                          type="time"
                          value={selectedSchedule.lunch_start || ''}
                          onChange={(e) => setSelectedSchedule({...selectedSchedule, lunch_start: e.target.value})}
                          className="w-full p-1 text-xs border rounded"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium">End</label>
                        <input
                          type="time"
                          value={selectedSchedule.lunch_end || ''}
                          onChange={(e) => setSelectedSchedule({...selectedSchedule, lunch_end: e.target.value})}
                          className="w-full p-1 text-xs border rounded"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium">Break</label>
                        <input
                          type="time"
                          value={selectedSchedule.morning_break_start || ''}
                          onChange={(e) => setSelectedSchedule({...selectedSchedule, morning_break_start: e.target.value})}
                          className="w-full p-1 text-xs border rounded"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium">End</label>
                        <input
                          type="time"
                          value={selectedSchedule.morning_break_end || ''}
                          onChange={(e) => setSelectedSchedule({...selectedSchedule, morning_break_end: e.target.value})}
                          className="w-full p-1 text-xs border rounded"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                    </div>

                    <div className="flex gap-1">
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteSchedule(); }}
                        className="text-xs px-2 py-1 text-red-600 border border-red-300 rounded hover:bg-red-50"
                      >
                        Delete
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setEditingDay(null); setSelectedSchedule(null); }}
                        className="text-xs px-2 py-1 border border-gray-300 rounded hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); saveSchedule(); }}
                        className="text-xs px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      
      {/* Legend */}
      <div className="flex flex-wrap gap-4 mt-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: '#3B82F6' }}></div>
          <span>Regular (8:00-16:00)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: '#6366F1' }}></div>
          <span>Night Shift</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: '#8B5CF6' }}></div>
          <span>Afternoon (14:00-22:00)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: '#F59E0B' }}></div>
          <span>Custom</span>
        </div>
      </div>
    </div>
  );
}
