'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, User, Package, Scan, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarcodeScanner } from '@/components/inventory/shared/barcode-scanner';
import itemsData from '@/data/inventory/items.json';

export default function PatientLinkedConsumptionPage() {
  const router = useRouter();
  const [patientScanned, setPatientScanned] = useState(false);
  const [itemScanned, setItemScanned] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState('');
  const [selectedItem, setSelectedItem] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [recorded, setRecorded] = useState(false);

  const mockPatients = [
    { id: 'PAT001', name: 'Ali Mahmood Al-Bayati', mrn: 'MRN-2026-001' },
    { id: 'PAT002', name: 'Fatima Hassan', mrn: 'MRN-2026-002' },
    { id: 'PAT003', name: 'Mohammed Ali', mrn: 'MRN-2026-003' },
  ];

  const handlePatientScan = (barcode: string) => {
    setPatientScanned(true);
    setSelectedPatient('PAT001');
  };

  const handleItemScan = (barcode: string) => {
    setItemScanned(true);
    setSelectedItem('ITEM-001');
  };

  const handleSubmit = () => {
    if (!selectedPatient || !selectedItem || quantity < 1) {
      alert('Please complete all fields');
      return;
    }

    const item = itemsData.items.find(i => i.id === selectedItem);
    const patient = mockPatients.find(p => p.id === selectedPatient);
    const chargeAmount = (item?.selling_price || 0) * quantity;

    setTimeout(() => {
      setRecorded(true);
      alert(`Consumption recorded successfully!\n\nPatient: ${patient?.name}\nItem: ${item?.item_name}\nQuantity: ${quantity}\n\nBilling charge created: $${chargeAmount.toFixed(2)}`);
    }, 500);
  };

  if (recorded) {
    return (
      <div className="p-6">
        <Card className="max-w-2xl mx-auto">
          <CardContent className="py-12 text-center">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Consumption Recorded</h2>
            <p className="text-gray-600 mb-6">Stock has been deducted and billing charge created</p>
            <div className="flex gap-2 justify-center">
              <Button onClick={() => {
                setRecorded(false);
                setPatientScanned(false);
                setItemScanned(false);
                setSelectedPatient('');
                setSelectedItem('');
                setQuantity(1);
              }}>
                Record Another
              </Button>
              <Button variant="outline" onClick={() => router.back()}>
                Back to List
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const selectedItemData = itemsData.items.find(i => i.id === selectedItem);
  const selectedPatientData = mockPatients.find(p => p.id === selectedPatient);

  return (
    <div style={{ display: 'contents' }}>
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <div className="page-header-section">
        <div>
          <h2 className="page-title">Patient-Linked Consumption</h2>
          <p className="page-description">Record item consumption for patient billing</p>
        </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Patient Selection</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Select Patient
                </label>
                <select
                  value={selectedPatient}
                  onChange={(e) => setSelectedPatient(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">Select patient...</option>
                  {mockPatients.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} - {p.mrn}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Or Scan Patient ID
                </label>
                <BarcodeScanner
                  onScan={handlePatientScan}
                  label={patientScanned ? 'Patient Scanned' : 'Scan Patient ID'}
                />
              </div>

              {selectedPatientData && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <User className="w-5 h-5 text-green-600" />
                    <span className="font-medium text-green-900">{selectedPatientData.name}</span>
                  </div>
                  <p className="text-sm text-green-700">MRN: {selectedPatientData.mrn}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Item Selection</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Select Item
                </label>
                <select
                  value={selectedItem}
                  onChange={(e) => setSelectedItem(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">Select item...</option>
                  {itemsData.items.map(i => (
                    <option key={i.id} value={i.id}>
                      {i.item_name} - ${i.selling_price.toFixed(2)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Or Scan Item Barcode
                </label>
                <BarcodeScanner
                  onScan={handleItemScan}
                  label={itemScanned ? 'Item Scanned' : 'Scan Item Barcode'}
                />
              </div>

              {selectedItemData && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <Package className="w-5 h-5 text-blue-600" />
                    <span className="font-medium text-blue-900">{selectedItemData.item_name}</span>
                  </div>
                  <p className="text-sm text-blue-700">
                    Unit Price: ${selectedItemData.selling_price.toFixed(2)}
                  </p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Quantity
                </label>
                <Input
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value))}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Verification Steps</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">1. Patient Selected</span>
                {selectedPatient && <CheckCircle className="w-5 h-5 text-green-600" />}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">2. Item Selected</span>
                {selectedItem && <CheckCircle className="w-5 h-5 text-green-600" />}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">3. Quantity Set</span>
                {quantity > 0 && <CheckCircle className="w-5 h-5 text-green-600" />}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Charge Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Unit Price:</span>
                <span className="font-medium">${selectedItemData?.selling_price.toFixed(2) || '0.00'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Quantity:</span>
                <span className="font-medium">{quantity}</span>
              </div>
              <div className="flex justify-between pt-2 border-t">
                <span className="font-semibold">Total Charge:</span>
                <span className="font-semibold text-lg">
                  ${((selectedItemData?.selling_price || 0) * quantity).toFixed(2)}
                </span>
              </div>
            </CardContent>
          </Card>

          <Button
            onClick={handleSubmit}
            className="w-full"
            disabled={!selectedPatient || !selectedItem || quantity < 1}
          >
            Record Consumption
          </Button>
        </div>
      </div>
    </div>
  );
}
