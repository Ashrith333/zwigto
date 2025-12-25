import { apiClient } from './api-client';
import {
  CreateOrderRequest,
  UpdateOrderStatusRequest,
  Order,
} from '../../shared/api-contracts';

class OrderService {
  async createOrder(request: CreateOrderRequest): Promise<Order> {
    // For cash on pickup, don't send payment_id
    const orderRequest = {
      ...request,
      payment_id: request.payment_id || undefined,
    };
    return apiClient.post<Order>('/orders', orderRequest);
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
    return apiClient.patch<Order>(`/orders/${orderId}/status`, {
      status: request.status,
      customer_pin: request.customer_pin,
    });
  }

  async completePickup(orderId: string, collectionPin?: string): Promise<Order> {
    return apiClient.patch<Order>(`/orders/${orderId}/pickup`, {
      collection_pin: collectionPin,
    });
  }

  async getRestaurantOrders(): Promise<Order[]> {
    return apiClient.get<Order[]>('/orders/restaurant');
  }
}

export const orderService = new OrderService();

