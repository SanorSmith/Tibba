'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function NewItemPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  const [formData, setFormData] = useState({
    // Basic Information
    item_code: '',
    item_name: '',
    generic_name: '',
    brand_name: '',
    category: 'Pharmacy',
    subcategory: '',
    item_type: 'DRUG',
    manufacturer: '',
    
    // Stock Settings
    unit_of_measure: 'Tablet',
    reorder_level: '',
    minimum_stock: '',
    maximum_stock: '',
    lead_time_days: '',
    
    // Pricing & Billing
    unit_cost: '',
    selling_price: '',
    is_billable: true,
    billing_code: '',
    default_supplier: '',
    
    // Storage & Safety
    is_controlled_substance: false,
    is_refrigerated: false,
    is_hazardous: false,
    storage_temperature: '',
    storage_humidity: '',
    
    // Category-Specific (Pharmacy)
    drug_class: '',
    dosage_form: '',
    strength: '',
    route_of_administration: '',
    is_high_alert_medication: false,
    pregnancy_category: '',
  });

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setIsLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      console.log('Saving new item:', formData);
      alert('Item saved successfully! (Demo mode - data not persisted)');
      setIsLoading(false);
      router.push('/inventory/items');
    }, 1500);
  };

  const renderStep1 = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Item Code <span className="text-red-500">*</span>
          </label>
          <Input
            value={formData.item_code}
            onChange={(e) => handleInputChange('item_code', e.target.value)}
            placeholder="e.g., PAR-500-TAB"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Item Name <span className="text-red-500">*</span>
          </label>
          <Input
            value={formData.item_name}
            onChange={(e) => handleInputChange('item_name', e.target.value)}
            placeholder="e.g., Paracetamol 500mg Tablet"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Generic Name
          </label>
          <Input
            value={formData.generic_name}
            onChange={(e) => handleInputChange('generic_name', e.target.value)}
            placeholder="e.g., Paracetamol"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Brand Name
          </label>
          <Input
            value={formData.brand_name}
            onChange={(e) => handleInputChange('brand_name', e.target.value)}
            placeholder="e.g., Panadol"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Category <span className="text-red-500">*</span>
          </label>
          <select
            value={formData.category}
            onChange={(e) => handleInputChange('category', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="Pharmacy">Pharmacy</option>
            <option value="Laboratory">Laboratory</option>
            <option value="Radiology">Radiology</option>
            <option value="General Supplies">General Supplies</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Subcategory
          </label>
          <Input
            value={formData.subcategory}
            onChange={(e) => handleInputChange('subcategory', e.target.value)}
            placeholder="e.g., Analgesics"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Item Type <span className="text-red-500">*</span>
          </label>
          <select
            value={formData.item_type}
            onChange={(e) => handleInputChange('item_type', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="DRUG">Drug</option>
            <option value="REAGENT">Reagent</option>
            <option value="SUPPLY">Supply</option>
            <option value="CONSUMABLE">Consumable</option>
            <option value="EQUIPMENT">Equipment</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Manufacturer
          </label>
          <Input
            value={formData.manufacturer}
            onChange={(e) => handleInputChange('manufacturer', e.target.value)}
            placeholder="e.g., GlaxoSmithKline"
          />
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Unit of Measure <span className="text-red-500">*</span>
          </label>
          <select
            value={formData.unit_of_measure}
            onChange={(e) => handleInputChange('unit_of_measure', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="Tablet">Tablet</option>
            <option value="Capsule">Capsule</option>
            <option value="Ampule">Ampule</option>
            <option value="Vial">Vial</option>
            <option value="Bag">Bag</option>
            <option value="Kit">Kit</option>
            <option value="Piece">Piece</option>
            <option value="Pair">Pair</option>
            <option value="ml">ml</option>
            <option value="mg">mg</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Reorder Level <span className="text-red-500">*</span>
          </label>
          <Input
            type="number"
            value={formData.reorder_level}
            onChange={(e) => handleInputChange('reorder_level', e.target.value)}
            placeholder="e.g., 500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Minimum Stock <span className="text-red-500">*</span>
          </label>
          <Input
            type="number"
            value={formData.minimum_stock}
            onChange={(e) => handleInputChange('minimum_stock', e.target.value)}
            placeholder="e.g., 200"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Maximum Stock <span className="text-red-500">*</span>
          </label>
          <Input
            type="number"
            value={formData.maximum_stock}
            onChange={(e) => handleInputChange('maximum_stock', e.target.value)}
            placeholder="e.g., 2000"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Lead Time (Days) <span className="text-red-500">*</span>
          </label>
          <Input
            type="number"
            value={formData.lead_time_days}
            onChange={(e) => handleInputChange('lead_time_days', e.target.value)}
            placeholder="e.g., 7"
          />
        </div>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Unit Cost <span className="text-red-500">*</span>
          </label>
          <Input
            type="number"
            step="0.01"
            value={formData.unit_cost}
            onChange={(e) => handleInputChange('unit_cost', e.target.value)}
            placeholder="e.g., 0.05"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Selling Price <span className="text-red-500">*</span>
          </label>
          <Input
            type="number"
            step="0.01"
            value={formData.selling_price}
            onChange={(e) => handleInputChange('selling_price', e.target.value)}
            placeholder="e.g., 0.15"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Billing Code
          </label>
          <Input
            value={formData.billing_code}
            onChange={(e) => handleInputChange('billing_code', e.target.value)}
            placeholder="e.g., DRUG-001"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Default Supplier
          </label>
          <select
            value={formData.default_supplier}
            onChange={(e) => handleInputChange('default_supplier', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">Select Supplier</option>
            <option value="SUP-001">GlaxoSmithKline Middle East</option>
            <option value="SUP-002">Roche Diagnostics Middle East</option>
            <option value="SUP-003">GE Healthcare</option>
            <option value="SUP-004">Medline Middle East</option>
            <option value="SUP-005">Becton Dickinson UAE</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="is_billable"
            checked={formData.is_billable}
            onChange={(e) => handleInputChange('is_billable', e.target.checked)}
            className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
          />
          <label htmlFor="is_billable" className="text-sm font-medium text-gray-700">
            Billable Item
          </label>
        </div>
      </div>
    </div>
  );

  const renderStep4 = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Storage Temperature
          </label>
          <Input
            value={formData.storage_temperature}
            onChange={(e) => handleInputChange('storage_temperature', e.target.value)}
            placeholder="e.g., 15-30°C"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Storage Humidity
          </label>
          <Input
            value={formData.storage_humidity}
            onChange={(e) => handleInputChange('storage_humidity', e.target.value)}
            placeholder="e.g., Below 60%"
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="is_controlled_substance"
            checked={formData.is_controlled_substance}
            onChange={(e) => handleInputChange('is_controlled_substance', e.target.checked)}
            className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
          />
          <label htmlFor="is_controlled_substance" className="text-sm font-medium text-gray-700">
            Controlled Substance
          </label>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="is_refrigerated"
            checked={formData.is_refrigerated}
            onChange={(e) => handleInputChange('is_refrigerated', e.target.checked)}
            className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
          />
          <label htmlFor="is_refrigerated" className="text-sm font-medium text-gray-700">
            Requires Refrigeration
          </label>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="is_hazardous"
            checked={formData.is_hazardous}
            onChange={(e) => handleInputChange('is_hazardous', e.target.checked)}
            className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
          />
          <label htmlFor="is_hazardous" className="text-sm font-medium text-gray-700">
            Hazardous Material
          </label>
        </div>
      </div>
    </div>
  );

  const renderStep5 = () => (
    <div className="space-y-4">
      {formData.category === 'Pharmacy' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Drug Class
            </label>
            <Input
              value={formData.drug_class}
              onChange={(e) => handleInputChange('drug_class', e.target.value)}
              placeholder="e.g., Analgesic"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Dosage Form
            </label>
            <Input
              value={formData.dosage_form}
              onChange={(e) => handleInputChange('dosage_form', e.target.value)}
              placeholder="e.g., Tablet"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Strength
            </label>
            <Input
              value={formData.strength}
              onChange={(e) => handleInputChange('strength', e.target.value)}
              placeholder="e.g., 500mg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Route of Administration
            </label>
            <select
              value={formData.route_of_administration}
              onChange={(e) => handleInputChange('route_of_administration', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">Select Route</option>
              <option value="Oral">Oral</option>
              <option value="IV">IV</option>
              <option value="IM">IM</option>
              <option value="SC">SC</option>
              <option value="Topical">Topical</option>
              <option value="Inhalation">Inhalation</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Pregnancy Category
            </label>
            <select
              value={formData.pregnancy_category}
              onChange={(e) => handleInputChange('pregnancy_category', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">Select Category</option>
              <option value="A">A - No risk</option>
              <option value="B">B - No risk in humans</option>
              <option value="C">C - Risk cannot be ruled out</option>
              <option value="D">D - Positive evidence of risk</option>
              <option value="X">X - Contraindicated</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_high_alert_medication"
              checked={formData.is_high_alert_medication}
              onChange={(e) => handleInputChange('is_high_alert_medication', e.target.checked)}
              className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
            />
            <label htmlFor="is_high_alert_medication" className="text-sm font-medium text-gray-700">
              High Alert Medication
            </label>
          </div>
        </div>
      )}

      {formData.category !== 'Pharmacy' && (
        <div className="text-center py-8 text-gray-500">
          No category-specific fields for {formData.category}
        </div>
      )}
    </div>
  );

  const steps = [
    { number: 1, title: 'Basic Information', component: renderStep1 },
    { number: 2, title: 'Stock Settings', component: renderStep2 },
    { number: 3, title: 'Pricing & Billing', component: renderStep3 },
    { number: 4, title: 'Storage & Safety', component: renderStep4 },
    { number: 5, title: 'Category-Specific', component: renderStep5 },
  ];

  return (
    <div style={{ display: 'contents' }}>
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <div className="page-header-section">
        <div>
          <h2 className="page-title">Add New Item</h2>
          <p className="page-description">Create a new inventory item</p>
        </div>
        </div>
      </div>

      <div className="flex items-center justify-center mb-8">
        <div className="flex items-center gap-2">
          {steps.map((s, index) => (
            <div key={s.number} className="flex items-center">
              <div className={`flex items-center gap-2 ${step === s.number ? 'text-primary' : step > s.number ? 'text-green-600' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold ${
                  step === s.number ? 'bg-primary text-white' : 
                  step > s.number ? 'bg-green-600 text-white' : 
                  'bg-gray-200 text-gray-600'
                }`}>
                  {s.number}
                </div>
                <span className="text-sm font-medium hidden md:block">{s.title}</span>
              </div>
              {index < steps.length - 1 && (
                <div className={`w-12 h-0.5 mx-2 ${step > s.number ? 'bg-green-600' : 'bg-gray-300'}`} />
              )}
            </div>
          ))}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Step {step}: {steps[step - 1].title}</CardTitle>
        </CardHeader>
        <CardContent>
          {steps[step - 1].component()}

          <div className="flex items-center justify-between mt-6 pt-6 border-t">
            <div>
              {step > 1 && (
                <Button variant="outline" onClick={() => setStep(step - 1)}>
                  Previous
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => router.back()}>
                Cancel
              </Button>
              {step < steps.length ? (
                <Button onClick={() => setStep(step + 1)}>
                  Next
                </Button>
              ) : (
                <Button onClick={handleSave} disabled={isLoading}>
                  <Save className="w-4 h-4 mr-2" />
                  {isLoading ? 'Saving...' : 'Save Item'}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Preview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Item Code:</span>
              <p className="font-medium">{formData.item_code || '-'}</p>
            </div>
            <div>
              <span className="text-gray-600">Item Name:</span>
              <p className="font-medium">{formData.item_name || '-'}</p>
            </div>
            <div>
              <span className="text-gray-600">Category:</span>
              <p className="font-medium">{formData.category}</p>
            </div>
            <div>
              <span className="text-gray-600">Unit Cost:</span>
              <p className="font-medium">${formData.unit_cost || '0.00'}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
