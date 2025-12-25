import {
  Injectable,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { DatabaseProvider } from './providers/database.provider';
import { RazorpayProvider } from './providers/razorpay.provider';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { PaymentDto } from './dto/payment.dto';
import { Payment, PaymentStatus } from './interfaces/payment.interface';
import { Logger } from '@nestjs/common';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly databaseProvider: DatabaseProvider,
    private readonly razorpayProvider: RazorpayProvider,
  ) {}

  async createPayment(userId: string, dto: CreatePaymentDto): Promise<PaymentDto> {
    const currency = dto.currency || 'INR';

    try {
      const razorpayOrder = await this.razorpayProvider.createOrder(
        dto.amount,
        currency,
      );

      const payment = await this.databaseProvider.createPayment(userId, {
        amount: dto.amount,
        currency: currency,
        razorpay_order_id: razorpayOrder.id,
        metadata: dto.metadata || null,
      });

      return this.mapToDto(payment);
    } catch (error) {
      this.logger.error('Failed to create payment', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
        amount: dto.amount,
      });
      throw new BadRequestException('Failed to create payment intent');
    }
  }

  async getAllPayments(): Promise<PaymentDto[]> {
    const payments = await this.databaseProvider.findAllPayments();
    return payments.map((p) => this.mapToDto(p));
  }

  async getPayment(paymentId: string, userId?: string): Promise<PaymentDto> {
    const payment = await this.databaseProvider.findPaymentById(paymentId);

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    if (userId && payment.user_id !== userId) {
      throw new UnauthorizedException('You can only access your own payments');
    }

    return this.mapToDto(payment);
  }

  async handleWebhook(
    webhookBody: string,
    signature: string,
  ): Promise<{ processed: boolean; paymentId?: string }> {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    if (!webhookSecret) {
      this.logger.error('Razorpay webhook secret not configured');
      throw new BadRequestException('Webhook secret not configured');
    }

    const isValid = this.razorpayProvider.verifyWebhookSignature(
      webhookBody,
      signature,
      webhookSecret,
    );

    if (!isValid) {
      this.logger.warn('Invalid webhook signature received');
      throw new UnauthorizedException('Invalid webhook signature');
    }

    try {
      const webhookData = JSON.parse(webhookBody);
      const event = webhookData.event;
      const payload = webhookData.payload;

      if (!payload?.payment?.entity) {
        this.logger.warn('Invalid webhook payload structure', { event });
        return { processed: false };
      }

      const paymentEntity = payload.payment.entity;
      const razorpayPaymentId = paymentEntity.id;
      const razorpayOrderId = paymentEntity.order_id;

      let payment = await this.databaseProvider.findPaymentByRazorpayPaymentId(
        razorpayPaymentId,
      );

      if (!payment) {
        payment = await this.databaseProvider.findPaymentByRazorpayOrderId(
          razorpayOrderId,
        );
      }

      if (!payment) {
        this.logger.warn('Payment not found for webhook', {
          razorpayPaymentId,
          razorpayOrderId,
          event,
        });
        return { processed: false };
      }

      const newStatus = this.mapRazorpayStatusToPaymentStatus(
        paymentEntity.status,
      );

      if (payment.status === newStatus) {
        this.logger.log('Webhook already processed (idempotent)', {
          paymentId: payment.id,
          status: payment.status,
          event,
        });
        return { processed: true, paymentId: payment.id };
      }

      await this.databaseProvider.updatePaymentStatus(
        payment.id,
        newStatus,
        razorpayPaymentId,
        signature,
      );

      this.logger.log('Payment status updated via webhook', {
        paymentId: payment.id,
        oldStatus: payment.status,
        newStatus,
        event,
      });

      return { processed: true, paymentId: payment.id };
    } catch (error) {
      this.logger.error('Failed to process webhook', {
        error: error instanceof Error ? error.message : 'Unknown error',
        errorStack: error instanceof Error ? error.stack : undefined,
      });
      throw new BadRequestException('Failed to process webhook');
    }
  }

  private mapRazorpayStatusToPaymentStatus(razorpayStatus: string): PaymentStatus {
    const statusMap: Record<string, PaymentStatus> = {
      created: PaymentStatus.PENDING,
      authorized: PaymentStatus.AUTHORIZED,
      captured: PaymentStatus.CAPTURED,
      refunded: PaymentStatus.REFUNDED,
      failed: PaymentStatus.FAILED,
    };

    return statusMap[razorpayStatus.toLowerCase()] || PaymentStatus.PENDING;
  }

  async refundPayment(
    paymentId: string,
    amount?: number,
  ): Promise<{ refund_id: string; status: string }> {
    const payment = await this.databaseProvider.findPaymentById(paymentId);

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    if (!payment.razorpay_payment_id) {
      throw new BadRequestException('Payment does not have a Razorpay payment ID');
    }

    if (payment.status !== PaymentStatus.CAPTURED) {
      throw new BadRequestException(
        `Payment must be CAPTURED to refund. Current status: ${payment.status}`,
      );
    }

    try {
      const refund = await this.razorpayProvider.createRefund(
        payment.razorpay_payment_id,
        amount,
      );

      await this.databaseProvider.updatePaymentStatus(
        paymentId,
        PaymentStatus.REFUNDED,
        payment.razorpay_payment_id,
        null,
      );

      this.logger.log('Payment refunded', {
        paymentId: payment.id,
        refundId: refund.id,
        amount: amount || payment.amount,
      });

      return {
        refund_id: refund.id,
        status: refund.status,
      };
    } catch (error) {
      this.logger.error('Failed to refund payment', {
        error: error instanceof Error ? error.message : 'Unknown error',
        paymentId: payment.id,
      });
      throw new BadRequestException('Failed to process refund');
    }
  }

  private mapToDto(payment: Payment): PaymentDto {
    return {
      id: payment.id,
      user_id: payment.user_id,
      amount: payment.amount,
      currency: payment.currency,
      status: payment.status,
      razorpay_order_id: payment.razorpay_order_id,
      razorpay_payment_id: payment.razorpay_payment_id,
      metadata: payment.metadata,
      created_at: payment.created_at,
      updated_at: payment.updated_at,
    };
  }
}

