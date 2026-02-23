// ============================================================
// Internal Orders System - TypeScript Types
// ============================================================

export type OrderPriority = 'URGENT' | 'HIGH' | 'NORMAL' | 'LOW';

export type OrderStatus = 
  | 'PENDING' 
  | 'APPROVED' 
  | 'PACKED' 
  | 'SENT' 
  | 'DELIVERED' 
  | 'CANCELLED';

export type ItemStatus = 
  | 'PENDING' 
  | 'APPROVED' 
  | 'PACKED' 
  | 'DELIVERED' 
  | 'PARTIAL' 
  | 'OUT_OF_STOCK';

export type DeliveryCondition = 'GOOD' | 'DAMAGED' | 'INCOMPLETE';

export interface InternalOrder {
  id: string;
  order_number: string;
  order_date: string;
  
  // Department Information
  department_id: string;
  department_name: string;
  requested_by: string;
  requested_by_email?: string;
  
  // Order Details
  priority: OrderPriority;
  delivery_location: string;
  notes?: string;
  
  // Status
  status: OrderStatus;
  
  // Financial
  total_items: number;
  total_quantity: number;
  estimated_cost: number;
  
  // Tracking
  approved_by?: string;
  approved_at?: string;
  packed_by?: string;
  packed_at?: string;
  sent_by?: string;
  sent_at?: string;
  delivered_to?: string;
  delivered_at?: string;
  delivery_notes?: string;
  
  // Metadata
  created_at: string;
  updated_at: string;
  
  // Relations
  items?: InternalOrderItem[];
  status_history?: OrderStatusHistory[];
  delivery_confirmation?: DeliveryConfirmation;
}

export interface InternalOrderItem {
  id: string;
  order_id: string;
  
  // Item Information
  item_id: string;
  item_code?: string;
  item_name: string;
  item_description?: string;
  category?: string;
  
  // Quantity
  quantity_requested: number;
  quantity_approved?: number;
  quantity_packed?: number;
  quantity_delivered?: number;
  unit_of_measure: string;
  
  // Pricing
  unit_price: number;
  total_price: number;
  
  // Status
  item_status: ItemStatus;
  notes?: string;
  
  // Metadata
  created_at: string;
  updated_at: string;
}

export interface OrderStatusHistory {
  id: string;
  order_id: string;
  previous_status?: OrderStatus;
  new_status: OrderStatus;
  changed_by: string;
  changed_at: string;
  notes?: string;
  metadata?: Record<string, any>;
}

export interface DeliveryConfirmation {
  id: string;
  order_id: string;
  
  // Receiver Information
  receiver_name: string;
  receiver_position?: string;
  receiver_department?: string;
  receiver_signature?: string;
  
  // Delivery Details
  delivery_date: string;
  delivery_location?: string;
  condition_on_delivery: DeliveryCondition;
  delivery_notes?: string;
  
  // Photos/Documents
  delivery_photos?: string[];
  
  // Metadata
  created_at: string;
}

export interface CreateOrderRequest {
  department_id: string;
  department_name: string;
  requested_by: string;
  requested_by_email?: string;
  delivery_location: string;
  priority: OrderPriority;
  notes?: string;
  items: CreateOrderItemRequest[];
}

export interface CreateOrderItemRequest {
  item_id: string;
  item_code?: string;
  item_name: string;
  item_description?: string;
  category?: string;
  quantity_requested: number;
  unit_of_measure?: string;
  unit_price?: number;
}

export interface UpdateOrderStatusRequest {
  order_id: string;
  new_status: OrderStatus;
  changed_by: string;
  notes?: string;
  
  // Additional fields based on status
  approved_by?: string;
  packed_by?: string;
  sent_by?: string;
  delivered_to?: string;
  delivery_notes?: string;
}

export interface UpdateOrderItemRequest {
  item_id: string;
  quantity_approved?: number;
  quantity_packed?: number;
  quantity_delivered?: number;
  item_status?: ItemStatus;
  notes?: string;
}

export interface InventoryItem {
  id: string;
  item_code: string;
  item_name: string;
  description?: string;
  category: string;
  unit_of_measure: string;
  unit_price: number;
  quantity_in_stock: number;
  reorder_level: number;
  supplier?: string;
  location?: string;
  is_active: boolean;
}

export interface Department {
  id: string;
  department_code: string;
  department_name: string;
  department_name_ar?: string;
  location?: string;
  manager?: string;
  is_active: boolean;
}

export interface OrderSummary {
  total_orders: number;
  pending_orders: number;
  approved_orders: number;
  packed_orders: number;
  sent_orders: number;
  delivered_orders: number;
  cancelled_orders: number;
  total_value: number;
}

export interface OrderFilters {
  status?: OrderStatus;
  priority?: OrderPriority;
  department_id?: string;
  date_from?: string;
  date_to?: string;
  search?: string;
}
