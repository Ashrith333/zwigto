import { OrderStatus } from './enums';
import { RoutePoint } from './geo.dto';

export interface OrderItemRequest {
  menu_item_id: string;
  quantity: number;
}

export interface CreateOrderRequest {
  restaurant_id: string;
  payment_id?: string; // Optional for cash on pickup
  total_amount: number;
  items: OrderItemRequest[];
  route_polyline?: RoutePoint[]; // Optional
}

export interface UpdateOrderStatusRequest {
  status: OrderStatus;
  customer_pin?: string; // Customer's default PIN required when marking as PICKED_UP
}

export interface OrderItem {
  id: string;
  menu_item_id: string;
  menu_item_name?: string;
  quantity: number;
  price: number;
  prep_time_minutes?: number;
}

export interface Order {
  id: string;
  user_id: string;
  restaurant_id: string;
  status: OrderStatus;
  total_amount: number;
  payment_id: string | null;
  payment_method?: string; // 'CASH_ON_PICKUP' or 'ONLINE'
  collection_pin?: string; // 6-digit PIN for order collection
  route_polyline: RoutePoint[];
  pickup_time: string | null;
  estimated_ready_time?: string; // ETA based on prep time
  items?: OrderItem[]; // Order items
  created_at: string;
  updated_at: string;
}

export interface CompletePickupRequest {
  collection_pin?: string; // PIN required for cash on pickup orders
}

