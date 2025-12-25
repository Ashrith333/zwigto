import { apiClient } from './api-client';
import {
  CreateOrderRequest,
  UpdateOrderStatusRequest,
  Order,
} from '../../shared/api-contracts';

class OrderService {
  async createOrder(request: CreateOrderRequest): Promise<Order> {
    return apiClient.post<Order>('/orders', request);
  }

  async getMyOrders(): Promise<Order[]> {
    return apiClient.get<Order[]>('/orders/me');
  }

  async getOrder(orderId: string): Promise<Order> {
    return apiClient.get<Order>(`/orders/${orderId}`);
  }

  async updateOrderStatus(
    orderId: string,
    request: UpdateOrderStatusRequest,
  ): Promise<Order> {
    return apiClient.patch<Order>(`/orders/${orderId}/status`, request);
  }

  async completePickup(orderId: string): Promise<Order> {
    return apiClient.patch<Order>(`/orders/${orderId}/pickup`, {});
  }

  async getRestaurantOrders(): Promise<Order[]> {
    return apiClient.get<Order[]>('/orders/restaurant');
  }
}

export const orderService = new OrderService();

