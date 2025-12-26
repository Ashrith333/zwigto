import { apiClient } from './api-client';
import {
  ApproveChangeRequestResponse,
  RejectChangeRequestResponse,
  PauseRestaurantResponse,
  CancelOrderResponse,
  RefundPaymentResponse,
  RefundPaymentRequest,
  ChangeRequest,
  Payment,
} from '../../shared/api-contracts';

class AdminService {
  async approveChangeRequest(changeRequestId: string): Promise<ApproveChangeRequestResponse> {
    return apiClient.post<ApproveChangeRequestResponse>(
      `/admin/change-requests/${changeRequestId}/approve`,
      {},
    );
  }

  async rejectChangeRequest(changeRequestId: string, rejectionReason?: string): Promise<RejectChangeRequestResponse> {
    return apiClient.post<RejectChangeRequestResponse>(
      `/admin/change-requests/${changeRequestId}/reject`,
      { rejection_reason: rejectionReason },
    );
  }

  async pauseRestaurant(restaurantId: string): Promise<PauseRestaurantResponse> {
    return apiClient.patch<PauseRestaurantResponse>(
      `/admin/restaurants/${restaurantId}/pause`,
      {},
    );
  }

  async cancelOrder(orderId: string): Promise<CancelOrderResponse> {
    return apiClient.patch<CancelOrderResponse>(`/admin/orders/${orderId}/cancel`, {});
  }

  async refundPayment(
    paymentId: string,
    request: RefundPaymentRequest,
  ): Promise<RefundPaymentResponse> {
    return apiClient.post<RefundPaymentResponse>(`/admin/payments/${paymentId}/refund`, request);
  }

  async getChangeRequests(): Promise<ChangeRequest[]> {
    return apiClient.get<ChangeRequest[]>('/admin/change-requests');
  }

  async getPendingRestaurants(): Promise<any[]> {
    return apiClient.get<any[]>('/admin/restaurants/pending');
  }

  async getPendingRestaurantsWithChanges(): Promise<any[]> {
    return apiClient.get<any[]>('/admin/restaurants/pending-with-changes');
  }

  async getAllOrders(): Promise<any[]> {
    return apiClient.get<any[]>('/admin/orders');
  }

  async approveRestaurant(restaurantId: string): Promise<any> {
    return apiClient.patch(`/admin/restaurants/${restaurantId}/approve`, {});
  }

  async rejectRestaurant(restaurantId: string, rejectionReason: string): Promise<any> {
    return apiClient.patch(`/admin/restaurants/${restaurantId}/reject`, {
      rejection_reason: rejectionReason,
    });
  }

  async getAllPayments(): Promise<Payment[]> {
    return apiClient.get<Payment[]>('/payments');
  }

  async triggerRefund(orderId: string): Promise<any> {
    // Get order to find payment_id, then refund
    const order = await apiClient.get(`/orders/${orderId}`);
    if (order.payment_id) {
      return this.refundPayment(order.payment_id, { amount: order.total_amount });
    }
    throw new Error('Order has no payment ID');
  }
}

export const adminService = new AdminService();

