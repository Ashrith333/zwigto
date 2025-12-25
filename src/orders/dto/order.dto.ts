import { OrderStatus } from '../interfaces/order.interface';

export class OrderDto {
  id: string;
  user_id: string;
  restaurant_id: string;
  status: OrderStatus;
  total_amount: number;
  payment_id: string;
  route_polyline: Array<{ latitude: number; longitude: number }>;
  pickup_time: Date | null;
  created_at: Date;
  updated_at: Date;
}

