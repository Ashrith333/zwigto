import { OrderStatus } from './enums';
import { RoutePoint } from './geo.dto';

export interface OrderItemRequest {
  menu_item_id: string;
  quantity: number;
}

export interface CreateOrderRequest {
  restaurant_id: string;
  payment_id: string;
  total_amount: number;
  items: OrderItemRequest[];
  route_polyline: RoutePoint[];
}

export interface UpdateOrderStatusRequest {
  status: OrderStatus;
}

export interface Order {
  id: string;
  user_id: string;
  restaurant_id: string;
  status: OrderStatus;
  total_amount: number;
  payment_id: string;
  route_polyline: RoutePoint[];
  pickup_time: string | null;
  created_at: string;
  updated_at: string;
}

