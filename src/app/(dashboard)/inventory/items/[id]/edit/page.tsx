'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import itemsData from '@/data/inventory/items.json';

export default function EditItemPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<any>(null);

  useEffect(() => {
    const item = itemsData.items.find(i => i.id === params.id);
    if (item) {
      setFormData({
        item_code: item.item_code,
        item_name: item.item_name,
        generic_name: item.generic_name || '',
        brand_name: item.brand_name || '',
        category: item.category,
        subcategory: item.subcategory || '',
        item_type: item.item_type,
        manufacturer: item.manufacturer || '',
        unit_of_measure: item.unit_of_measure,
        reorder_level: item.reorder_level,
        minimum_stock: item.minimum_stock,
        maximum_stock: item.maximum_stock,
        lead_time_days: item.lead_time_days,
        unit_cost: item.unit_cost,
        selling_price: item.selling_price,
        is_billable: item.is_billable,
        is_controlled_substance: item.is_controlled_substance,
        is_refrigerated: item.is_refrigerated,
        is_hazardous: item.is_hazardous,
        is_active: item.is_active,
      });
    }
  }, [params.id]);

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setIsLoading(true);
    setTimeout(() => {
      console.log('Updating item:', formData);
      alert('Item updated successfully! (Demo mode - data not persisted)');
      setIsLoading(false);
      router.push(`/inventory/items/${params.id}`);
    }, 1500);
  };

  if (!formData) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div style={{ display: 'contents' }}>
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <div className="page-header-section">
        <div>
          <h2 className="page-title">Edit Item</h2>
          <p className="page-description">{formData.item_code}</p>
        </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Item Code</label>
              <Input
                value={formData.item_code}
                onChange={(e) => handleInputChange('item_code', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Item Name</label>
              <Input
                value={formData.item_name}
                onChange={(e) => handleInputChange('item_name', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Generic Name</label>
              <Input
                value={formData.generic_name}
                onChange={(e) => handleInputChange('generic_name', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Brand Name</label>
              <Input
                value={formData.brand_name}
                onChange={(e) => handleInputChange('brand_name', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
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
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Stock Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Unit of Measure</label>
              <Input
                value={formData.unit_of_measure}
                onChange={(e) => handleInputChange('unit_of_measure', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Reorder Level</label>
              <Input
                type="number"
                value={formData.reorder_level}
                onChange={(e) => handleInputChange('reorder_level', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Minimum Stock</label>
              <Input
                type="number"
                value={formData.minimum_stock}
                onChange={(e) => handleInputChange('minimum_stock', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Maximum Stock</label>
              <Input
                type="number"
                value={formData.maximum_stock}
                onChange={(e) => handleInputChange('maximum_stock', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Lead Time (Days)</label>
              <Input
                type="number"
                value={formData.lead_time_days}
                onChange={(e) => handleInputChange('lead_time_days', e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pricing</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Unit Cost</label>
              <Input
                type="number"
                step="0.01"
                value={formData.unit_cost}
                onChange={(e) => handleInputChange('unit_cost', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Selling Price</label>
              <Input
                type="number"
                step="0.01"
                value={formData.selling_price}
                onChange={(e) => handleInputChange('selling_price', e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_billable"
                checked={formData.is_billable}
                onChange={(e) => handleInputChange('is_billable', e.target.checked)}
                className="w-4 h-4"
              />
              <label htmlFor="is_billable" className="text-sm font-medium">Billable Item</label>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Flags & Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_controlled"
                checked={formData.is_controlled_substance}
                onChange={(e) => handleInputChange('is_controlled_substance', e.target.checked)}
                className="w-4 h-4"
              />
              <label htmlFor="is_controlled" className="text-sm font-medium">Controlled Substance</label>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_refrigerated"
                checked={formData.is_refrigerated}
                onChange={(e) => handleInputChange('is_refrigerated', e.target.checked)}
                className="w-4 h-4"
              />
              <label htmlFor="is_refrigerated" className="text-sm font-medium">Requires Refrigeration</label>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_hazardous"
                checked={formData.is_hazardous}
                onChange={(e) => handleInputChange('is_hazardous', e.target.checked)}
                className="w-4 h-4"
              />
              <label htmlFor="is_hazardous" className="text-sm font-medium">Hazardous Material</label>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={(e) => handleInputChange('is_active', e.target.checked)}
                className="w-4 h-4"
              />
              <label htmlFor="is_active" className="text-sm font-medium">Active Item</label>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => router.back()}>Cancel</Button>
        <Button onClick={handleSave} disabled={isLoading}>
          <Save className="w-4 h-4 mr-2" />
          {isLoading ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </div>
  );
}
