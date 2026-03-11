'use client';

import { useState, useEffect } from 'react';
import { Calendar, Clock, MapPin, User, Stethoscope, Plus, Filter, X, Edit, Trash2, Search } from 'lucide-react';
import { AppointmentCalendar } from '@/components/calendar/appointment-calendar';

type Appointment = {
  appointmentid: string;
  workspaceid: string;
  patientid: string;
  doctorid?: string | null;
  appointmentname: string;
  appointmenttype: string;
  clinicalindication?: string | null;
  reasonforrequest?: string | null;
  description?: string | null;
  starttime: string;
  endtime: string;
  location?: string | null;
  unit?: string | null;
  status: 'scheduled' | 'checked_in' | 'in_progress' | 'completed' | 'cancelled';
  notes?: any;
  // Patient data from JOIN
  firstname?: string;
  middlename?: string | null;
  lastname?: string;
  nationalid?: string | null;
  phone?: string | null;
  email?: string | null;
  // Doctor data from JOIN
  doctor_firstname?: string;
  doctor_middlename?: string | null;
  doctor_lastname?: string;
  doctor_role?: string | null;
  createdat?: string;
  updatedat?: string;
};

type Doctor = {
  id: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  email: string;
  unit?: string;
  specialty?: string;
  phone?: string;
  role: string;
  customStaffId?: string;
};

type Patient = {
  id: string;
  patientNumber?: string;
  firstNameAr: string;
  firstNameEn: string;
  middleName?: string;
  lastNameAr: string;
  lastNameEn: string;
  fullNameAr: string;
  fullNameEn: string;
  dateOfBirth?: string;
  age?: number;
  gender: string;
  bloodGroup?: string;
  nationalId?: string;
  phone?: string;
  mobile?: string;
  email?: string;
  address?: string;
  createdAt?: string;
};

