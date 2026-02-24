'use client';

import { useState, useEffect } from 'react';
import { Calendar, Clock, X } from 'lucide-react';

interface BookedSlot {
  appointmentId: string;
  startTime: string;
  endTime: string;
  status: string;
  date: string;
  timeSlot: {
    start: Date;
    end: Date;
  };
}

interface AppointmentCalendarProps {
  doctorId?: string;
  onTimeSelect: (dateTime: string) => void;
  selectedDateTime?: string;
}

export function AppointmentCalendar({ doctorId, onTimeSelect, selectedDateTime }: AppointmentCalendarProps) {
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [bookedSlots, setBookedSlots] = useState<BookedSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);

  // Generate time slots (30-minute intervals from 8 AM to 8 PM)
  const generateTimeSlots = () => {
    const slots = [];
    for (let hour = 8; hour <= 19; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        slots.push(time);
      }
    }
    return slots;
  };

  const timeSlots = generateTimeSlots();

  // Fetch booked slots when doctor is selected
  useEffect(() => {
    if (doctorId) {
      fetchBookedSlots();
    }
  }, [doctorId]);

  // Generate available slots when date or booked slots change
  useEffect(() => {
    if (selectedDate && bookedSlots.length > 0) {
      generateAvailableSlots();
    }
  }, [selectedDate, bookedSlots]);

  const fetchBookedSlots = async () => {
    if (!doctorId) return;
    
    setLoading(true);
    try {
      const response = await fetch(`/api/doctor-availability?doctorid=${doctorId}`);
      if (response.ok) {
        const data = await response.json();
        setBookedSlots(data.bookedSlots || []);
      }
    } catch (error) {
      console.error('Error fetching booked slots:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateAvailableSlots = () => {
    if (!selectedDate) return;

    const bookedForDate = bookedSlots.filter(slot => slot.date === selectedDate);
    const available = timeSlots.filter(timeSlot => {
      const slotDateTime = new Date(`${selectedDate}T${timeSlot}:00`);
      const slotEndTime = new Date(slotDateTime.getTime() + 30 * 60000); // 30 minutes later

      // Check if this slot overlaps with any booked slot
      return !bookedForDate.some(booked => {
        const bookedStart = new Date(booked.startTime);
        const bookedEnd = new Date(booked.endTime);
        
        return (
          (slotDateTime >= bookedStart && slotDateTime < bookedEnd) ||
          (slotEndTime > bookedStart && slotEndTime <= bookedEnd) ||
          (slotDateTime <= bookedStart && slotEndTime >= bookedEnd)
        );
      });
    });

    setAvailableSlots(available);
  };

  const handleDateSelect = (date: string) => {
    setSelectedDate(date);
  };

  const handleTimeSelect = (time: string) => {
    const dateTime = `${selectedDate}T${time}:00`;
    onTimeSelect(dateTime);
  };

  const isTimeBooked = (time: string) => {
    if (!selectedDate) return false;
    
    const slotDateTime = new Date(`${selectedDate}T${time}:00`);
    const slotEndTime = new Date(slotDateTime.getTime() + 30 * 60000);

    return bookedSlots.some(booked => {
      if (booked.date !== selectedDate) return false;
      
      const bookedStart = new Date(booked.startTime);
      const bookedEnd = new Date(booked.endTime);
      
      return (
        (slotDateTime >= bookedStart && slotDateTime < bookedEnd) ||
        (slotEndTime > bookedStart && slotEndTime <= bookedEnd) ||
        (slotDateTime <= bookedStart && slotEndTime >= bookedEnd)
      );
    });
  };

  const getMinDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  const getMaxDate = () => {
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + 30);
    return maxDate.toISOString().split('T')[0];
  };

  return (
    <div className="space-y-4">
      {/* Date Selection */}
      <div className="space-y-2">
        <label className="text-sm font-medium flex items-center gap-2">
          <Calendar size={16} />
          Select Date
        </label>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => handleDateSelect(e.target.value)}
          min={getMinDate()}
          max={getMaxDate()}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Time Slots */}
      {selectedDate && (
        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center gap-2">
            <Clock size={16} />
            Available Time Slots
          </label>
          
          {loading ? (
            <div className="text-center py-4 text-gray-500">
              Loading availability...
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto">
              {timeSlots.map((timeSlot) => {
                const isBooked = isTimeBooked(timeSlot);
                const isSelected = selectedDateTime === `${selectedDate}T${timeSlot}:00`;
                
                return (
                  <button
                    key={timeSlot}
                    onClick={() => !isBooked && handleTimeSelect(timeSlot)}
                    disabled={isBooked}
                    className={`px-3 py-2 text-sm rounded-md border transition-colors ${
                      isBooked
                        ? 'bg-red-100 border-red-300 text-red-600 cursor-not-allowed'
                        : isSelected
                        ? 'bg-blue-600 border-blue-600 text-white'
                        : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-blue-400'
                    }`}
                  >
                    {isBooked ? (
                      <span className="flex items-center justify-center gap-1">
                        <X size={12} />
                        {timeSlot}
                      </span>
                    ) : (
                      timeSlot
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Selected Time Display */}
      {selectedDateTime && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
          <p className="text-sm text-blue-800">
            <strong>Selected:</strong> {new Date(selectedDateTime).toLocaleString()}
          </p>
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-gray-600">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-white border border-gray-300 rounded"></div>
          <span>Available</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-red-100 border border-red-300 rounded"></div>
          <span>Booked</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-blue-600 border border-blue-600 rounded"></div>
          <span>Selected</span>
        </div>
      </div>
    </div>
  );
}
