-- ============================================================
-- Internal Orders System - Hospital Department to Inventory
-- Database Schema for Order Management and Tracking
-- ============================================================

-- Table: internal_orders
-- Stores orders placed by hospital departments to inventory
CREATE TABLE IF NOT EXISTS public.internal_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number VARCHAR(50) UNIQUE NOT NULL,
    order_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Department Information
    department_id VARCHAR(50) NOT NULL,
    department_name VARCHAR(255) NOT NULL,
    requested_by VARCHAR(255) NOT NULL, -- Employee name who placed the order
    requested_by_email VARCHAR(255),
    
    -- Order Details
    priority VARCHAR(20) DEFAULT 'NORMAL', -- URGENT, HIGH, NORMAL, LOW
    delivery_location VARCHAR(500) NOT NULL, -- Where to deliver within hospital
    notes TEXT,
    
    -- Status Tracking
    status VARCHAR(50) DEFAULT 'PENDING', -- PENDING, APPROVED, PACKED, SENT, DELIVERED, CANCELLED
    
    -- Financial
    total_items INTEGER DEFAULT 0,
    total_quantity INTEGER DEFAULT 0,
    estimated_cost DECIMAL(15, 2) DEFAULT 0,
    
    -- Tracking Information
    approved_by VARCHAR(255),
    approved_at TIMESTAMP WITH TIME ZONE,
    packed_by VARCHAR(255),
    packed_at TIMESTAMP WITH TIME ZONE,
    sent_by VARCHAR(255),
    sent_at TIMESTAMP WITH TIME ZONE,
    delivered_to VARCHAR(255), -- Receiver name at department
    delivered_at TIMESTAMP WITH TIME ZONE,
    delivery_notes TEXT,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table: internal_order_items
-- Individual items in each order
CREATE TABLE IF NOT EXISTS public.internal_order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.internal_orders(id) ON DELETE CASCADE,
    
    -- Item Information
    item_id VARCHAR(50) NOT NULL, -- Reference to inventory item
    item_code VARCHAR(50),
    item_name VARCHAR(255) NOT NULL,
    item_description TEXT,
    category VARCHAR(100),
    
    -- Quantity
    quantity_requested INTEGER NOT NULL,
    quantity_approved INTEGER,
    quantity_packed INTEGER,
    quantity_delivered INTEGER,
    unit_of_measure VARCHAR(50) DEFAULT 'unit',
    
    -- Pricing
    unit_price DECIMAL(15, 2) DEFAULT 0,
    total_price DECIMAL(15, 2) DEFAULT 0,
    
    -- Item Status
    item_status VARCHAR(50) DEFAULT 'PENDING', -- PENDING, APPROVED, PACKED, DELIVERED, PARTIAL, OUT_OF_STOCK
    notes TEXT,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table: order_status_history
-- Track all status changes for audit trail
CREATE TABLE IF NOT EXISTS public.order_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.internal_orders(id) ON DELETE CASCADE,
    
    -- Status Change
    previous_status VARCHAR(50),
    new_status VARCHAR(50) NOT NULL,
    
    -- Change Information
    changed_by VARCHAR(255) NOT NULL,
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    
    -- Additional Data
    metadata JSONB -- Store any additional tracking data
);

-- Table: delivery_confirmations
-- Store delivery confirmations and signatures
CREATE TABLE IF NOT EXISTS public.delivery_confirmations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.internal_orders(id) ON DELETE CASCADE,
    
    -- Receiver Information
    receiver_name VARCHAR(255) NOT NULL,
    receiver_position VARCHAR(255),
    receiver_department VARCHAR(255),
    receiver_signature TEXT, -- Base64 encoded signature image
    
    -- Delivery Details
    delivery_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    delivery_location VARCHAR(500),
    condition_on_delivery VARCHAR(50) DEFAULT 'GOOD', -- GOOD, DAMAGED, INCOMPLETE
    delivery_notes TEXT,
    
    -- Photos/Documents
    delivery_photos JSONB, -- Array of photo URLs
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_internal_orders_order_number ON public.internal_orders(order_number);
CREATE INDEX IF NOT EXISTS idx_internal_orders_department ON public.internal_orders(department_id);
CREATE INDEX IF NOT EXISTS idx_internal_orders_status ON public.internal_orders(status);
CREATE INDEX IF NOT EXISTS idx_internal_orders_date ON public.internal_orders(order_date DESC);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.internal_order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_item_id ON public.internal_order_items(item_id);
CREATE INDEX IF NOT EXISTS idx_order_history_order_id ON public.order_status_history(order_id);
CREATE INDEX IF NOT EXISTS idx_delivery_confirmations_order_id ON public.delivery_confirmations(order_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_internal_orders_updated_at BEFORE UPDATE ON public.internal_orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_internal_order_items_updated_at BEFORE UPDATE ON public.internal_order_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to automatically update order totals
CREATE OR REPLACE FUNCTION update_order_totals()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.internal_orders
    SET 
        total_items = (SELECT COUNT(*) FROM public.internal_order_items WHERE order_id = NEW.order_id),
        total_quantity = (SELECT COALESCE(SUM(quantity_requested), 0) FROM public.internal_order_items WHERE order_id = NEW.order_id),
        estimated_cost = (SELECT COALESCE(SUM(total_price), 0) FROM public.internal_order_items WHERE order_id = NEW.order_id)
    WHERE id = NEW.order_id;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to update order totals when items change
CREATE TRIGGER update_order_totals_trigger AFTER INSERT OR UPDATE OR DELETE ON public.internal_order_items
    FOR EACH ROW EXECUTE FUNCTION update_order_totals();

-- Sample data for testing
INSERT INTO public.internal_orders (
    order_number, department_id, department_name, requested_by, 
    delivery_location, priority, status
) VALUES 
(
    'ORD-2024-00001', 
    'DEPT-ER', 
    'Emergency Room', 
    'Dr. Ahmed Hassan',
    'Emergency Room - Station 3',
    'URGENT',
    'PENDING'
),
(
    'ORD-2024-00002', 
    'DEPT-ICU', 
    'Intensive Care Unit', 
    'Nurse Sarah Ali',
    'ICU - Floor 4',
    'HIGH',
    'APPROVED'
);

-- Sample order items
INSERT INTO public.internal_order_items (
    order_id, item_code, item_name, quantity_requested, unit_price, total_price
) VALUES 
(
    (SELECT id FROM public.internal_orders WHERE order_number = 'ORD-2024-00001'),
    'MED-001',
    'Paracetamol 500mg',
    100,
    0.50,
    50.00
),
(
    (SELECT id FROM public.internal_orders WHERE order_number = 'ORD-2024-00001'),
    'SUP-045',
    'Surgical Gloves (Box)',
    20,
    15.00,
    300.00
);

COMMENT ON TABLE public.internal_orders IS 'Internal orders from hospital departments to inventory';
COMMENT ON TABLE public.internal_order_items IS 'Individual items in internal orders';
COMMENT ON TABLE public.order_status_history IS 'Audit trail for order status changes';
COMMENT ON TABLE public.delivery_confirmations IS 'Delivery confirmations with receiver signatures';
