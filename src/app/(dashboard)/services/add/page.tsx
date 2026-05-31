'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function AddServicePage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [providers, setProviders] = useState<Array<{company_id?: string, id?: string, company_name?: string, name?: string}>>([]);
  const [departments, setDepartments] = useState<Array<{id: string, name: string, description?: string}>>([]);
  const [formData, setFormData] = useState({
    name: '',
    name_ar: '',
    code: '',
    category: 'Consultation',
    subcategory: '',
    duration_minutes: '30',
    description: '',
    price_insurance: '',
    price_self_pay: '',
    price_government: '',
    department_id: '',
    requires_appointment: true,
    provider_id: '',
    provider_name: '',
    service_fee: '',
  });

  useEffect(() => {
    fetchProviders();
    fetchDepartments();
  }, []);

  useEffect(() => {
    console.log('Providers state:', providers);
  }, [providers]);

  const fetchProviders = async () => {
    try {
      const response = await fetch('/api/insurance-companies');
      if (response.ok) {
        const data = await response.json();
        console.log('Providers API response:', data);
        setProviders(data);
      }
    } catch (error) {
      console.error('Error fetching providers:', error);
      // Fallback to mock data if API fails
      setProviders([
        { company_id: 'PRV001', company_name: 'Baghdad Medical Center' },
        { company_id: 'PRV002', company_name: 'Al-Rasheed Radiology Lab' },
        { company_id: 'PRV003', company_name: 'National Laboratory Services' },
        { company_id: 'PRV004', company_name: 'Al-Amal Therapy Center' },
        { company_id: 'PRV005', company_name: 'Iraqi Dental Group' },
        { company_id: 'PRV006', company_name: 'Emergency Care Solutions' },
        { company_id: 'PRV007', company_name: 'Preventive Health Institute' },
        { company_id: 'PRV008', company_name: 'Al-Zahrawi Surgical Center' },
      ]);
    }
  };

  const fetchDepartments = async () => {
    try {
      const response = await fetch('/api/departments');
      if (response.ok) {
        const result = await response.json();
        setDepartments(result.data || []);
      }
    } catch (error) {
      console.error('Error fetching departments:', error);
    }
  };

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

    try {
      const payload = {
        name: formData.name,
        name_ar: formData.name_ar || null,
        code: formData.code || null,
        category: formData.category,
        subcategory: formData.subcategory || null,
        description: formData.description || null,
        price_self_pay: parseFloat(formData.price_self_pay) || 0,
        price_insurance: parseFloat(formData.price_insurance) || 0,
        price_government: parseFloat(formData.price_government) || 0,
        department_id: formData.department_id || null,
        requires_appointment: formData.requires_appointment,
        duration_minutes: parseInt(formData.duration_minutes) || 30,
        provider_id: formData.provider_id || null,
        provider_name: formData.provider_name || null,
        service_fee: parseFloat(formData.service_fee) || 0,
      };

      console.log('Submitting service:', payload);

      const response = await fetch('/api/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', response.headers);

      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('Non-JSON response:', text);
        alert('Server returned an error. Please check the console for details.');
        return;
      }

      if (response.ok) {
        const result = await response.json();
        console.log('Service created:', result);
        alert('Service created successfully!');
        router.push('/services');
      } else {
        const error = await response.json();
        console.error('API Error:', error);
        alert(error.error || error.details || 'Failed to create service');
      }
    } catch (error) {
      console.error('Error creating service:', error);
      alert('Failed to create service. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
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
                <label htmlFor="name_ar" className="block text-sm font-medium text-gray-700 mb-1">
                  Arabic Name
                </label>
                <Input
                  id="name_ar"
                  name="name_ar"
                  value={formData.name_ar}
                  onChange={handleChange}
                  placeholder="e.g., استشارة عامة"
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
                <label htmlFor="subcategory" className="block text-sm font-medium text-gray-700 mb-1">
                  Subcategory
                </label>
                <Input
                  id="subcategory"
                  name="subcategory"
                  value={formData.subcategory}
                  onChange={handleChange}
                  placeholder="e.g., General Medicine"
                />
              </div>

              <div>
                <label htmlFor="duration_minutes" className="block text-sm font-medium text-gray-700 mb-1">
                  Duration (minutes) *
                </label>
                <Input
                  id="duration_minutes"
                  name="duration_minutes"
                  type="number"
                  value={formData.duration_minutes}
                  onChange={handleChange}
                  placeholder="30"
                  required
                />
              </div>

              <div>
                <label htmlFor="department_id" className="block text-sm font-medium text-gray-700 mb-1">
                  Department *
                </label>
                <select
                  id="department_id"
                  name="department_id"
                  value={formData.department_id}
                  onChange={handleChange}
                  className="w-full h-10 px-3 rounded-md border border-gray-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                >
                  <option value="">Select Department</option>
                  {departments.map((dept, index) => (
                    <option key={dept.id || `dept-${index}`} value={dept.id || ''}>
                      {dept.name || 'Unknown Department'}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                Customer Billing *
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={3}
                className="w-full px-3 py-2 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Enter customer billing information..."
                required
              />
            </div>
          </CardContent>
        </Card>

        {/* Provider & Service Fee */}
        <Card>
          <CardHeader>
            <CardTitle>Service Provider & Fee</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-500">Link this service to an external provider organization and set the fee the hospital pays them per service rendered.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="provider_id" className="block text-sm font-medium text-gray-700 mb-1">
                  Provider
                </label>
                <select
                  id="provider_id"
                  name="provider_id"
                  value={formData.provider_id}
                  onChange={e => {
                    const p = providers.find(x => (x.company_id || x.id) === e.target.value);
                    setFormData(prev => ({ 
                      ...prev, 
                      provider_id: e.target.value, 
                      provider_name: p?.company_name || p?.name || '' 
                    }));
                  }}
                  className="w-full h-10 px-3 rounded-md border border-gray-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">-- No Provider --</option>
                  {providers.map((provider, index) => (
                    <option key={`${provider.company_id || provider.id || `provider-${index}`}`} value={provider.company_id || provider.id || ''}>
                      {provider.company_name || provider.name || 'Unknown Provider'}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="service_fee" className="block text-sm font-medium text-gray-700 mb-1">
                  Service Fee ($) — Amount hospital pays provider
                </label>
                <Input
                  id="service_fee"
                  name="service_fee"
                  type="number"
                  value={formData.service_fee}
                  onChange={handleChange}
                  placeholder="e.g., 80"
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
                <label htmlFor="price_insurance" className="block text-sm font-medium text-gray-700 mb-1">
                  Insurance Price ($) *
                </label>
                <Input
                  id="price_insurance"
                  name="price_insurance"
                  type="number"
                  step="0.01"
                  value={formData.price_insurance}
                  onChange={handleChange}
                  placeholder="150"
                  required
                />
              </div>

              <div>
                <label htmlFor="price_self_pay" className="block text-sm font-medium text-gray-700 mb-1">
                  Self-Pay Price ($) *
                </label>
                <Input
                  id="price_self_pay"
                  name="price_self_pay"
                  type="number"
                  step="0.01"
                  value={formData.price_self_pay}
                  onChange={handleChange}
                  placeholder="200"
                  required
                />
              </div>

              <div>
                <label htmlFor="price_government" className="block text-sm font-medium text-gray-700 mb-1">
                  Government Price ($) *
                </label>
                <Input
                  id="price_government"
                  name="price_government"
                  type="number"
                  step="0.01"
                  value={formData.price_government}
                  onChange={handleChange}
                  placeholder="100"
                  required
                />
              </div>
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
