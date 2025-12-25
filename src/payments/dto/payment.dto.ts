import { PaymentStatus } from '../interfaces/payment.interface';

export class PaymentDto {
  id: string;
  user_id: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  razorpay_order_id: string | null;
  razorpay_payment_id: string | null;
  metadata: Record<string, any> | null;
  created_at: Date;
  updated_at: Date;
}