const statusConfig = {
  scheduled: { 
    label: "Scheduled", 
    color: "bg-blue-50 text-blue-700 border-blue-300",
  },
  checked_in: { 
    label: "Checked In", 
    color: "bg-green-50 text-green-700 border-green-300",
  },
  in_progress: { 
    label: "In Progress", 
    color: "bg-amber-50 text-amber-700 border-amber-400",
  },
  completed: { 
    label: "Completed", 
    color: "bg-emerald-50 text-emerald-700 border-emerald-300",
  },
  cancelled: { 
    label: "Cancelled", 
    color: "bg-red-50 text-red-700 border-red-300",
  },
};

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'today' | 'upcoming' | 'past'>('all');
  const [showDialog, setShowDialog] = useState(false);
  const [showPatientDropdown, setShowPatientDropdown] = useState(false);
  const [patientSearchTerm, setPatientSearchTerm] = useState('');
  const [doctorSearchTerm, setDoctorSearchTerm] = useState('');
  const [showDoctorDropdown, setShowDoctorDropdown] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [formData, setFormData] = useState({
    patientid: '',
    doctorid: '',
    starttime: '',
    appointmentname: 'new_patient',
    appointmenttype: 'visiting',
    clinicalindication: '',
    reasonforrequest: '',
    unit: '',
    location: '',
  });
  
  // Use the same workspace ID as the tibbna GitHub app
  const workspaceid = 'fa9fb036-a7eb-49af-890c-54406dad139d';

  useEffect(() => {
    loadAppointments();
    loadDoctors();
    loadPatients();
  }, []);

  const loadAppointments = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/appointments?workspaceid=${workspaceid}`);
      if (response.ok) {
        const data = await response.json();
        setAppointments(data.data || []);
      } else {
        // API doesn't exist yet, set empty appointments array
        console.log('Appointments API not available - using empty array');
        setAppointments([]);
      }
    } catch (error) {
      console.error('Error loading appointments:', error);
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  };

  const loadDoctors = async () => {
    try {
      const response = await fetch(`/api/staff`);
      if (response.ok) {
        const data = await response.json();
        setDoctors(data.staff || []);
        if (data.message) {
          console.log('Doctors API message:', data.message);
        }
      }
    } catch (error) {
      console.error('Error loading doctors:', error);
    }
  };

  const loadPatients = async () => {
    try {
      // Load all patients initially (empty search query)
      const response = await fetch(`/api/tibbna-openehr-patients`);
      if (response.ok) {
        const data = await response.json();
        setPatients(data.data || []);
      }
    } catch (error) {
      console.error('Error loading patients:', error);
    }
  };

  const handleCreateAppointment = async () => {
    try {
      if (!formData.patientid || !formData.starttime) {
        alert('Please fill in required fields: Patient and Date/Time');
        return;
      }

      const startDate = new Date(formData.starttime);
      const endDate = new Date(startDate.getTime() + 45 * 60000); // 45 minutes later

      const response = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceid,
          patientid: formData.patientid,
          doctorid: formData.doctorid || null,
          starttime: startDate.toISOString(),
          endtime: endDate.toISOString(),
          appointmentname: formData.appointmentname,
          appointmenttype: formData.appointmenttype,
          clinicalindication: formData.clinicalindication || null,
          reasonforrequest: formData.reasonforrequest || null,
          unit: formData.unit || null,
          location: formData.location || null,
          status: 'scheduled',
        }),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setShowDialog(false);
          setPatientSearchTerm('');
          setFormData({
            patientid: '',
            doctorid: '',
            starttime: '',
            appointmentname: 'new_patient',
            appointmenttype: 'visiting',
            clinicalindication: '',
            reasonforrequest: '',
            unit: '',
            location: '',
          });
          loadAppointments();
          alert(result.message || 'Appointment created successfully!');
        } else {
          alert(`Failed to create appointment: ${result.error || 'Unknown error'}`);
        }
      } else {
        const error = await response.json();
        alert(`Failed to create appointment: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error creating appointment:', error);
      alert('Failed to create appointment');
    }
  };

  const handlePatientSearch = async (searchTerm: string) => {
    setPatientSearchTerm(searchTerm);
    
    if (searchTerm.length >= 2) {
      setShowPatientDropdown(true);
      try {
        console.log('Searching patients with term:', searchTerm);
        const response = await fetch(`/api/tibbna-openehr-patients?search=${encodeURIComponent(searchTerm)}`);
        if (response.ok) {
          const data = await response.json();
          console.log('Patients found:', data.data?.length || 0);
          setPatients(data.data || []);
        } else {
          console.error('Search failed:', response.status);
          setPatients([]);
        }
      } catch (error) {
        console.error('Error searching patients:', error);
        setPatients([]);
      }
    } else if (searchTerm.length === 0) {
      // Load all patients when search is cleared
      setShowPatientDropdown(false);
      loadPatients();
    } else {
      // Hide dropdown for single character searches
      setShowPatientDropdown(false);
      setPatients([]);
    }
  };

  const selectPatient = (patient: Patient) => {
    console.log('selectPatient called with:', patient);
    
    // Update form with patient ID
    setFormData(prev => ({ 
      ...prev, 
      patientid: patient.id 
    }));
    
    // Update search term with patient info
    const displayName = `${patient.firstNameAr} ${patient.lastNameAr} - ${patient.nationalId || 'No ID'}`;
    setPatientSearchTerm(displayName);
    
    // Hide dropdown
    setShowPatientDropdown(false);
    
    console.log('Form updated with patient ID:', patient.id);
    console.log('Search term updated to:', displayName);
    console.log('Current form data:', { ...formData, patientid: patient.id });
  };

  // Patients are now filtered on the server side, so we can use them directly
  const filteredPatients = patients;

  const formatDateTime = (datetime: string) => {
    try {
      const date = new Date(datetime);
      return {
        date: date.toLocaleDateString(),
        time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
    } catch {
      return { date: 'Unknown', time: 'Unknown' };
    }
  };

  // Click outside handler for dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showPatientDropdown && !(event.target as Element).closest('.patient-search-container')) {
        setShowPatientDropdown(false);
      }
      if (showDoctorDropdown && !(event.target as Element).closest('.doctor-search-container')) {
        setShowDoctorDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showPatientDropdown, showDoctorDropdown]);

  const filterAppointments = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return appointments.filter((appt) => {
      const apptDate = new Date(appt.starttime);

      // Time-based filtering
      let timeMatch = true;
      switch (filter) {
        case 'today':
          timeMatch = apptDate >= today && apptDate < tomorrow;
          break;
        case 'upcoming':
          timeMatch = apptDate >= now;
          break;
        case 'past':
          timeMatch = apptDate < now;
          break;
        default:
          timeMatch = true;
      }

      // Doctor-based filtering
      let doctorMatch = true;
      if (selectedDoctor) {
        const doctorFullName = `${appt.doctor_firstname || ''} ${appt.doctor_middlename || ''} ${appt.doctor_lastname || ''}`.trim().toLowerCase();
        const searchDoctorName = `${selectedDoctor.firstName} ${selectedDoctor.middleName || ''} ${selectedDoctor.lastName}`.trim().toLowerCase();
        doctorMatch = doctorFullName.includes(searchDoctorName.toLowerCase()) || 
                    (appt.doctorid === selectedDoctor.id);
      }

      return timeMatch && doctorMatch;
    });
  };

  const filteredAppointments = filterAppointments();

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Appointments</h1>
          <p className="text-sm text-gray-600 mt-1">
            Manage patient appointments and schedules
          </p>
        </div>
        <button 
          onClick={() => setShowDialog(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={20} />
          <span>New Appointment</span>
        </button>
      </div>

      {/* Filter Buttons */}
      <div className="flex flex-wrap gap-2 items-center">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === 'all'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          All
        </button>
        <button
          onClick={() => setFilter('today')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === 'today'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Today
        </button>
        <button
          onClick={() => setFilter('upcoming')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === 'upcoming'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Upcoming
        </button>
        <button
          onClick={() => setFilter('past')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === 'past'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Past
        </button>
        
        {/* Doctor Search Input */}
        <div className="relative doctor-search-container">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 z-10" />
            <input
              type="text"
              placeholder="Select medical staff (optional)"
              value={selectedDoctor ? `${selectedDoctor.firstName} ${selectedDoctor.middleName || ''} ${selectedDoctor.lastName}`.trim() + ` - ${selectedDoctor.role}` : doctorSearchTerm}
              onChange={(e) => {
                setDoctorSearchTerm(e.target.value);
                setShowDoctorDropdown(true);
                if (!e.target.value) {
                  setSelectedDoctor(null);
                }
              }}
              onFocus={() => setShowDoctorDropdown(true)}
              className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {selectedDoctor && (
              <button
                type="button"
                onClick={() => {
                  setSelectedDoctor(null);
                  setDoctorSearchTerm('');
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X size={16} />
              </button>
            )}
          </div>
          
          {/* Doctor Dropdown */}
          {showDoctorDropdown && doctorSearchTerm && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
              {doctors
                .filter(doctor => {
                  const searchLower = doctorSearchTerm.toLowerCase();
                  const fullName = `${doctor.firstName} ${doctor.middleName || ''} ${doctor.lastName}`.toLowerCase();
                  const roleMatch = doctor.role.toLowerCase().includes(searchLower);
                  return fullName.includes(searchLower) || roleMatch;
                })
                .map(doctor => (
                  <button
                    key={doctor.id}
                    type="button"
                    onClick={() => {
                      setSelectedDoctor(doctor);
                      setDoctorSearchTerm('');
                      setShowDoctorDropdown(false);
                    }}
                    className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b last:border-b-0 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-sm">
                          {doctor.firstName} {doctor.middleName && doctor.middleName + ' '}{doctor.lastName}
                        </div>
                        <div className="text-xs text-gray-500">{doctor.role}</div>
                      </div>
                    </div>
                  </button>
                ))}
              {doctors.filter(doctor => {
                const searchLower = doctorSearchTerm.toLowerCase();
                const fullName = `${doctor.firstName} ${doctor.middleName || ''} ${doctor.lastName}`.toLowerCase();
                const roleMatch = doctor.role.toLowerCase().includes(searchLower);
                return fullName.includes(searchLower) || roleMatch;
              }).length === 0 && (
                <div className="px-4 py-3 text-sm text-gray-500">
                  No doctors found
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Appointments Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6">
          <h2 className="text-lg font-semibold mb-4">
            {filteredAppointments.length} Appointment{filteredAppointments.length !== 1 ? 's' : ''}
          </h2>
          
          {loading ? (
            <p className="text-sm text-gray-500">Loading appointments...</p>
          ) : filteredAppointments.length === 0 ? (
            <p className="text-sm text-gray-500">No appointments found</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Date & Time</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Patient</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Doctor</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Type</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Clinical Indication</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Location</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Unit</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAppointments.map((appt) => {
                    const { date, time } = formatDateTime(appt.starttime);
                    const statusInfo = statusConfig[appt.status];
                    
                    return (
                      <tr key={appt.appointmentid} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <Calendar size={16} className="text-gray-400" />
                            <div>
                              <div className="font-medium text-sm">{date}</div>
                              <div className="text-xs text-gray-500">{time}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <User size={16} className="text-gray-400" />
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {appt.firstname && appt.lastname 
                                  ? `${appt.firstname} ${appt.middlename ? appt.middlename + ' ' : ''}${appt.lastname}`
                                  : 'Unknown Patient'}
                              </div>
                              <div className="text-xs text-gray-500">
                                {appt.patientid ? appt.patientid.slice(0, 8) + '...' : ''}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <User size={16} className="text-gray-400" />
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {appt.doctor_firstname && appt.doctor_lastname 
                                  ? `${appt.doctor_firstname} ${appt.doctor_middlename ? appt.doctor_middlename + ' ' : ''}${appt.doctor_lastname}`
                                  : 'Unknown Doctor'}
                              </div>
                              <div className="text-xs text-gray-500">
                                {appt.doctor_role || 'Staff'}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-sm capitalize text-gray-700">
                            {appt.appointmenttype ? appt.appointmenttype.replace(/_/g, ' ') : '-'}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-sm text-gray-700">
                            {appt.clinicalindication || '-'}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <MapPin size={16} className="text-gray-400" />
                            <span className="text-sm text-gray-700">{appt.location || '-'}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-sm text-gray-700">{appt.unit || '-'}</span>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full border ${statusInfo.color}`}>
                            {statusInfo.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Appointment Creation Dialog */}
      {showDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-[65vw] max-h-[90vh] overflow-y-auto w-full">
            <div className="p-6">
              {/* Dialog Header */}
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-semibold">Add New Appointment</h2>
                  <p className="text-sm text-gray-600 mt-1">Schedule a new appointment for a patient</p>
                </div>
                <button
                  onClick={() => {
                    setShowDialog(false);
                    setPatientSearchTerm('');
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X size={24} />
                </button>
              </div>

              {/* Form */}
              <div className="space-y-4">
                {/* Patient Selection - Searchable */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Patient *</label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search patients..."
                      value={patientSearchTerm}
                      onChange={(e) => handlePatientSearch(e.target.value)}
                      onFocus={() => {
                        setShowPatientDropdown(true);
                        console.log('Input focused - showing dropdown');
                      }}
                      onBlur={() => {
                        // Give click event time to fire before hiding dropdown
                        setTimeout(() => {
                          setShowPatientDropdown(false);
                          console.log('Input blurred - hiding dropdown');
                        }, 150);
                      }}
                      className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <User size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    
                    {/* Debug Info - Remove in production */}
                    <div className="absolute top-full mt-1 text-xs text-gray-500 bg-yellow-50 p-1 rounded z-20">
                      Search: "{patientSearchTerm}" | Dropdown: {showPatientDropdown ? 'visible' : 'hidden'} | Patients: {filteredPatients.length}
                    </div>
                    <div className="absolute top-full mt-8 text-xs text-blue-500 bg-blue-50 p-1 rounded z-20">
                      Form Patient ID: {formData.patientid || 'Not set'}
                    </div>
                    
                    {/* Patient Search Results Dropdown */}
                    {showPatientDropdown && patientSearchTerm && patientSearchTerm.length >= 2 && (
                      <div className="absolute z-10 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto mt-1">
                        {filteredPatients.length === 0 ? (
                          <div className="p-3 text-sm text-gray-500">No patients found</div>
                        ) : (
                          filteredPatients.map((patient) => (
                            <div
                              key={patient.id}
                              onMouseDown={(e) => {
                                e.preventDefault(); // Prevent blur event
                                console.log('Patient mouse down:', patient);
                                selectPatient(patient);
                              }}
                              className="p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                            >
                              <div className="font-medium text-sm">
                                {patient.firstNameAr} {patient.middleName || ''} {patient.lastNameAr}
                              </div>
                              <div className="text-xs text-gray-500">
                                ID: {patient.nationalId || 'No ID'} | Phone: {patient.phone || 'No phone'}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Doctor Selection */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Medical Staff (Optional)</label>
                  <div className="relative">
                    <select
                      value={formData.doctorid}
                      onChange={(e) => setFormData({ ...formData, doctorid: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select medical staff (optional)</option>
                      {doctors.map((doctor) => (
                        <option 
                          key={doctor.id} 
                          value={doctor.id}
                        >
                          {doctor.firstName} {doctor.lastName} - {doctor.role.charAt(0).toUpperCase() + doctor.role.slice(1).replace('_', ' ')}{doctor.unit ? ` (${doctor.unit})` : ''}
                        </option>
                      ))}
                    </select>
                    <Stethoscope size={16} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" />
                  </div>
                  {doctors.length === 0 && (
                    <p className="text-xs text-gray-500">Loading medical staff...</p>
                  )}
                  {doctors.length > 0 && (
                    <p className="text-xs text-gray-500">
                      Only staff with user accounts can be assigned to appointments
                    </p>
                  )}
                </div>

                {/* Date & Time Selection */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Date & Time *</label>
                  <AppointmentCalendar
                    doctorId={formData.doctorid || undefined}
                    onTimeSelect={(dateTime) => setFormData({ ...formData, starttime: dateTime })}
                    selectedDateTime={formData.starttime}
                  />
                  <p className="text-xs text-gray-500">Duration: 45 minutes</p>
                </div>

                {/* Appointment Name */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Appointment Name *</label>
                  <select
                    value={formData.appointmentname}
                    onChange={(e) => setFormData({ ...formData, appointmentname: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="new_patient">New Patient</option>
                    <option value="re_visit">Re-visit</option>
                    <option value="follow_up">Follow-up</option>
                  </select>
                </div>

                {/* Appointment Type */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Appointment Type *</label>
                  <select
                    value={formData.appointmenttype}
                    onChange={(e) => setFormData({ ...formData, appointmenttype: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="visiting">Visiting</option>
                    <option value="video_call">Video Call</option>
                    <option value="home_visit">Home Visit</option>
                  </select>
                </div>

                {/* Clinical Indication */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Clinical Indication</label>
                  <input
                    type="text"
                    value={formData.clinicalindication}
                    onChange={(e) => setFormData({ ...formData, clinicalindication: e.target.value })}
                    placeholder="e.g., Chest pain, Diabetes follow-up"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Reason for Request */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Reason for Request</label>
                  <textarea
                    value={formData.reasonforrequest}
                    onChange={(e) => setFormData({ ...formData, reasonforrequest: e.target.value })}
                    placeholder="Describe the reason for this appointment..."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Unit/Department */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Unit/Department</label>
                  <input
                    type="text"
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    placeholder="e.g., Cardiology, General Medicine"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Location */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Location</label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="e.g., Room 101, Building A"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Dialog Footer */}
              <div className="flex justify-end gap-2 mt-6">
                <button
                  onClick={() => {
                    setShowDialog(false);
                    setPatientSearchTerm('');
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateAppointment}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  Create Appointment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
