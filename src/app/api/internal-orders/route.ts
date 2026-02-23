import { NextRequest, NextResponse } from 'next/server';
import postgres from 'postgres';

const sql = postgres(process.env.TEAMMATE_DATABASE_URL!, {
  ssl: 'require',
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
});

// GET - Fetch all internal orders with filters
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const department_id = searchParams.get('department_id');
    const priority = searchParams.get('priority');
    const search = searchParams.get('search');

    let query = `
      SELECT 
        o.*,
        json_agg(
          json_build_object(
            'id', oi.id,
            'item_id', oi.item_id,
            'item_code', oi.item_code,
            'item_name', oi.item_name,
            'item_description', oi.item_description,
            'category', oi.category,
            'quantity_requested', oi.quantity_requested,
            'quantity_approved', oi.quantity_approved,
            'quantity_packed', oi.quantity_packed,
            'quantity_delivered', oi.quantity_delivered,
            'unit_of_measure', oi.unit_of_measure,
            'unit_price', oi.unit_price,
            'total_price', oi.total_price,
            'item_status', oi.item_status,
            'notes', oi.notes
          )
        ) FILTER (WHERE oi.id IS NOT NULL) as items
      FROM public.internal_orders o
      LEFT JOIN public.internal_order_items oi ON o.id = oi.order_id
      WHERE 1=1
    `;

    const params: any[] = [];
    let paramIndex = 1;

    if (status) {
      query += ` AND o.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (department_id) {
      query += ` AND o.department_id = $${paramIndex}`;
      params.push(department_id);
      paramIndex++;
    }

    if (priority) {
      query += ` AND o.priority = $${paramIndex}`;
      params.push(priority);
      paramIndex++;
    }

    if (search) {
      query += ` AND (o.order_number ILIKE $${paramIndex} OR o.department_name ILIKE $${paramIndex} OR o.requested_by ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    query += ` GROUP BY o.id ORDER BY o.order_date DESC`;

    const orders = await sql.unsafe(query, params);

    return NextResponse.json(orders);
  } catch (error: any) {
    console.error('Error fetching internal orders:', error);
    return NextResponse.json(
      { error: 'Failed to fetch orders', details: error.message },
      { status: 500 }
    );
  }
}

// POST - Create new internal order
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      department_id,
      department_name,
      requested_by,
      requested_by_email,
      delivery_location,
      priority = 'NORMAL',
      notes,
      items = []
    } = body;

    // Validate required fields
    if (!department_id || !department_name || !requested_by || !delivery_location) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (!items || items.length === 0) {
      return NextResponse.json(
        { error: 'Order must contain at least one item' },
        { status: 400 }
      );
    }

    // Generate order number
    const orderCount = await sql`
      SELECT COUNT(*) as count FROM public.internal_orders
      WHERE order_date >= DATE_TRUNC('year', CURRENT_DATE)
    `;
    const nextNumber = String(Number(orderCount[0].count) + 1).padStart(5, '0');
    const orderNumber = `ORD-${new Date().getFullYear()}-${nextNumber}`;

    // Create order
    const [order] = await sql`
      INSERT INTO public.internal_orders (
        order_number,
        department_id,
        department_name,
        requested_by,
        requested_by_email,
        delivery_location,
        priority,
        notes,
        status
      ) VALUES (
        ${orderNumber},
        ${department_id},
        ${department_name},
        ${requested_by},
        ${requested_by_email || null},
        ${delivery_location},
        ${priority},
        ${notes || null},
        'PENDING'
      )
      RETURNING *
    `;

    // Create order items
    const orderItems = [];
    for (const item of items) {
      const totalPrice = (item.quantity_requested || 0) * (item.unit_price || 0);
      
      const [orderItem] = await sql`
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
          ${order.id},
          ${item.item_id},
          ${item.item_code || null},
          ${item.item_name},
          ${item.item_description || null},
          ${item.category || null},
          ${item.quantity_requested},
          ${item.unit_of_measure || 'unit'},
          ${item.unit_price || 0},
          ${totalPrice},
          'PENDING'
        )
        RETURNING *
      `;
      
      orderItems.push(orderItem);
    }

    // Create status history entry
    await sql`
      INSERT INTO public.order_status_history (
        order_id,
        new_status,
        changed_by,
        notes
      ) VALUES (
        ${order.id},
        'PENDING',
        ${requested_by},
        'Order created'
      )
    `;

    return NextResponse.json({
      ...order,
      items: orderItems
    }, { status: 201 });

  } catch (error: any) {
    console.error('Error creating internal order:', error);
    return NextResponse.json(
      { error: 'Failed to create order', details: error.message },
      { status: 500 }
    );
  }
}

// PUT - Update order status
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      order_id,
      new_status,
      changed_by,
      notes,
      approved_by,
      packed_by,
      sent_by,
      delivered_to,
      delivery_notes
    } = body;

    if (!order_id || !new_status || !changed_by) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get current order
    const [currentOrder] = await sql`
      SELECT * FROM public.internal_orders WHERE id = ${order_id}
    `;

    if (!currentOrder) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    // Build update query dynamically
    const updates: any = {
      status: new_status,
      updated_at: new Date().toISOString()
    };

    if (new_status === 'APPROVED' && approved_by) {
      updates.approved_by = approved_by;
      updates.approved_at = new Date().toISOString();
    }

    if (new_status === 'PACKED' && packed_by) {
      updates.packed_by = packed_by;
      updates.packed_at = new Date().toISOString();
    }

    if (new_status === 'SENT' && sent_by) {
      updates.sent_by = sent_by;
      updates.sent_at = new Date().toISOString();
    }

    if (new_status === 'DELIVERED' && delivered_to) {
      updates.delivered_to = delivered_to;
      updates.delivered_at = new Date().toISOString();
      if (delivery_notes) {
        updates.delivery_notes = delivery_notes;
      }
    }

    // Update order
    const [updatedOrder] = await sql`
      UPDATE public.internal_orders
      SET ${sql(updates)}
      WHERE id = ${order_id}
      RETURNING *
    `;

    // Create status history entry
    await sql`
      INSERT INTO public.order_status_history (
        order_id,
        previous_status,
        new_status,
        changed_by,
        notes
      ) VALUES (
        ${order_id},
        ${currentOrder.status},
        ${new_status},
        ${changed_by},
        ${notes || null}
      )
    `;

    return NextResponse.json(updatedOrder);

  } catch (error: any) {
    console.error('Error updating order status:', error);
    return NextResponse.json(
      { error: 'Failed to update order', details: error.message },
      { status: 500 }
    );
  }
}

// DELETE - Cancel order
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const order_id = searchParams.get('order_id');
    const cancelled_by = searchParams.get('cancelled_by');

    if (!order_id || !cancelled_by) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    // Update order status to CANCELLED
    const [cancelledOrder] = await sql`
      UPDATE public.internal_orders
      SET status = 'CANCELLED', updated_at = CURRENT_TIMESTAMP
      WHERE id = ${order_id}
      RETURNING *
    `;

    if (!cancelledOrder) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    // Create status history entry
    await sql`
      INSERT INTO public.order_status_history (
        order_id,
        previous_status,
        new_status,
        changed_by,
        notes
      ) VALUES (
        ${order_id},
        ${cancelledOrder.status},
        'CANCELLED',
        ${cancelled_by},
        'Order cancelled'
      )
    `;

    return NextResponse.json({ message: 'Order cancelled successfully', order: cancelledOrder });

  } catch (error: any) {
    console.error('Error cancelling order:', error);
    return NextResponse.json(
      { error: 'Failed to cancel order', details: error.message },
      { status: 500 }
    );
  }
}
