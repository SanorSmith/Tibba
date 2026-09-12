'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, Search, Edit, Trash2, MoreVertical, Power } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';

interface Service {
  id: string;
  code: string;
  name: string;
  name_ar?: string;
  category: string;
  subcategory?: string;
  description?: string;
  price_self_pay: number;
  price_insurance: number;
  price_government: number;
  department_id?: string;
  department_name?: string;
  requires_appointment: boolean;
  duration_minutes: number;
  provider_id?: string;
  provider_name?: string;
  service_fee?: number;
  active: boolean;
  createdat?: string;
  updatedat?: string;
}

export default function ServicesPage() {
  const router = useRouter();
  const [services, setServices] = useState<Service[]>([]);
  const [departments, setDepartments] = useState<Array<{id: string, name: string}>>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    fetchServices();
    fetchDepartments();
  }, []);

  const fetchServices = async () => {
    try {
      const response = await fetch('/api/services');
      if (response.ok) {
        const data = await response.json();
        setServices(data);
      } else {
        // Was silent: the request failed and nothing on screen said so.
        const problem = await response.json().catch(() => null);
        toast.error(problem?.error || 'Could not fetch services');
      }
    } catch (error) {
      console.error('Error fetching services:', error);
    }
  };

  const fetchDepartments = async () => {
    try {
      const response = await fetch('/api/departments');
      if (response.ok) {
        const result = await response.json();
        setDepartments(result.data || []);
      } else {
        // Was silent: the request failed and nothing on screen said so.
        const problem = await response.json().catch(() => null);
        toast.error(problem?.error || 'Could not fetch departments');
      }
    } catch (error) {
      console.error('Error fetching departments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (service: Service) => {
    try {
      const response = await fetch(`/api/services/${service.id}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        toast.success(`Service "${service.name}" has been deactivated`);
        setServices((prev) => prev.filter((s) => s.id !== service.id));
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to delete service');
      }
    } catch (error) {
      toast.error('Failed to delete service');
    } finally {
      setDeleteConfirm(null);
    }
  };

  const handleToggleActive = async (service: Service) => {
    try {
      const response = await fetch(`/api/services/${service.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !service.active }),
      });
      if (response.ok) {
        toast.success(`Service "${service.name}" ${service.active ? 'deactivated' : 'activated'}`);
        setServices((prev) =>
          prev.map((s) => (s.id === service.id ? { ...s, active: !s.active } : s))
        );
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to update service');
      }
    } catch (error) {
      toast.error('Failed to update service status');
    }
  };

  const filteredServices = services.filter((service) => {
    const matchesSearch = service.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      service.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      service.subcategory?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || service.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const categories = ['all', ...new Set(services.map(s => s.category))];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Services</h1>
          <p className="text-gray-600 mt-1">Manage hospital procedures and treatments</p>
        </div>
        <Link href="/services/add">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Add Service
          </Button>
        </Link>
      </div>

      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search services by name or specialty..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
        >
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat === 'all' ? 'All Categories' : cat}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <p className="text-gray-500">Loading services...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredServices.map((service) => (
            <Card key={service.id} className="hover:shadow-md transition-shadow h-full relative group">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <Link href={`/services/${service.code}`} className="flex-1">
                    <CardTitle className="text-lg hover:text-blue-600 transition-colors cursor-pointer">
                      {service.name}
                    </CardTitle>
                  </Link>
                  <div className="flex items-center gap-2">
                    <Badge variant={service.active ? 'success' : 'secondary'}>
                      {service.active ? 'active' : 'inactive'}
                    </Badge>
                  </div>
                </div>
                <p className="text-sm text-gray-500">{service.subcategory || service.category}</p>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Duration:</span>
                  <span className="font-medium">{service.duration_minutes} min</span>
                </div>
                {service.department_name && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Department:</span>
                    <span className="font-medium">{service.department_name}</span>
                  </div>
                )}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Insurance:</span>
                    <span className="font-medium">{formatCurrency(Number(service.price_insurance))}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Self Pay:</span>
                    <span className="font-medium">{formatCurrency(Number(service.price_self_pay))}</span>
                  </div>
                </div>
                <div className="pt-2 border-t flex items-center justify-between">
                  <Badge variant="outline" className="text-xs">
                    {service.category}
                  </Badge>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        router.push(`/services/${service.code}/edit`);
                      }}
                      className="p-1.5 rounded-md hover:bg-gray-100 text-gray-500 hover:text-blue-600 transition-colors"
                      title="Edit service"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        handleToggleActive(service);
                      }}
                      className={`p-1.5 rounded-md hover:bg-gray-100 transition-colors ${
                        service.active ? 'text-gray-500 hover:text-amber-600' : 'text-gray-400 hover:text-green-600'
                      }`}
                      title={service.active ? 'Deactivate service' : 'Activate service'}
                    >
                      <Power className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        setDeleteConfirm(service.id);
                      }}
                      className="p-1.5 rounded-md hover:bg-red-50 text-gray-500 hover:text-red-600 transition-colors"
                      title="Delete service"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </CardContent>

              {deleteConfirm === service.id && (
                <div className="absolute inset-0 bg-white/95 backdrop-blur-sm flex flex-col items-center justify-center rounded-lg z-10 p-4">
                  <p className="text-sm text-gray-700 font-medium text-center mb-3">
                    Deactivate &quot;{service.name}&quot;?
                  </p>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDelete(service)}
                    >
                      Confirm
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setDeleteConfirm(null)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {filteredServices.length === 0 && !loading && (
        <div className="text-center py-12">
          <p className="text-gray-500">No services found matching your criteria.</p>
        </div>
      )}
    </div>
  );
}
