# Internal Ordering System Documentation

## Overview

The Internal Ordering System is a comprehensive solution for managing supply and equipment orders between hospital departments and the inventory department. It provides end-to-end order tracking from creation to delivery with full audit trails.

## System Architecture

### Database Schema

The system uses **PostgreSQL** (Teammate Database) with the following tables:

#### 1. `internal_orders`
Main order table storing order information and tracking data.

**Key Fields:**
- `order_number`: Unique order identifier (e.g., ORD-2024-00001)
- `department_id`, `department_name`: Requesting department
- `requested_by`: Employee who placed the order
- `priority`: URGENT, HIGH, NORMAL, LOW
- `status`: PENDING, APPROVED, PACKED, SENT, DELIVERED, CANCELLED
- `delivery_location`: Where to deliver within hospital
- Tracking timestamps: `approved_at`, `packed_at`, `sent_at`, `delivered_at`
- Staff tracking: `approved_by`, `packed_by`, `sent_by`, `delivered_to`

#### 2. `internal_order_items`
Individual items in each order.

**Key Fields:**
- `order_id`: Reference to parent order
- `item_id`, `item_code`, `item_name`: Item identification
- `quantity_requested`, `quantity_approved`, `quantity_packed`, `quantity_delivered`
- `unit_price`, `total_price`: Pricing information
- `item_status`: PENDING, APPROVED, PACKED, DELIVERED, PARTIAL, OUT_OF_STOCK

#### 3. `order_status_history`
Audit trail for all status changes.

**Key Fields:**
- `order_id`: Reference to order
- `previous_status`, `new_status`: Status transition
- `changed_by`: Staff member who made the change
- `changed_at`: Timestamp of change
- `notes`: Additional comments

#### 4. `delivery_confirmations`
Delivery confirmation records with signatures.

**Key Fields:**
- `receiver_name`, `receiver_position`: Person receiving the order
- `delivery_date`: When delivered
- `condition_on_delivery`: GOOD, DAMAGED, INCOMPLETE
- `receiver_signature`: Base64 encoded signature
- `delivery_photos`: Array of photo URLs

### API Endpoints

#### `/api/internal-orders`

**GET** - Fetch orders with filters
- Query params: `status`, `department_id`, `priority`, `search`
- Returns: Array of orders with items

**POST** - Create new order
- Body: Order details + array of items
- Returns: Created order with generated order number

**PUT** - Update order status
- Body: `order_id`, `new_status`, `changed_by`, tracking fields
- Returns: Updated order
- Creates status history entry

**DELETE** - Cancel order
- Query params: `order_id`, `cancelled_by`
- Returns: Cancelled order

#### `/api/internal-orders/items`

**GET** - Fetch items for an order
- Query params: `order_id`
- Returns: Array of order items

**POST** - Add item to order
- Body: Item details
- Returns: Created item

**PUT** - Update item quantities/status
- Body: `item_id`, quantities, status
- Returns: Updated item

**DELETE** - Remove item from order
- Query params: `item_id`
- Returns: Deleted item confirmation

## User Interfaces

### 1. Department Orders (`/departments/orders`)

**Purpose:** Allow hospital staff from any department to create and track orders.

**Features:**
- **Create Order:** Select department, add items from inventory, set priority
- **Order List:** View all orders with filtering by status
- **Order Details:** Track order progress through all stages
- **Search:** Find orders by number, department, or requester

**Workflow:**
1. Click "New Order"
2. Select department and enter requester details
3. Search and add items from inventory
4. Set delivery location and priority
5. Submit order (status: PENDING)
6. Track order through approval, packing, sending, delivery

### 2. Inventory Incoming Orders (`/inventory/incoming-orders`)

**Purpose:** Allow inventory staff to manage and process incoming orders.

**Features:**
- **Dashboard Stats:** Real-time counts by status (Pending, Approved, Packed, Sent, Delivered)
- **Order Management:** View and update order status
- **Status Updates:** Move orders through workflow stages
- **Tracking Timeline:** Visual timeline of order progress
- **Delivery Confirmation:** Record receiver name and delivery notes

**Workflow:**
1. View incoming orders from departments
2. Approve order (status: APPROVED)
3. Pack items (status: PACKED)
4. Send for delivery (status: SENT)
5. Confirm delivery with receiver name (status: DELIVERED)

## Order Status Flow

```
PENDING → APPROVED → PACKED → SENT → DELIVERED
   ↓
CANCELLED (can be cancelled at any stage before delivery)
```

### Status Descriptions

