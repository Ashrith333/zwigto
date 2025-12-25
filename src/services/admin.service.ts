import { apiClient } from './api-client';
import {
  ApproveChangeRequestResponse,
  RejectChangeRequestResponse,
  PauseRestaurantResponse,
  CancelOrderResponse,
  RefundPaymentResponse,
  RefundPaymentRequest,
} from '../../shared/api-contracts';

class AdminService {
  async approveChangeRequest(changeRequestId: string): Promise<ApproveChangeRequestResponse> {
    return apiClient.post<ApproveChangeRequestResponse>(
      `/admin/change-requests/${changeRequestId}/approve`,
      {},
    );
  }

  async rejectChangeRequest(changeRequestId: string): Promise<RejectChangeRequestResponse> {
    return apiClient.post<RejectChangeRequestResponse>(
      `/admin/change-requests/${changeRequestId}/reject`,
      {},
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
}

export const adminService = new AdminService();

