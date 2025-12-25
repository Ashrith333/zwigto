import { OrderStatus } from '../interfaces/order.interface';

export class OrderItemDto {
  id: string;
  menu_item_id: string;
  menu_item_name?: string;
  quantity: number;
  price: number;
  prep_time_minutes?: number;
}

export class OrderDto {
  id: string;
  user_id: string;
  restaurant_id: string;
  status: OrderStatus;
  total_amount: number;
  payment_id: string | null;
  payment_method?: string; // 'CASH_ON_PICKUP' or payment gateway ID
  collection_pin?: string; // 6-digit PIN for order collection (only shown to customer)
  route_polyline: Array<{ latitude: number; longitude: number }>;
  pickup_time: Date | null;
  estimated_ready_time?: Date; // ETA based on prep time
  items?: OrderItemDto[]; // Order items
  created_at: Date;
  updated_at: Date;
}

