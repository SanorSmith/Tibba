import { NextRequest, NextResponse } from 'next/server';
import postgres from 'postgres';

const sql = postgres(process.env.TEAMMATE_DATABASE_URL!, {
  ssl: 'require',
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
});

// GET - Fetch order items for a specific order
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const order_id = searchParams.get('order_id');

    if (!order_id) {
      return NextResponse.json(
        { error: 'order_id is required' },
        { status: 400 }
      );
    }

    const items = await sql`
      SELECT * FROM public.internal_order_items
      WHERE order_id = ${order_id}
      ORDER BY created_at ASC
    `;

    return NextResponse.json(items);
  } catch (error: any) {
    console.error('Error fetching order items:', error);
    return NextResponse.json(
      { error: 'Failed to fetch order items', details: error.message },
      { status: 500 }
    );
  }
}

// PUT - Update order item quantities and status
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      item_id,
      quantity_approved,
      quantity_packed,
      quantity_delivered,
      item_status,
      notes
    } = body;

    if (!item_id) {
      return NextResponse.json(
        { error: 'item_id is required' },
        { status: 400 }
      );
    }

    // Build update object
    const updates: any = {
      updated_at: new Date().toISOString()
    };

    if (quantity_approved !== undefined) updates.quantity_approved = quantity_approved;
    if (quantity_packed !== undefined) updates.quantity_packed = quantity_packed;
    if (quantity_delivered !== undefined) updates.quantity_delivered = quantity_delivered;
    if (item_status) updates.item_status = item_status;
    if (notes !== undefined) updates.notes = notes;

    const [updatedItem] = await sql`
      UPDATE public.internal_order_items
      SET ${sql(updates)}
      WHERE id = ${item_id}
      RETURNING *
    `;

    if (!updatedItem) {
      return NextResponse.json(
        { error: 'Order item not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(updatedItem);

  } catch (error: any) {
    console.error('Error updating order item:', error);
    return NextResponse.json(
      { error: 'Failed to update order item', details: error.message },
      { status: 500 }
    );
  }
}

// POST - Add item to existing order
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      order_id,
      item_id,
      item_code,
      item_name,
      item_description,
      category,
      quantity_requested,
      unit_of_measure = 'unit',
      unit_price = 0
    } = body;

    if (!order_id || !item_id || !item_name || !quantity_requested) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const totalPrice = quantity_requested * unit_price;

    const [newItem] = await sql`
      INSERT INTO public.internal_order_items (
        order_id,
        item_id,
        item_code,
        item_name,
        item_description,
        category,
        quantity_requested,
        unit_of_measure,
        unit_price,
        total_price,
        item_status
      ) VALUES (
        ${order_id},
        ${item_id},
        ${item_code || null},
        ${item_name},
        ${item_description || null},
        ${category || null},
        ${quantity_requested},
        ${unit_of_measure},
        ${unit_price},
        ${totalPrice},
        'PENDING'
      )
      RETURNING *
    `;

    return NextResponse.json(newItem, { status: 201 });

  } catch (error: any) {
    console.error('Error adding order item:', error);
    return NextResponse.json(
      { error: 'Failed to add order item', details: error.message },
      { status: 500 }
    );
  }
}

// DELETE - Remove item from order
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const item_id = searchParams.get('item_id');

    if (!item_id) {
      return NextResponse.json(
        { error: 'item_id is required' },
        { status: 400 }
      );
    }

    const [deletedItem] = await sql`
      DELETE FROM public.internal_order_items
      WHERE id = ${item_id}
      RETURNING *
    `;

    if (!deletedItem) {
      return NextResponse.json(
        { error: 'Order item not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: 'Item removed successfully', item: deletedItem });

  } catch (error: any) {
    console.error('Error deleting order item:', error);
    return NextResponse.json(
      { error: 'Failed to delete order item', details: error.message },
      { status: 500 }
    );
  }
}
