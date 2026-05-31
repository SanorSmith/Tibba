'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Edit, Clock, DollarSign, Building2, CreditCard, TrendingUp, CheckCircle2, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const fmt = (n: number | string) =>
  new Intl.NumberFormat('en-IQ').format(Math.round(parseFloat(String(n)) || 0));

interface Service {
  id: string;
  code: string;
  name: string;
  name_ar?: string;
  category?: string;
  subcategory?: string;
  description?: string;
  price_self_pay?: string | number;
  price_insurance?: string | number;
  price_government?: string | number;
  requires_appointment?: boolean;
  duration_minutes?: number;
  active?: boolean;
  provider_id?: string;
  provider_name?: string;
  service_fee?: string | number;
}

export default function ServiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [service, setService] = useState<Service | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [providers, setProviders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let active = true;
    fetch(`/api/services/${params.id}`)
      .then(r => (r.ok ? r.json() : Promise.reject()))
      .then(d => {
        if (!active) return;
        if (!d.success) { setNotFound(true); return; }
        setService(d.data);
        setStats(d.stats);
        setProviders(d.providers || []);
      })
      .catch(() => active && setNotFound(true))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [params.id]);

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <div className="animate-pulse h-8 w-64 bg-gray-200 rounded" />
        <div className="animate-pulse h-40 bg-gray-100 rounded-lg" />
      </div>
    );
  }

  if (notFound || !service) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-gray-900">Service Not Found</h2>
          <p className="text-gray-600 mt-2">The service you&apos;re looking for doesn&apos;t exist.</p>
          <Link href="/services"><Button className="mt-4">Back to Services</Button></Link>
        </div>
      </div>
    );
  }

  const billed = parseFloat(String(stats?.total_billed ?? 0)) || 0;
  const shareTotal = parseFloat(String(stats?.provider_share_total ?? 0)) || 0;
  const sharePaid = parseFloat(String(stats?.provider_share_paid ?? 0)) || 0;
  const sharePending = shareTotal - sharePaid;
  const invoiceCount = parseInt(String(stats?.invoice_count ?? 0)) || 0;

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">{service.name}</h1>
          <p className="text-gray-500 text-sm">
            {service.name_ar ? `${service.name_ar} · ` : ''}{service.category}{service.subcategory ? ` / ${service.subcategory}` : ''}
          </p>
        </div>
        <Link href={`/services/${service.id}/edit`}>
          <Button variant="outline"><Edit className="w-4 h-4 mr-2" /> Edit</Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader><CardTitle>Service Information</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {service.description && (
                <div>
                  <label className="text-sm font-medium text-gray-600">Description</label>
                  <p className="mt-1 text-gray-900">{service.description}</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">Code</label>
                  <p className="mt-1 text-gray-900 font-mono">{service.code}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Status</label>
                  <div className="mt-1">
                    <Badge variant={service.active ? 'success' : 'secondary'}>
                      {service.active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Category</label>
                  <div className="mt-1"><Badge variant="outline">{service.category || '—'}</Badge></div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Appointment Required</label>
                  <p className="mt-1 text-gray-900">{service.requires_appointment ? 'Yes' : 'No'}</p>
                </div>
              </div>
              {service.duration_minutes ? (
                <div>
                  <label className="text-sm font-medium text-gray-600">Duration</label>
                  <div className="mt-1 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-900">{service.duration_minutes} minutes</span>
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>

          {/* Configured providers (revenue share) */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Users className="w-5 h-5" /> Providers &amp; Revenue Share</CardTitle>
            </CardHeader>
            <CardContent>
              {providers.length === 0 ? (
                <p className="text-sm text-gray-400">
                  No revenue-share providers configured. Hospital keeps 100% of this service&apos;s revenue.
                </p>
              ) : (
                <div className="space-y-2">
                  {providers.map((p, i) => (
                    <div key={i} className="flex items-center justify-between text-sm border-b last:border-0 pb-2">
                      <div>
                        <span className="font-medium text-gray-800">{p.stakeholder_name || p.stakeholder_name_ar}</span>
                        {p.provider_role && <span className="text-xs text-gray-400 ml-2">{p.provider_role}</span>}
                      </div>
                      <span className="font-semibold text-gray-700">
                        {p.share_type === 'PERCENTAGE' ? `${parseFloat(p.share_percentage || 0).toFixed(1)}%` : 'Fixed'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><DollarSign className="w-5 h-5" /> Pricing</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-600">Self Pay</label>
                <p className="mt-1 text-2xl font-bold text-gray-900">{fmt(service.price_self_pay ?? 0)} IQD</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Insurance</label>
                <p className="mt-1 text-2xl font-bold text-gray-900">{fmt(service.price_insurance ?? 0)} IQD</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Government</label>
                <p className="mt-1 text-2xl font-bold text-gray-900">{fmt(service.price_government ?? 0)} IQD</p>
              </div>
              {service.service_fee ? (
                <div className="pt-3 border-t">
                  <label className="text-sm font-medium text-gray-600">Provider Service Fee</label>
                  <p className="mt-1 text-2xl font-bold text-amber-600">{fmt(service.service_fee)} IQD</p>
                  <p className="text-xs text-gray-400 mt-0.5">Amount hospital pays provider per service</p>
                </div>
              ) : null}
            </CardContent>
          </Card>

          {service.provider_name && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Building2 className="w-5 h-5" /> Service Provider</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div><span className="text-gray-500">Organization:</span> <span className="font-medium ml-1">{service.provider_name}</span></div>
                <div className="pt-2">
                  <Link href="/finance/service-payments" className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                    <CreditCard className="w-3 h-3" /> View Payment History
                  </Link>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Real revenue counters from the GL/invoices */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><TrendingUp className="w-5 h-5" /> Revenue &amp; Payouts</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Invoices</span>
                <span className="font-semibold">{invoiceCount}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Total Billed</span>
                <span className="font-semibold">{fmt(billed)} IQD</span>
              </div>
              <div className="flex justify-between text-sm border-t pt-2">
                <span className="text-gray-500">Provider Share (total)</span>
                <span className="font-semibold">{fmt(shareTotal)} IQD</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-emerald-600 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Paid</span>
                <span className="font-semibold text-emerald-600">{fmt(sharePaid)} IQD</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-amber-600 font-medium">Pending</span>
                <span className="font-bold text-amber-600">{fmt(sharePending)} IQD</span>
              </div>
              {invoiceCount === 0 && (
                <p className="text-xs text-gray-400 text-center pt-1">No invoice data yet</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
