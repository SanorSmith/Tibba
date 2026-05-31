import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('DATABASE_URL is not configured in environment variables');
}

const pool = databaseUrl ? new Pool({ connectionString: databaseUrl }) : null;

// In-memory storage for created orders (for demo purposes)
let createdOrders: any[] = [];

export async function GET(request: NextRequest) {
  try {
    if (!pool) {
      return NextResponse.json(
        { 
          error: 'Database not configured',
          details: 'DATABASE_URL environment variable is missing'
        },
        { status: 500 }
      );
    }

    // Mock data for internal orders since the table might not exist
    const mockData = [
      {
        id: 'io-001',
        order_number: 'ORD-2024-001',
        order_date: '2024-03-15T10:00:00Z',
        department_id: 'dept-001',
        department_name: 'Surgery',
        requested_by: 'Dr. Sarah Johnson',
        requested_by_email: 'sarah.johnson@hospital.com',
        priority: 'HIGH',
        delivery_location: 'Surgical Ward',
        notes: 'Urgent surgical supplies needed',
        status: 'PENDING',
        total_items: 3,
        total_quantity: 3500,
        estimated_cost: 15000,
        created_at: '2024-03-15T10:00:00Z',
        updated_at: '2024-03-15T10:00:00Z',
        items: [
          {
            id: 'item-001',
            order_id: 'io-001',
            item_id: 'med-001',
            item_name: 'Surgical Gloves',
            quantity_requested: 1000,
            quantity_approved: 1000,
            unit_of_measure: 'pairs',
            unit_price: 5,
            total_price: 5000,
            item_status: 'PENDING',
            created_at: '2024-03-15T10:00:00Z',
            updated_at: '2024-03-15T10:00:00Z'
          },
          {
            id: 'item-002',
            order_id: 'io-001',
            item_id: 'med-002',
            item_name: 'Face Masks',
            quantity_requested: 500,
            quantity_approved: 500,
            unit_of_measure: 'units',
            unit_price: 2,
            total_price: 1000,
            item_status: 'PENDING',
            created_at: '2024-03-15T10:00:00Z',
            updated_at: '2024-03-15T10:00:00Z'
          },
          {
            id: 'item-003',
            order_id: 'io-001',
            item_id: 'med-003',
            item_name: 'Syringes',
            quantity_requested: 2000,
            quantity_approved: 2000,
            unit_of_measure: 'units',
            unit_price: 3,
            total_price: 6000,
            item_status: 'PENDING',
            created_at: '2024-03-15T10:00:00Z',
            updated_at: '2024-03-15T10:00:00Z'
          }
        ]
      },
      {
        id: 'io-002',
        order_number: 'ORD-2024-002',
        order_date: '2024-03-14T14:30:00Z',
        department_id: 'dept-002',
        department_name: 'Laboratory',
        requested_by: 'Lab Manager',
        requested_by_email: 'lab.manager@hospital.com',
        priority: 'NORMAL',
        delivery_location: 'Laboratory Department',
        notes: 'Equipment for quality testing',
        status: 'APPROVED',
        total_items: 2,
        total_quantity: 502,
        estimated_cost: 8500,
        approved_by: 'Dr. Smith',
        approved_at: '2024-03-14T16:00:00Z',
        created_at: '2024-03-14T14:30:00Z',
        updated_at: '2024-03-14T16:00:00Z',
        items: [
          {
            id: 'item-004',
            order_id: 'io-002',
            item_id: 'lab-001',
            item_name: 'Microscope',
            quantity_requested: 2,
            quantity_approved: 2,
            unit_of_measure: 'units',
            unit_price: 3500,
            total_price: 7000,
            item_status: 'APPROVED',
            created_at: '2024-03-14T14:30:00Z',
            updated_at: '2024-03-14T16:00:00Z'
          },
          {
            id: 'item-005',
            order_id: 'io-002',
            item_id: 'lab-002',
            item_name: 'Test Tubes',
            quantity_requested: 500,
            quantity_approved: 500,
            unit_of_measure: 'units',
            unit_price: 3,
            total_price: 1500,
            item_status: 'APPROVED',
            created_at: '2024-03-14T14:30:00Z',
            updated_at: '2024-03-14T16:00:00Z'
          }
        ]
      },
      {
        id: 'io-003',
        order_number: 'ORD-2024-003',
        order_date: '2024-03-13T09:15:00Z',
        department_id: 'dept-003',
        department_name: 'Administration',
        requested_by: 'Admin Staff',
        requested_by_email: 'admin@hospital.com',
        priority: 'LOW',
        delivery_location: 'Reception Area',
        notes: 'Office renovation supplies',
        status: 'DELIVERED',
        total_items: 2,
        total_quantity: 9,
        estimated_cost: 4500,
        approved_by: 'Office Manager',
        approved_at: '2024-03-13T10:00:00Z',
        packed_by: 'Warehouse Staff',
        packed_at: '2024-03-16T14:00:00Z',
        sent_by: 'Delivery Team',
        sent_at: '2024-03-17T09:00:00Z',
        delivered_to: 'Admin Staff',
        delivered_at: '2024-03-18T11:30:00Z',
        delivery_notes: 'Delivered in good condition',
        created_at: '2024-03-13T09:15:00Z',
        updated_at: '2024-03-18T11:30:00Z',
        items: [
          {
            id: 'item-006',
            order_id: 'io-003',
            item_id: 'off-001',
            item_name: 'Office Desk',
            quantity_requested: 3,
            quantity_approved: 3,
            quantity_packed: 3,
            quantity_delivered: 3,
            unit_of_measure: 'units',
            unit_price: 800,
            total_price: 2400,
            item_status: 'DELIVERED',
            created_at: '2024-03-13T09:15:00Z',
            updated_at: '2024-03-18T11:30:00Z'
          },
          {
            id: 'item-007',
            order_id: 'io-003',
            item_id: 'off-002',
            item_name: 'Office Chair',
            quantity_requested: 6,
            quantity_approved: 6,
            quantity_packed: 6,
            quantity_delivered: 6,
            unit_of_measure: 'units',
            unit_price: 350,
            total_price: 2100,
            item_status: 'DELIVERED',
            created_at: '2024-03-13T09:15:00Z',
            updated_at: '2024-03-18T11:30:00Z'
          }
        ]
      },
      {
        id: 'io-004',
        order_number: 'ORD-2024-004',
        order_date: '2024-03-15T16:45:00Z',
        department_id: 'dept-004',
        department_name: 'Pharmacy',
        requested_by: 'Pharmacist',
        requested_by_email: 'pharmacy@hospital.com',
        priority: 'HIGH',
        delivery_location: 'Pharmacy Department',
        notes: 'Emergency medication supply',
        status: 'PACKED',
        total_items: 3,
        total_quantity: 4500,
        estimated_cost: 22000,
        approved_by: 'Pharmacy Director',
        approved_at: '2024-03-15T17:30:00Z',
        packed_by: 'Warehouse Staff',
        packed_at: '2024-03-16T10:00:00Z',
        created_at: '2024-03-15T16:45:00Z',
        updated_at: '2024-03-16T10:00:00Z',
        items: [
          {
            id: 'item-008',
            order_id: 'io-004',
            item_id: 'med-004',
            item_name: 'Amoxicillin',
            quantity_requested: 1000,
            quantity_approved: 1000,
            quantity_packed: 1000,
            unit_of_measure: 'tablets',
            unit_price: 15,
            total_price: 15000,
            item_status: 'PACKED',
            created_at: '2024-03-15T16:45:00Z',
            updated_at: '2024-03-16T10:00:00Z'
          },
          {
            id: 'item-009',
            order_id: 'io-004',
            item_id: 'med-005',
            item_name: 'Ibuprofen',
            quantity_requested: 2000,
            quantity_approved: 2000,
            quantity_packed: 2000,
            unit_of_measure: 'tablets',
            unit_price: 8,
            total_price: 16000,
            item_status: 'PACKED',
            created_at: '2024-03-15T16:45:00Z',
            updated_at: '2024-03-16T10:00:00Z'
          },
          {
            id: 'item-010',
            order_id: 'io-004',
            item_id: 'med-006',
            item_name: 'Paracetamol',
            quantity_requested: 1500,
            quantity_approved: 1500,
            quantity_packed: 1500,
            unit_of_measure: 'tablets',
            unit_price: 6,
            total_price: 9000,
            item_status: 'PACKED',
            created_at: '2024-03-15T16:45:00Z',
            updated_at: '2024-03-16T10:00:00Z'
          }
        ]
      }
    ];

    // Combine mock data with created orders
    const allOrders = [...mockData, ...createdOrders];
    
    // Sort by date (newest first)
    allOrders.sort((a, b) => new Date(b.order_date).getTime() - new Date(a.order_date).getTime());

    return NextResponse.json(allOrders);

  } catch (error) {
    console.error('Error fetching internal orders:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch internal orders',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!pool) {
      return NextResponse.json(
        { 
          error: 'Database not configured',
          details: 'DATABASE_URL environment variable is missing'
        },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { department_id, department_name, requested_by, requested_by_email, delivery_location, priority, notes, items } = body;

    // Calculate total amount and quantities
    const total_items = items.length;
    const total_quantity = items.reduce((sum: number, item: any) => sum + item.quantity_requested, 0);
    const estimated_cost = items.reduce((sum: number, item: any) => sum + (item.quantity_requested * item.unit_price), 0);

    // Generate order number
    const orderNumber = `ORD-2024-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`;
    const orderId = `io-${Math.floor(Math.random() * 100000)}`;

    // Create the new order
    const newOrder = {
      id: orderId,
      order_number: orderNumber,
      order_date: new Date().toISOString(),
      department_id,
      department_name,
      requested_by,
      requested_by_email,
      priority,
      delivery_location,
      notes,
      status: 'PENDING',
      total_items,
      total_quantity,
      estimated_cost,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      items: items.map((item: any, index: number) => ({
        id: `item-${orderId}-${index + 1}`,
        order_id: orderId,
        item_id: item.item_id,
        item_name: item.item_name,
        quantity_requested: item.quantity_requested,
        quantity_approved: item.quantity_requested,
        unit_of_measure: item.unit_of_measure,
        unit_price: item.unit_price,
        total_price: item.quantity_requested * item.unit_price,
        item_status: 'PENDING',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }))
    };

    // Store the created order in memory
    createdOrders.push(newOrder);

    return NextResponse.json({
      success: true,
      data: newOrder
    });

  } catch (error) {
    console.error('Error creating internal order:', error);
    return NextResponse.json(
      { 
        error: 'Failed to create internal order',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!pool) {
      return NextResponse.json(
        { 
          error: 'Database not configured',
          details: 'DATABASE_URL environment variable is missing'
        },
        { status: 500 }
      );
    }

    const { id } = await params;
    const body = await request.json();

    // Mock response - update status or other fields
    const updatedOrder = {
      id,
      ...body,
      updated_at: new Date().toISOString()
    };

    return NextResponse.json({
      success: true,
      data: updatedOrder
    });

  } catch (error) {
    console.error('Error updating internal order:', error);
    return NextResponse.json(
      { 
        error: 'Failed to update internal order',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
