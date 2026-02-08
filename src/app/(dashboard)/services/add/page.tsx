'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function AddServicePage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    category: 'Consultation',
    specialty: '',
    duration: '',
    cptCode: '',
    icd10Code: '',
    description: '',
    insurancePrice: '',
    selfPayPrice: '',
    governmentPrice: '',
    equipmentNeeded: '',
    suppliesNeeded: '',
    doctorRequired: '1',
    nurseRequired: '0',
    technicianRequired: '0',
    requiresAppointment: true,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Simulate API call
    setTimeout(() => {
      console.log('✅ Service added:', formData);
      alert('Service added successfully! (Demo mode - not saved to database)');
      setIsSubmitting(false);
      router.push('/services');
    }, 1000);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Services
        </Button>
        <h1 className="text-3xl font-bold text-gray-900">Add New Service</h1>
        <p className="text-gray-600 mt-1">Create a new hospital service</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  Service Name *
                </label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="e.g., General Consultation"
                  required
                />
              </div>

              <div>
                <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
                  Category *
                </label>
                <select
                  id="category"
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  className="w-full h-10 px-3 rounded-md border border-gray-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                >
                  <option value="Consultation">Consultation</option>
                  <option value="Diagnostics">Diagnostics</option>
                  <option value="Laboratory">Laboratory</option>
                  <option value="Radiology">Radiology</option>
                  <option value="Therapy">Therapy</option>
                  <option value="Surgery">Surgery</option>
                  <option value="Emergency">Emergency</option>
                  <option value="Dental">Dental</option>
                  <option value="Vaccination">Vaccination</option>
                </select>
              </div>

              <div>
                <label htmlFor="specialty" className="block text-sm font-medium text-gray-700 mb-1">
                  Specialty *
                </label>
                <Input
                  id="specialty"
                  name="specialty"
                  value={formData.specialty}
                  onChange={handleChange}
                  placeholder="e.g., General Medicine"
                  required
                />
              </div>

              <div>
                <label htmlFor="duration" className="block text-sm font-medium text-gray-700 mb-1">
                  Duration (minutes) *
                </label>
                <Input
                  id="duration"
                  name="duration"
                  type="number"
                  value={formData.duration}
                  onChange={handleChange}
                  placeholder="30"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                Description *
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={3}
                className="w-full px-3 py-2 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Describe the service..."
                required
              />
            </div>
          </CardContent>
        </Card>

        {/* Medical Codes */}
        <Card>
          <CardHeader>
            <CardTitle>Medical Codes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="cptCode" className="block text-sm font-medium text-gray-700 mb-1">
                  CPT Code *
                </label>
                <Input
                  id="cptCode"
                  name="cptCode"
                  value={formData.cptCode}
                  onChange={handleChange}
                  placeholder="99213"
                  required
                />
              </div>

              <div>
                <label htmlFor="icd10Code" className="block text-sm font-medium text-gray-700 mb-1">
                  ICD-10 Code *
                </label>
                <Input
                  id="icd10Code"
                  name="icd10Code"
                  value={formData.icd10Code}
                  onChange={handleChange}
                  placeholder="Z00.00"
                  required
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pricing */}
        <Card>
          <CardHeader>
            <CardTitle>Pricing</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label htmlFor="insurancePrice" className="block text-sm font-medium text-gray-700 mb-1">
                  Insurance Price ($) *
                </label>
                <Input
                  id="insurancePrice"
                  name="insurancePrice"
                  type="number"
                  value={formData.insurancePrice}
                  onChange={handleChange}
                  placeholder="150"
                  required
                />
              </div>

              <div>
                <label htmlFor="selfPayPrice" className="block text-sm font-medium text-gray-700 mb-1">
                  Self-Pay Price ($) *
                </label>
                <Input
                  id="selfPayPrice"
                  name="selfPayPrice"
                  type="number"
                  value={formData.selfPayPrice}
                  onChange={handleChange}
                  placeholder="200"
                  required
                />
              </div>

              <div>
                <label htmlFor="governmentPrice" className="block text-sm font-medium text-gray-700 mb-1">
                  Government Price ($) *
                </label>
                <Input
                  id="governmentPrice"
                  name="governmentPrice"
                  type="number"
                  value={formData.governmentPrice}
                  onChange={handleChange}
                  placeholder="100"
                  required
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Resources Required */}
        <Card>
          <CardHeader>
            <CardTitle>Resources Required</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="equipmentNeeded" className="block text-sm font-medium text-gray-700 mb-1">
                  Equipment Needed
                </label>
                <Input
                  id="equipmentNeeded"
                  name="equipmentNeeded"
                  value={formData.equipmentNeeded}
                  onChange={handleChange}
                  placeholder="Comma-separated list"
                />
              </div>

              <div>
                <label htmlFor="suppliesNeeded" className="block text-sm font-medium text-gray-700 mb-1">
                  Supplies Needed
                </label>
                <Input
                  id="suppliesNeeded"
                  name="suppliesNeeded"
                  value={formData.suppliesNeeded}
                  onChange={handleChange}
                  placeholder="Comma-separated list"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label htmlFor="doctorRequired" className="block text-sm font-medium text-gray-700 mb-1">
                  Doctors Required *
                </label>
                <Input
                  id="doctorRequired"
                  name="doctorRequired"
                  type="number"
                  min="0"
                  value={formData.doctorRequired}
                  onChange={handleChange}
                  required
                />
              </div>

              <div>
                <label htmlFor="nurseRequired" className="block text-sm font-medium text-gray-700 mb-1">
                  Nurses Required *
                </label>
                <Input
                  id="nurseRequired"
                  name="nurseRequired"
                  type="number"
                  min="0"
                  value={formData.nurseRequired}
                  onChange={handleChange}
                  required
                />
              </div>

              <div>
                <label htmlFor="technicianRequired" className="block text-sm font-medium text-gray-700 mb-1">
                  Technicians Required *
                </label>
                <Input
                  id="technicianRequired"
                  name="technicianRequired"
                  type="number"
                  min="0"
                  value={formData.technicianRequired}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="flex items-center">
              <input
                id="requiresAppointment"
                name="requiresAppointment"
                type="checkbox"
                checked={formData.requiresAppointment}
                onChange={handleChange}
                className="h-4 w-4 text-primary border-gray-300 rounded focus:ring-primary"
              />
              <label htmlFor="requiresAppointment" className="ml-2 block text-sm text-gray-700">
                Requires Appointment
              </label>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex gap-3 justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="bg-primary hover:bg-primary/90"
          >
            {isSubmitting ? (
              <>Saving...</>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Service
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
