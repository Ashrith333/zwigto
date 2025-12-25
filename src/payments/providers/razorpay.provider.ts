import { Injectable } from '@nestjs/common';
import { Logger } from '@nestjs/common';

// Dynamic import to handle Razorpay module loading
let Razorpay: any = null;
try {
  const razorpayModule = require('razorpay');
  Razorpay = razorpayModule.default || razorpayModule;
} catch (error) {
  // Razorpay module not available - will be handled gracefully
}

@Injectable()
export class RazorpayProvider {
  private razorpay: any = null;
  private readonly logger = new Logger(RazorpayProvider.name);
  private isAvailable: boolean = false;

  constructor() {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    // Check if Razorpay module is available
    if (!Razorpay) {
      this.isAvailable = false;
      this.logger.warn('Razorpay module not available. Payment features will not work.');
      return;
    }

    // Check if credentials are provided
    if (keyId && keySecret) {
      try {
        this.razorpay = new Razorpay({
          key_id: keyId,
          key_secret: keySecret,
        });
        this.isAvailable = true;
        this.logger.log('Razorpay initialized successfully');
      } catch (error) {
        this.isAvailable = false;
        this.logger.warn('Failed to initialize Razorpay. Payment features will not work.', error);
      }
    } else {
      this.isAvailable = false;
      this.logger.warn('Razorpay credentials not found. Payment features will not work until configured.');
    }
  }

  private ensureRazorpay(): any {
    if (!this.isAvailable || !Razorpay) {
      throw new Error('Razorpay is not configured. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in .env');
    }

    if (!this.razorpay) {
      const keyId = process.env.RAZORPAY_KEY_ID;
      const keySecret = process.env.RAZORPAY_KEY_SECRET;

      if (!keyId || !keySecret) {
        throw new Error('Razorpay configuration is missing. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in .env');
      }

      this.razorpay = new Razorpay({
        key_id: keyId,
        key_secret: keySecret,
      });
    }

    return this.razorpay;
  }

  async createOrder(amount: number, currency: string, receipt?: string) {
    try {
      const razorpay = this.ensureRazorpay();
      const options = {
        amount: amount * 100,
        currency: currency.toUpperCase(),
        receipt: receipt,
      };

      const order = await razorpay.orders.create(options);
      return order;
    } catch (error) {
      this.logger.error('Failed to create Razorpay order', {
        error: error instanceof Error ? error.message : 'Unknown error',
        amount,
        currency,
      });
      throw error;
    }
  }

  verifyWebhookSignature(
    webhookBody: string,
    signature: string,
    secret: string,
  ): boolean {
    try {
      const crypto = require('crypto');
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(webhookBody)
        .digest('hex');

      return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature),
      );
    } catch (error) {
      this.logger.error('Failed to verify webhook signature', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return false;
    }
  }

  async createRefund(paymentId: string, amount?: number): Promise<any> {
    try {
      const razorpay = this.ensureRazorpay();
      const options: any = {
        payment_id: paymentId,
      };

      if (amount) {
        options.amount = amount * 100;
      }

      const refund = await razorpay.payments.refund(paymentId, options);
      return refund;
    } catch (error) {
      this.logger.error('Failed to create Razorpay refund', {
        error: error instanceof Error ? error.message : 'Unknown error',
        paymentId,
        amount,
      });
      throw error;
    }
  }
}

