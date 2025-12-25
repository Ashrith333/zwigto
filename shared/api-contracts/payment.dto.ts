import { PaymentStatus } from './enums';

export interface CreatePaymentRequest {
  amount: number;
  currency?: string;
  metadata?: Record<string, any>;
}

export interface RefundPaymentRequest {
  amount?: number;
  reason?: string;
}

export interface Payment {
  id: string;
  user_id: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  razorpay_order_id: string | null;
  razorpay_payment_id: string | null;
  metadata: Record<string, any> | null;
  created_at: string;
  updated_at: string;
}

export interface RefundResponse {
  refund_id: string;
  status: string;
}

