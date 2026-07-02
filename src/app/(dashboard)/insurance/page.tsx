import { Shield, CheckCircle, Clock, XCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Pool } from 'pg';

const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    })
  : null;

const fmt = (n: number | string) =>
  new Intl.NumberFormat('en-IQ').format(parseFloat(String(n)) || 0);

async function getInsuranceStats() {
  if (!pool) {
    return { total: 0, approved: 0, approvedAmount: 0, pending: 0, pendingAmount: 0, rejected: 0, paid: 0, paidAmount: 0 };
  }
  try {
    const result = await pool.query(`
      SELECT
        COUNT(*)                                                                                  AS total,
        COUNT(*) FILTER (WHERE status IN ('APPROVED','PAID'))                                    AS approved,
        COALESCE(SUM(approved_amount) FILTER (WHERE status IN ('APPROVED','PAID')), 0)           AS approved_amount,
        COUNT(*) FILTER (WHERE status IN ('SUBMITTED','UNDER_REVIEW','DRAFT'))                   AS pending,
        COALESCE(SUM(claim_amount) FILTER (WHERE status IN ('SUBMITTED','UNDER_REVIEW')), 0)      AS pending_amount,
        COUNT(*) FILTER (WHERE status = 'REJECTED')                                              AS rejected,
        COUNT(*) FILTER (WHERE status = 'PAID')                                                  AS paid,
        COALESCE(SUM(paid_amount) FILTER (WHERE status = 'PAID'), 0)                             AS paid_amount
      FROM insurance_claims
    `);
    const r = result.rows[0];
    return {
      total:          parseInt(r.total) || 0,
      approved:       parseInt(r.approved) || 0,
      approvedAmount: parseFloat(r.approved_amount) || 0,
      pending:        parseInt(r.pending) || 0,
      pendingAmount:  parseFloat(r.pending_amount) || 0,
      rejected:       parseInt(r.rejected) || 0,
      paid:           parseInt(r.paid) || 0,
      paidAmount:     parseFloat(r.paid_amount) || 0,
    };
  } catch {
    return { total: 0, approved: 0, approvedAmount: 0, pending: 0, pendingAmount: 0, rejected: 0, paid: 0, paidAmount: 0 };
  }
}

async function getInsuranceCompanies() {
  if (!pool) return [];
  try {
    const result = await pool.query(`
      SELECT
        ic.company_id,
        ic.company_name,
        ic.company_code,
        ic.coverage_percentage,
        ic.active,
        COUNT(cl.id)                                       AS claims_count,
        COALESCE(SUM(cl.claim_amount), 0)                  AS total_claimed,
        COALESCE(SUM(cl.paid_amount), 0)                  AS total_paid
      FROM insurance_companies ic
      LEFT JOIN insurance_claims cl ON ic.company_id = cl.insurance_company_id
      WHERE ic.active = true
      GROUP BY ic.company_id, ic.company_name, ic.company_code, ic.coverage_percentage, ic.active
      ORDER BY claims_count DESC
    `);
    return result.rows;
  } catch {
    return [];
  }
}

export default async function InsurancePage() {
  const [stats, companies] = await Promise.all([getInsuranceStats(), getInsuranceCompanies()]);
  const approvalRate = stats.total > 0 ? Math.round((stats.approved / stats.total) * 100) : 0;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Insurance Management</h1>
        <p className="text-gray-600 mt-1">Manage insurance providers, coverage, and claims</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Claims</CardTitle>
            <Shield className="w-4 h-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-gray-500 mt-1">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Approved / Paid</CardTitle>
            <CheckCircle className="w-4 h-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{stats.approved}</div>
            <p className="text-xs text-gray-500 mt-1">{approvalRate}% approval rate</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Pending Review</CardTitle>
            <Clock className="w-4 h-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">{stats.pending}</div>
            <p className="text-xs text-gray-500 mt-1">{fmt(stats.pendingAmount)} IQD outstanding</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Rejected</CardTitle>
            <XCircle className="w-4 h-4 text-error" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-error">{stats.rejected}</div>
            <p className="text-xs text-gray-500 mt-1">Need follow-up</p>
          </CardContent>
        </Card>
      </div>

      {/* Insurance Companies */}
      {companies.length > 0 && (
        <div className="bg-white rounded-xl border overflow-hidden">
          <div className="p-4 border-b">
            <h2 className="font-semibold text-gray-900">Active Insurance Providers</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Company</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Code</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">Coverage %</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Claims</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Total Claimed (IQD)</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Total Paid (IQD)</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {companies.map((c: any) => (
                  <tr key={c.company_id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{c.company_name}</td>
                    <td className="px-4 py-3 text-gray-500 font-mono text-xs">{c.company_code}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">
                        {parseFloat(c.coverage_percentage) || 0}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">{c.claims_count}</td>
                    <td className="px-4 py-3 text-right text-gray-700">{fmt(c.total_claimed)}</td>
                    <td className="px-4 py-3 text-right font-medium text-emerald-700">{fmt(c.total_paid)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Card>
        <CardContent className="py-8 text-center">
          <Shield className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Full Insurance Workflow</h3>
          <p className="text-gray-600 text-sm">
            Use <strong>Finance → Insurance Claims</strong> to review, approve, and record payments on claims.<br />
            Use <strong>Finance → Invoices</strong> or <strong>Reception → Invoices</strong> to submit new claims with the 🛡️ button.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