- **PENDING:** Order created, awaiting inventory approval
- **APPROVED:** Order approved by inventory, ready for packing
- **PACKED:** Items packed and ready for delivery
- **SENT:** Order sent to department location
- **DELIVERED:** Order received by department staff
- **CANCELLED:** Order cancelled (can happen at any stage)

## Priority Levels

- **URGENT:** Critical/emergency supplies needed immediately
- **HIGH:** Important items needed soon
- **NORMAL:** Standard priority (default)
- **LOW:** Non-urgent items

## Integration Points

### Database Connections

**Teammate Database (PostgreSQL):**
- Internal orders system tables
- Order tracking and history
- Used for: Order management, tracking, reporting

**OpenEHR Database (Neon PostgreSQL):**
- Patient records
- Clinical data
- Used for: Patient information in invoices/billing

### Inventory Integration

The system is designed to integrate with your inventory management system:

**Current Implementation:**
- Mock inventory data for demonstration
- Items include: medications, supplies, equipment

**Future Integration:**
- Connect to actual inventory database
- Real-time stock checking
- Automatic inventory deduction on delivery
- Reorder level alerts

## User Roles & Access

### Department Staff
- **Access:** `/departments/orders`
- **Permissions:** Create orders, view own department orders, track status
- **Cannot:** Approve, pack, or deliver orders

### Inventory Staff
- **Access:** `/inventory/incoming-orders`
- **Permissions:** View all orders, update status, approve, pack, send, confirm delivery
- **Cannot:** Create orders on behalf of departments

### Admin/Super Admin
- **Access:** All modules
- **Permissions:** Full access to all features

## Navigation

### Sidebar Structure

**Existing System Section:**
- **Departments**
  - Department Orders (new)

**Modules Section:**
- **Inventory**
  - Incoming Orders (new)

## Features & Benefits

### For Department Staff
✅ Easy order creation with item search
✅ Real-time order tracking
✅ Priority setting for urgent needs
✅ Order history and audit trail
✅ Email notifications (future)

### For Inventory Staff
✅ Centralized order management
✅ Status-based workflow
✅ Quick status updates
✅ Delivery confirmation tracking
✅ Performance metrics dashboard

### For Hospital Management
✅ Complete audit trail
✅ Order analytics and reporting
✅ Department spending tracking
✅ Inventory demand forecasting
✅ Efficiency metrics

## Technical Stack

- **Frontend:** Next.js 14, React, TypeScript
- **Styling:** Tailwind CSS
- **Icons:** Lucide React
- **Database:** PostgreSQL (Teammate DB)
- **API:** Next.js API Routes
- **ORM:** postgres library with SQL templates
- **Notifications:** Sonner (toast notifications)

## Database Setup

1. Run the schema creation script:
```sql
-- Execute: database/create_internal_orders_system.sql
```

2. Verify tables created:
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE 'internal_%' OR table_name LIKE 'order_%';
```

3. Check sample data:
```sql
SELECT * FROM internal_orders;
SELECT * FROM internal_order_items;
```

## Environment Variables

Required in `.env.local`:

```env
TEAMMATE_DATABASE_URL=postgresql://user:password@host:port/database
```

## Future Enhancements

### Phase 2
- [ ] Email notifications on status changes
- [ ] SMS alerts for urgent orders
- [ ] Barcode scanning for items
- [ ] Mobile app for delivery staff
- [ ] Photo upload for delivery confirmation
- [ ] Digital signature capture

### Phase 3
- [ ] Inventory integration (auto-deduct stock)
- [ ] Predictive ordering based on usage patterns
- [ ] Supplier integration for out-of-stock items
- [ ] Analytics dashboard
- [ ] Automated reordering
- [ ] Multi-language support (Arabic/English)

### Phase 4
- [ ] Integration with hospital ERP
- [ ] Budget tracking and approval workflows
- [ ] Vendor management
- [ ] Contract management
- [ ] Quality control tracking

## Troubleshooting

### Orders not appearing
- Check database connection
- Verify API endpoint is accessible
- Check browser console for errors
- Ensure user has proper permissions

### Status update fails
- Verify staff name is provided
- Check order is not already delivered/cancelled
- Ensure database connection is active
- Check API logs for errors

### Items not loading
- Verify inventory API is working
- Check inventory database connection
- Ensure item data is properly formatted

## Support

For technical support or feature requests, contact:
- **Development Team:** dev@tibbna-hospital.iq
- **System Admin:** admin@tibbna-hospital.iq

## Version History

- **v1.0.0** (2024-02-23): Initial release
  - Department order creation
  - Inventory order management
  - Status tracking workflow
  - Audit trail
  - Delivery confirmation

---

**Last Updated:** February 23, 2024
**Documentation Version:** 1.0.0
