import { apiClient } from './api-client';
import {
  CreatePaymentRequest,
  RefundPaymentRequest,
  Payment,
  RefundResponse,
} from '../../shared/api-contracts';

class PaymentService {
  async createPayment(request: CreatePaymentRequest): Promise<Payment> {
    return apiClient.post<Payment>('/payments', request);
  }

  async getPayment(paymentId: string): Promise<Payment> {
    return apiClient.get<Payment>(`/payments/${paymentId}`);
  }

  async refundPayment(
    paymentId: string,
    request: RefundPaymentRequest,
  ): Promise<RefundResponse> {
    return apiClient.post<RefundResponse>(`/payments/${paymentId}/refund`, request);
  }
}

export const paymentService = new PaymentService();

