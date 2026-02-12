'use server';

import { supabaseAdmin } from '@/lib/supabase/server';
import { getSession } from '@/lib/supabase/auth';
import { revalidatePath } from 'next/cache';

export async function getInventoryItems() {
  try {
    const session = await getSession();
    if (!session) throw new Error('Unauthorized');

    const { data, error } = await supabaseAdmin
      .from('inventory_items')
      .select(`
        *,
        batches:inventory_batches(
          id,
          batch_number,
          quantity_on_hand,
          quantity_available,
          expiry_date,
          location:locations(id, name, code)
        )
      `)
      .eq('organization_id', session.organizationId)
      .eq('active', true)
      .order('code');

    if (error) throw error;

    // Calculate total stock for each item
    const itemsWithStock = (data as any[])?.map((item: any) => {
      const total_stock = item.batches?.reduce((sum: number, batch: any) =>
        sum + (batch.quantity_on_hand || 0), 0) || 0;

      const available_stock = item.batches?.reduce((sum: number, batch: any) =>
        sum + (batch.quantity_available || 0), 0) || 0;

      return {
        ...item,
        total_stock,
        available_stock,
        stock_status: total_stock === 0 ? 'OUT_OF_STOCK' :
                      total_stock <= item.reorder_level ? 'LOW_STOCK' : 'IN_STOCK'
      };
    });

    return { success: true, data: itemsWithStock };
  } catch (error) {
    console.error('Error fetching inventory:', error);
    return { success: false, error: 'Failed to fetch inventory' };
  }
}

export async function getInventoryItemById(id: string) {
  try {
    const session = await getSession();
    if (!session) throw new Error('Unauthorized');

    const { data, error } = await supabaseAdmin
      .from('inventory_items')
      .select(`
        *,
        batches:inventory_batches(
          *,
          location:locations(id, name, code),
          supplier:suppliers(id, name, code)
        )
      `)
      .eq('id', id)
      .eq('organization_id', session.organizationId)
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error fetching inventory item:', error);
    return { success: false, error: 'Item not found' };
  }
}

export async function recordStockMovement(movementData: {
  movement_type: 'RECEIPT' | 'ISSUE' | 'TRANSFER' | 'ADJUSTMENT' | 'RETURN' | 'DISPOSAL';
  item_id: string;
  batch_id?: string;
  from_location_id?: string;
  to_location_id?: string;
  quantity: number;
  unit_cost?: number;
  patient_id?: string;
  reason?: string;
  notes?: string;
}) {
  try {
    const session = await getSession();
    if (!session) throw new Error('Unauthorized');

    const movementNumber = `MOV-${Date.now()}`;

    // Create movement record
    const { data: movement, error: movementError } = await supabaseAdmin
      .from('inventory_movements')
      .insert({
        organization_id: session.organizationId,
        movement_number: movementNumber,
        movement_date: new Date().toISOString(),
        movement_type: movementData.movement_type,
        item_id: movementData.item_id,
        batch_id: movementData.batch_id || null,
        from_location_id: movementData.from_location_id || null,
        to_location_id: movementData.to_location_id || null,
        quantity: movementData.quantity,
        unit_cost: movementData.unit_cost || null,
        total_value: movementData.unit_cost ? movementData.quantity * movementData.unit_cost : null,
        patient_id: movementData.patient_id || null,
        reason: movementData.reason || null,
        notes: movementData.notes || null,
        performed_by: session.employeeId || null
      } as any)
      .select()
      .single();

    if (movementError) throw movementError;

    // Update batch quantities
    if (movementData.batch_id) {
      const { data: batch } = await supabaseAdmin
        .from('inventory_batches')
        .select('*')
        .eq('id', movementData.batch_id)
        .single();

      if (batch) {
        let newQuantity = (batch as any).quantity_on_hand;

        switch (movementData.movement_type) {
          case 'RECEIPT':
            newQuantity += movementData.quantity;
            break;
          case 'ISSUE':
          case 'TRANSFER':
          case 'DISPOSAL':
            newQuantity -= movementData.quantity;
            break;
          case 'ADJUSTMENT':
            newQuantity = movementData.quantity;
            break;
          case 'RETURN':
            newQuantity += movementData.quantity;
            break;
        }

        await supabaseAdmin
          .from('inventory_batches')
          .update({ quantity_on_hand: newQuantity } as any)
          .eq('id', movementData.batch_id);
      }
    }

    revalidatePath('/finance/inventory');

    return { success: true, data: movement };
  } catch (error) {
    console.error('Error recording stock movement:', error);
    return { success: false, error: 'Failed to record stock movement' };
  }
}

export async function getLowStockAlerts() {
  try {
    const session = await getSession();
    if (!session) throw new Error('Unauthorized');

    const { data, error } = await supabaseAdmin
      .from('inventory_items')
      .select(`
        *,
        batches:inventory_batches(quantity_on_hand)
      `)
      .eq('organization_id', session.organizationId)
      .eq('active', true);

    if (error) throw error;

    const alerts = (data as any[])
      ?.map((item: any) => {
        const total_stock = item.batches?.reduce((sum: number, batch: any) =>
          sum + (batch.quantity_on_hand || 0), 0) || 0;

        return {
          ...item,
          total_stock,
          alert_type: total_stock === 0 ? 'OUT_OF_STOCK' : 'LOW_STOCK'
        };
      })
      .filter((item: any) => item.total_stock <= item.reorder_level);

    return { success: true, data: alerts };
  } catch (error) {
    console.error('Error fetching alerts:', error);
    return { success: false, error: 'Failed to fetch alerts' };
  }
}

export async function getExpiringBatches(daysAhead: number = 90) {
  try {
    const session = await getSession();
    if (!session) throw new Error('Unauthorized');

    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysAhead);

    const { data, error } = await supabaseAdmin
      .from('inventory_batches')
      .select(`
        *,
        item:inventory_items(id, code, name, category),
        location:locations(id, name, code)
      `)
      .lte('expiry_date', futureDate.toISOString())
      .gt('quantity_on_hand', 0)
      .neq('status', 'EXPIRED')
      .order('expiry_date');

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error fetching expiring batches:', error);
    return { success: false, error: 'Failed to fetch expiring batches' };
  }
}
