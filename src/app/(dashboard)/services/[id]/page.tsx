'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Edit, Trash2, Clock, DollarSign, Users, Building2, CreditCard, TrendingUp, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import servicesData from '@/data/services.json';
import { formatCurrency } from '@/lib/utils';

const fmt = (n: number) => new Intl.NumberFormat('en-IQ').format(Math.round(n));
const STORAGE_KEY = 'tibbna_service_payments';

export default function ServiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const service = servicesData.services.find((s) => s.id === params.id);
  const [balanceStats, setBalanceStats] = useState({ total: 0, paid: 0, pending: 0, invoiceCount: 0 });

  useEffect(() => {
    if (!service) return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const lines: any[] = raw ? JSON.parse(raw) : [];
      const svcLines = lines.filter((l: any) => l.service_id === service.id);
      setBalanceStats({
        total: svcLines.reduce((s: number, l: any) => s + l.total_fee, 0),
        paid: svcLines.filter((l: any) => l.status === 'PAID').reduce((s: number, l: any) => s + l.total_fee, 0),
        pending: svcLines.filter((l: any) => l.status === 'PENDING').reduce((s: number, l: any) => s + l.total_fee, 0),
        invoiceCount: svcLines.length,
      });
    } catch {}
  }, [service]);

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
                  <div className="mt-1">
                    <Badge variant="outline">{service.category}</Badge>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Status</label>
                  <div className="mt-1">
                    <Badge variant={service.status === 'active' ? 'success' : 'secondary'}>
                      {service.status}
                    </Badge>
                  </div>
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
              {service.service_fee && (
                <div className="pt-3 border-t">
                  <label className="text-sm font-medium text-gray-600">Provider Service Fee</label>
                  <p className="mt-1 text-2xl font-bold text-amber-600">
                    {formatCurrency(service.service_fee)}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">Amount hospital pays provider per service</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Provider Card */}
          {service.provider_id && (() => {
            const prov = (servicesData as any).providers?.find((p: any) => p.id === service.provider_id);
            return (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="w-5 h-5" />
                    Service Provider
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div><span className="text-gray-500">Organization:</span> <span className="font-medium ml-1">{service.provider_name}</span></div>
                  {prov?.contact && <div><span className="text-gray-500">Contact:</span> <span className="font-medium ml-1">{prov.contact}</span></div>}
                  {prov?.phone && <div><span className="text-gray-500">Phone:</span> <span className="font-medium ml-1">{prov.phone}</span></div>}
                  {prov?.email && <div><span className="text-gray-500">Email:</span> <span className="font-medium ml-1">{prov.email}</span></div>}
                  <div className="pt-2">
                    <Link href="/finance/service-payments" className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                      <CreditCard className="w-3 h-3" /> View Payment History
                    </Link>
                  </div>
                </CardContent>
              </Card>
            );
          })()}

          {/* Balance Sheet Counter */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Balance Sheet
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Invoice Lines</span>
                <span className="font-semibold">{balanceStats.invoiceCount}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Total Fees Owed</span>
                <span className="font-semibold">{fmt(balanceStats.total)} $</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-emerald-600 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Paid</span>
                <span className="font-semibold text-emerald-600">{fmt(balanceStats.paid)} $</span>
              </div>
              <div className="flex justify-between text-sm border-t pt-2">
                <span className="text-amber-600 font-medium">Pending</span>
                <span className="font-bold text-amber-600">{fmt(balanceStats.pending)} $</span>
              </div>
              {balanceStats.invoiceCount === 0 && (
                <p className="text-xs text-gray-400 text-center pt-1">No invoice data yet</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
