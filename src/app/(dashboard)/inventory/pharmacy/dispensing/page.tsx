'use client';

import { useState } from 'react';
import { Pill, User, Scan, CheckCircle, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BarcodeScanner } from '@/components/inventory/shared/barcode-scanner';
import { ExpiryBadge } from '@/components/inventory/shared/expiry-badge';
import itemsData from '@/data/inventory/items.json';
import batchesData from '@/data/inventory/stock-batches.json';
import balancesData from '@/data/inventory/stock-balances.json';

export default function DispensingPage() {
  const [patientScanned, setPatientScanned] = useState(false);
  const [medicationScanned, setMedicationScanned] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(24);
  const [counselingChecked, setCounselingChecked] = useState(false);
  const [dispensed, setDispensed] = useState(false);

  const mockPrescription = {
    patient_id: 'PAT001',
    patient_name: 'Ali Mahmood Al-Bayati',
    patient_mrn: 'MRN-2026-001',
    medication: 'Paracetamol 500mg Tablet',
    item_id: 'ITEM-001',
    quantity: 24,
    instructions: '1 tablet every 6 hours for 6 days',
    prescriber: 'Dr. Sarah Ahmed',
    date: '2026-02-08',
  };

  const medication = itemsData.items.find(i => i.id === mockPrescription.item_id);
  const medicationBatches = batchesData.batches
    .filter(b => b.item_id === mockPrescription.item_id)
    .sort((a, b) => new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime());

  const availableStock = balancesData.balances
    .filter(b => b.item_id === mockPrescription.item_id)
    .reduce((sum, b) => sum + b.quantity_available, 0);

  const handlePatientScan = (barcode: string) => {
    console.log('Patient scanned:', barcode);
    setPatientScanned(true);
  };

  const handleMedicationScan = (barcode: string) => {
    console.log('Medication scanned:', barcode);
    setMedicationScanned(true);
  };

  const handleDispense = () => {
    if (!patientScanned || !medicationScanned || !selectedBatch || !counselingChecked) {
      alert('Please complete all required steps before dispensing');
      return;
    }

    setTimeout(() => {
      setDispensed(true);
      alert('Medication dispensed successfully!\n\nBilling charge created:\n- Item: Paracetamol 500mg\n- Quantity: 24\n- Amount: $3.60\n- Patient: Ali Mahmood Al-Bayati');
    }, 500);
  };

  if (dispensed) {
    return (
      <div className="p-6">
        <Card className="max-w-2xl mx-auto">
          <CardContent className="py-12 text-center">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Dispensing Complete</h2>
            <p className="text-gray-600 mb-6">Medication has been dispensed successfully</p>
            
            <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
              <h3 className="font-semibold mb-2">Transaction Summary</h3>
              <div className="space-y-1 text-sm">
                <p><span className="text-gray-600">Patient:</span> {mockPrescription.patient_name}</p>
                <p><span className="text-gray-600">Medication:</span> {mockPrescription.medication}</p>
                <p><span className="text-gray-600">Quantity:</span> {quantity} tablets</p>
                <p><span className="text-gray-600">Batch:</span> {selectedBatch}</p>
                <p><span className="text-gray-600">Charge:</span> ${(quantity * (medication?.selling_price || 0)).toFixed(2)}</p>
              </div>
            </div>

            <Button onClick={() => {
              setDispensed(false);
              setPatientScanned(false);
              setMedicationScanned(false);
              setSelectedBatch(null);
              setCounselingChecked(false);
            }}>
              Dispense Another
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div style={{ display: 'contents' }}>
      <div className="page-header-section">
        <div>
          <h2 className="page-title">Medication Dispensing</h2>
          <p className="page-description">Dispense medications to patients</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Prescription Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-600">Patient Name</label>
                  <p className="font-medium">{mockPrescription.patient_name}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-600">MRN</label>
                  <p className="font-medium">{mockPrescription.patient_mrn}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-600">Medication</label>
                  <p className="font-medium">{mockPrescription.medication}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-600">Quantity</label>
                  <p className="font-medium">{mockPrescription.quantity} tablets</p>
                </div>
                <div className="col-span-2">
                  <label className="text-sm text-gray-600">Instructions</label>
                  <p className="font-medium">{mockPrescription.instructions}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-600">Prescriber</label>
                  <p className="font-medium">{mockPrescription.prescriber}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-600">Date</label>
                  <p className="font-medium">{mockPrescription.date}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Stock Availability</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                  <div>
                    <p className="font-medium text-green-900">In Stock</p>
                    <p className="text-sm text-green-700">{availableStock} units available</p>
                  </div>
                </div>
                <Badge variant="success">Available</Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Select Batch (FEFO - First Expiry, First Out)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {medicationBatches.map(batch => (
                  <div
                    key={batch.id}
                    onClick={() => setSelectedBatch(batch.batch_number)}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedBatch === batch.batch_number
                        ? 'border-primary bg-primary/5'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">{batch.batch_number}</span>
                          <ExpiryBadge expiryDate={batch.expiry_date} />
                        </div>
                        <p className="text-sm text-gray-600">
                          Expiry: {new Date(batch.expiry_date).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-600">Available</p>
                        <p className="font-medium">{batch.received_quantity} units</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Dispensing Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Quantity to Dispense
                </label>
                <input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="counseling"
                  checked={counselingChecked}
                  onChange={(e) => setCounselingChecked(e.target.checked)}
                  className="w-4 h-4"
                />
                <label htmlFor="counseling" className="text-sm font-medium">
                  Patient counseling completed
                </label>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Verification Steps</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">1. Scan Patient ID</span>
                  {patientScanned && <CheckCircle className="w-5 h-5 text-green-600" />}
                </div>
                <BarcodeScanner
                  onScan={handlePatientScan}
                  label={patientScanned ? 'Patient Verified' : 'Scan Patient ID'}
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">2. Scan Medication</span>
                  {medicationScanned && <CheckCircle className="w-5 h-5 text-green-600" />}
                </div>
                <BarcodeScanner
                  onScan={handleMedicationScan}
                  label={medicationScanned ? 'Medication Verified' : 'Scan Medication'}
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">3. Select Batch</span>
                  {selectedBatch && <CheckCircle className="w-5 h-5 text-green-600" />}
                </div>
                <p className="text-xs text-gray-600">
                  {selectedBatch ? `Selected: ${selectedBatch}` : 'Select batch from list'}
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">4. Patient Counseling</span>
                  {counselingChecked && <CheckCircle className="w-5 h-5 text-green-600" />}
                </div>
                <p className="text-xs text-gray-600">
                  {counselingChecked ? 'Completed' : 'Check box when done'}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Charge Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Unit Price:</span>
                  <span className="font-medium">${medication?.selling_price.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Quantity:</span>
                  <span className="font-medium">{quantity}</span>
                </div>
                <div className="flex justify-between pt-2 border-t">
                  <span className="font-semibold">Total:</span>
                  <span className="font-semibold text-lg">
                    ${(quantity * (medication?.selling_price || 0)).toFixed(2)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Button
            onClick={handleDispense}
            className="w-full"
            disabled={!patientScanned || !medicationScanned || !selectedBatch || !counselingChecked}
          >
            <Pill className="w-4 h-4 mr-2" />
            Dispense Medication
          </Button>

          {(!patientScanned || !medicationScanned || !selectedBatch || !counselingChecked) && (
            <div className="flex items-start gap-2 p-3 bg-orange-50 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-orange-800">
                Complete all verification steps before dispensing
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
