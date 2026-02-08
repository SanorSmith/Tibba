'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Trash2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import itemsData from '@/data/inventory/items.json';

export default function NewRequisitionPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    justification: '',
    required_by_date: '',
    urgency: 'NORMAL',
    items: [{ item_id: '', quantity: 1, estimated_cost: 0 }],
  });

  const addItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, { item_id: '', quantity: 1, estimated_cost: 0 }],
    }));
  };

  const removeItem = (index: number) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  const updateItem = (index: number, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      ),
    }));
  };

  const handleSubmit = () => {
    if (!formData.justification || !formData.required_by_date || formData.items.some(i => !i.item_id)) {
      alert('Please fill all required fields');
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      const prNumber = `PR-2026-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`;
      alert(`Purchase Requisition created successfully!\n\nPR Number: ${prNumber}\nStatus: SUBMITTED\n\nThe PR has been submitted for approval.`);
      setIsLoading(false);
      router.push('/inventory/procurement/requisitions');
    }, 1500);
  };

  const totalAmount = formData.items.reduce((sum, item) => {
    const itemData = itemsData.items.find(i => i.id === item.item_id);
    return sum + (itemData?.unit_cost || 0) * item.quantity;
  }, 0);

  return (
    <div style={{ display: 'contents' }}>
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <div className="page-header-section">
        <div>
          <h2 className="page-title">Create Purchase Requisition</h2>
          <p className="page-description">Request items for purchase</p>
        </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Requisition Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Justification <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={formData.justification}
                  onChange={(e) => setFormData(prev => ({ ...prev, justification: e.target.value }))}
                  placeholder="Explain why these items are needed..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Required By Date <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="date"
                    value={formData.required_by_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, required_by_date: e.target.value }))}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Urgency <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.urgency}
                    onChange={(e) => setFormData(prev => ({ ...prev, urgency: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="NORMAL">Normal</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Items</CardTitle>
              <Button size="sm" onClick={addItem}>
                <Plus className="w-4 h-4 mr-2" />
                Add Item
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {formData.items.map((item, index) => {
                  const selectedItem = itemsData.items.find(i => i.id === item.item_id);
                  return (
                    <div key={index} className="flex gap-2 items-start p-3 border rounded-lg">
                      <div className="flex-1 grid grid-cols-3 gap-2">
                        <div className="col-span-2">
                          <label className="block text-xs text-gray-600 mb-1">Item</label>
                          <select
                            value={item.item_id}
                            onChange={(e) => updateItem(index, 'item_id', e.target.value)}
                            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                          >
                            <option value="">Select item...</option>
                            {itemsData.items.map(i => (
                              <option key={i.id} value={i.id}>
                                {i.item_name} - ${i.unit_cost.toFixed(2)}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">Quantity</label>
                          <Input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value))}
                            className="text-sm"
                          />
                        </div>
                      </div>
                      <div className="text-right pt-6">
                        <p className="text-sm font-medium">
                          ${((selectedItem?.unit_cost || 0) * item.quantity).toFixed(2)}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => removeItem(index)}
                        className="mt-6"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Total Items:</span>
                <span className="font-medium">{formData.items.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Total Quantity:</span>
                <span className="font-medium">
                  {formData.items.reduce((sum, i) => sum + i.quantity, 0)}
                </span>
              </div>
              <div className="flex justify-between pt-3 border-t">
                <span className="font-semibold">Estimated Total:</span>
                <span className="font-semibold text-lg">${totalAmount.toFixed(2)}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Approval Workflow</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs">1</div>
                <span className="text-gray-600">Department Head</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs">2</div>
                <span className="text-gray-600">Procurement Manager</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs">3</div>
                <span className="text-gray-600">Finance Director</span>
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-col gap-2">
            <Button onClick={handleSubmit} disabled={isLoading} className="w-full">
              <Save className="w-4 h-4 mr-2" />
              {isLoading ? 'Submitting...' : 'Submit for Approval'}
            </Button>
            <Button variant="outline" onClick={() => router.back()} className="w-full">
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
