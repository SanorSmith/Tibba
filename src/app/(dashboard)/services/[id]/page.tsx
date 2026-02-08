'use client';

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Edit, Trash2, Clock, DollarSign, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import servicesData from '@/data/services.json';
import { formatCurrency } from '@/lib/utils';

export default function ServiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const service = servicesData.services.find((s) => s.id === params.id);

  if (!service) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-gray-900">Service Not Found</h2>
          <p className="text-gray-600 mt-2">The service you're looking for doesn't exist.</p>
          <Link href="/services">
            <Button className="mt-4">Back to Services</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-gray-900">{service.name}</h1>
          <p className="text-gray-600 mt-1">{service.specialty}</p>
        </div>
        <div className="flex gap-2">
          <Link href={`/services/${service.id}/edit`}>
            <Button variant="outline">
              <Edit className="w-4 h-4 mr-2" />
              Edit
            </Button>
          </Link>
          <Button variant="destructive">
            <Trash2 className="w-4 h-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Service Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-600">Description</label>
                <p className="mt-1 text-gray-900">{service.description}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">Category</label>
                  <p className="mt-1">
                    <Badge variant="outline">{service.category}</Badge>
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Status</label>
                  <p className="mt-1">
                    <Badge variant={service.status === 'active' ? 'success' : 'secondary'}>
                      {service.status}
                    </Badge>
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">CPT Code</label>
                  <p className="mt-1 text-gray-900 font-mono">{service.cptCode}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">ICD-10 Code</label>
                  <p className="mt-1 text-gray-900 font-mono">{service.icd10Code}</p>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Duration</label>
                <div className="mt-1 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-900">{service.duration} minutes</span>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Appointment Required</label>
                <p className="mt-1 text-gray-900">
                  {service.requiresAppointment ? 'Yes' : 'No'}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Resources Required</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {service.equipmentNeeded.length > 0 && (
                <div>
                  <label className="text-sm font-medium text-gray-600">Equipment</label>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {service.equipmentNeeded.map((item, idx) => (
                      <Badge key={idx} variant="outline">{item}</Badge>
                    ))}
                  </div>
                </div>
              )}
              {service.suppliesNeeded.length > 0 && (
                <div>
                  <label className="text-sm font-medium text-gray-600">Supplies</label>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {service.suppliesNeeded.map((item, idx) => (
                      <Badge key={idx} variant="secondary">{item}</Badge>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <label className="text-sm font-medium text-gray-600">Staff Required</label>
                <div className="mt-2 space-y-2">
                  {Object.entries(service.staffRequired).map(([role, count]) => (
                    <div key={role} className="flex items-center justify-between">
                      <span className="text-gray-900 capitalize">{role.replace('_', ' ')}</span>
                      <Badge>{count}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Pricing
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-600">Insurance</label>
                <p className="mt-1 text-2xl font-bold text-gray-900">
                  {formatCurrency(service.price.insurance)}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Self Pay</label>
                <p className="mt-1 text-2xl font-bold text-gray-900">
                  {formatCurrency(service.price.selfPay)}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Government</label>
                <p className="mt-1 text-2xl font-bold text-gray-900">
                  {formatCurrency(service.price.government)}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
