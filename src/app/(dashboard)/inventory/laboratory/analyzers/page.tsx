'use client';

import { useState } from 'react';
import { Activity, CheckCircle, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default function AnalyzersPage() {
  const [showTestSimulation, setShowTestSimulation] = useState(false);

  const analyzers = [
    {
      id: 'ANALYZER-001',
      name: 'Sysmex XN-1000',
      type: 'Hematology',
      status: 'ONLINE',
      reagents: ['CBC Reagent Kit', 'Diff Reagent'],
      last_calibration: '2026-02-01',
      next_calibration: '2026-03-01',
      tests_today: 145,
    },
    {
      id: 'ANALYZER-002',
      name: 'Roche Cobas 6000',
      type: 'Chemistry',
      status: 'ONLINE',
      reagents: ['Chemistry Panel A', 'Chemistry Panel B'],
      last_calibration: '2026-01-28',
      next_calibration: '2026-02-28',
      tests_today: 203,
    },
    {
      id: 'ANALYZER-003',
      name: 'Abbott Architect',
      type: 'Immunoassay',
      status: 'CALIBRATION_DUE',
      reagents: ['Thyroid Panel', 'Cardiac Markers'],
      last_calibration: '2026-01-08',
      next_calibration: '2026-02-08',
      tests_today: 87,
    },
  ];

  const handleTestSimulation = () => {
    alert('Test Simulation:\n\nTest: Complete Blood Count (CBC)\nAnalyzer: Sysmex XN-1000\n\nReagent consumption:\n- CBC Reagent Kit: -1 test\n- Remaining: 449 tests\n\nStock transaction created.\nBilling charge created: $25.00');
    setShowTestSimulation(false);
  };

  return (
    <div style={{ display: 'contents' }}>
      <div className="flex items-center justify-between">
        <div className="page-header-section">
        <div>
          <h2 className="page-title">Analyzer Management</h2>
          <p className="page-description">Monitor and manage laboratory analyzers</p>
        </div>
        </div>
        <Button onClick={() => setShowTestSimulation(!showTestSimulation)}>
          <Activity className="w-4 h-4 mr-2" />
          Simulate Test Validation
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Analyzers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analyzers.length}</div>
            <p className="text-xs text-gray-500 mt-1">Registered</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Online</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {analyzers.filter(a => a.status === 'ONLINE').length}
            </div>
            <p className="text-xs text-gray-500 mt-1">Active</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Calibration Due</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {analyzers.filter(a => a.status === 'CALIBRATION_DUE').length}
            </div>
            <p className="text-xs text-gray-500 mt-1">Need attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Tests Today</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {analyzers.reduce((sum, a) => sum + a.tests_today, 0)}
            </div>
            <p className="text-xs text-gray-500 mt-1">Total processed</p>
          </CardContent>
        </Card>
      </div>

      {showTestSimulation && (
        <Card className="border-primary">
          <CardHeader>
            <CardTitle>Test Validation Simulation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Test Type</label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary">
                  <option value="">Select test...</option>
                  <option value="CBC">Complete Blood Count (CBC)</option>
                  <option value="CMP">Comprehensive Metabolic Panel</option>
                  <option value="TSH">Thyroid Stimulating Hormone</option>
                  <option value="TROP">Troponin I</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Analyzer</label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary">
                  <option value="">Select analyzer...</option>
                  {analyzers.map(a => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-900">
                This will automatically deduct reagents and create a billing charge
              </p>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleTestSimulation}>Run Test</Button>
              <Button variant="outline" onClick={() => setShowTestSimulation(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {analyzers.map(analyzer => (
          <Card key={analyzer.id} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-blue-500" />
                  <CardTitle className="text-base">{analyzer.name}</CardTitle>
                </div>
                <Badge variant={
                  analyzer.status === 'ONLINE' ? 'success' :
                  analyzer.status === 'CALIBRATION_DUE' ? 'warning' : 'secondary'
                }>
                  {analyzer.status === 'ONLINE' ? 'Online' : 'Cal Due'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-sm">
                <span className="text-gray-600">Type:</span>
                <p className="font-medium">{analyzer.type}</p>
              </div>

              <div className="text-sm">
                <span className="text-gray-600">Assigned Reagents:</span>
                <div className="mt-1 space-y-1">
                  {analyzer.reagents.map((reagent, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <CheckCircle className="w-3 h-3 text-green-500" />
                      <span className="text-xs">{reagent}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="text-sm">
                <span className="text-gray-600">Last Calibration:</span>
                <p className="font-medium">{new Date(analyzer.last_calibration).toLocaleDateString()}</p>
              </div>

              <div className="text-sm">
                <span className="text-gray-600">Next Calibration:</span>
                <p className="font-medium">{new Date(analyzer.next_calibration).toLocaleDateString()}</p>
              </div>

              <div className="text-sm">
                <span className="text-gray-600">Tests Today:</span>
                <p className="font-medium text-blue-600">{analyzer.tests_today}</p>
              </div>

              <div className="flex gap-2 pt-2">
                <Button size="sm" variant="outline" className="flex-1">Calibrate</Button>
                <Button size="sm" variant="outline" className="flex-1">Maintenance</Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
