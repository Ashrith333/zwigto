import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Pool, QueryResult } from 'pg';
import { Payment, PaymentStatus } from '../interfaces/payment.interface';

@Injectable()
export class DatabaseProvider implements OnModuleInit, OnModuleDestroy {
  private pool: Pool;

  constructor() {
    const connectionString =
      process.env.DATABASE_URL ||
      'postgresql://postgres.lreibhelpqsfnefnthtc:Ashashashash333@aws-1-ap-south-1.pooler.supabase.com:6543/postgres';

    this.pool = new Pool({
      connectionString,
      ssl: {
        rejectUnauthorized: false,
      },
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });
  }

  async onModuleInit() {
    try {
      await this.pool.query('SELECT NOW()');
      console.log('Payments module database connection established');
    } catch (error: any) {
      const errorMessage = error?.message || 'Unknown error';
      if (errorMessage.includes('Circuit breaker') || errorMessage.includes('authentication')) {
        console.warn('⚠️  Payments module: Database connection failed (circuit breaker or auth issue). Will retry on first query.');
      } else {
        console.warn('⚠️  Payments module: Database connection failed. Will retry on first query.');
      }
      // Don't throw - allow app to start
    }
  }

  async onModuleDestroy() {
    await this.pool.end();
  }

  async createPayment(
    userId: string,
    data: {
      amount: number;
      currency: string;
      razorpay_order_id: string | null;
      metadata: Record<string, any> | null;
    },
  ): Promise<Payment> {
    const query = `
      INSERT INTO payments (
        user_id, amount, currency, status, razorpay_order_id, metadata
      )
      VALUES ($1, $2, $3, 'PENDING', $4, $5)
      RETURNING id, user_id, amount, currency, status, razorpay_order_id,
                razorpay_payment_id, razorpay_signature, metadata, created_at, updated_at
    `;

    const result: QueryResult = await this.pool.query(query, [
      userId,
      data.amount,
      data.currency,
      data.razorpay_order_id,
      data.metadata ? JSON.stringify(data.metadata) : null,
    ]);

    const row = result.rows[0];
    return {
      id: row.id,
      user_id: row.user_id,
      amount: parseFloat(row.amount),
      currency: row.currency,
      status: row.status as PaymentStatus,
      razorpay_order_id: row.razorpay_order_id,
      razorpay_payment_id: row.razorpay_payment_id,
      razorpay_signature: row.razorpay_signature,
      metadata: row.metadata
        ? typeof row.metadata === 'string'
          ? JSON.parse(row.metadata)
          : row.metadata
        : null,
      created_at: row.created_at,
      updated_at: row.updated_at,
    } as Payment;
  }

  async findAllPayments(): Promise<Payment[]> {
    const query = `
      SELECT id, user_id, amount, currency, status, razorpay_order_id,
             razorpay_payment_id, razorpay_signature, metadata, created_at, updated_at
      FROM payments
      ORDER BY created_at DESC
    `;

    const result: QueryResult = await this.pool.query(query);
    return result.rows.map((row) => ({
      id: row.id,
      user_id: row.user_id,
      amount: parseFloat(row.amount),
      currency: row.currency,
      status: row.status as PaymentStatus,
      razorpay_order_id: row.razorpay_order_id,
      razorpay_payment_id: row.razorpay_payment_id,
      razorpay_signature: row.razorpay_signature,
      metadata: row.metadata
        ? typeof row.metadata === 'string'
          ? JSON.parse(row.metadata)
          : row.metadata
        : null,
      created_at: row.created_at,
      updated_at: row.updated_at,
    })) as Payment[];
  }

  async findPaymentById(id: string): Promise<Payment | null> {
    const query = `
      SELECT id, user_id, amount, currency, status, razorpay_order_id,
             razorpay_payment_id, razorpay_signature, metadata, created_at, updated_at
      FROM payments
      WHERE id = $1
      LIMIT 1
    `;

    const result: QueryResult = await this.pool.query(query, [id]);

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: row.id,
      user_id: row.user_id,
      amount: parseFloat(row.amount),
      currency: row.currency,
      status: row.status as PaymentStatus,
      razorpay_order_id: row.razorpay_order_id,
      razorpay_payment_id: row.razorpay_payment_id,
      razorpay_signature: row.razorpay_signature,
      metadata: row.metadata
        ? typeof row.metadata === 'string'
          ? JSON.parse(row.metadata)
          : row.metadata
        : null,
      created_at: row.created_at,
      updated_at: row.updated_at,
    } as Payment;
  }

  async findPaymentByRazorpayOrderId(razorpayOrderId: string): Promise<Payment | null> {
    const query = `
      SELECT id, user_id, amount, currency, status, razorpay_order_id,
             razorpay_payment_id, razorpay_signature, metadata, created_at, updated_at
      FROM payments
      WHERE razorpay_order_id = $1
      LIMIT 1
    `;

    const result: QueryResult = await this.pool.query(query, [razorpayOrderId]);

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: row.id,
      user_id: row.user_id,
      amount: parseFloat(row.amount),
      currency: row.currency,
      status: row.status as PaymentStatus,
      razorpay_order_id: row.razorpay_order_id,
      razorpay_payment_id: row.razorpay_payment_id,
      razorpay_signature: row.razorpay_signature,
      metadata: row.metadata
        ? typeof row.metadata === 'string'
          ? JSON.parse(row.metadata)
          : row.metadata
        : null,
      created_at: row.created_at,
      updated_at: row.updated_at,
    } as Payment;
  }

  async findPaymentByRazorpayPaymentId(razorpayPaymentId: string): Promise<Payment | null> {
    const query = `
      SELECT id, user_id, amount, currency, status, razorpay_order_id,
             razorpay_payment_id, razorpay_signature, metadata, created_at, updated_at
      FROM payments
      WHERE razorpay_payment_id = $1
      LIMIT 1
    `;

    const result: QueryResult = await this.pool.query(query, [razorpayPaymentId]);

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: row.id,
      user_id: row.user_id,
      amount: parseFloat(row.amount),
      currency: row.currency,
      status: row.status as PaymentStatus,
      razorpay_order_id: row.razorpay_order_id,
      razorpay_payment_id: row.razorpay_payment_id,
      razorpay_signature: row.razorpay_signature,
      metadata: row.metadata
        ? typeof row.metadata === 'string'
          ? JSON.parse(row.metadata)
          : row.metadata
        : null,
      created_at: row.created_at,
      updated_at: row.updated_at,
    } as Payment;
  }

  async updatePaymentStatus(
    id: string,
    status: PaymentStatus,
    razorpayPaymentId: string | null = null,
    razorpaySignature: string | null = null,
  ): Promise<Payment> {
    const updates: string[] = ['status = $1', 'updated_at = NOW()'];
    const values: any[] = [status];
    let paramCount = 2;

    if (razorpayPaymentId !== null) {
      updates.push(`razorpay_payment_id = $${paramCount++}`);
      values.push(razorpayPaymentId);
    }

    if (razorpaySignature !== null) {
      updates.push(`razorpay_signature = $${paramCount++}`);
      values.push(razorpaySignature);
    }

    values.push(id);

    const query = `
      UPDATE payments
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING id, user_id, amount, currency, status, razorpay_order_id,
                razorpay_payment_id, razorpay_signature, metadata, created_at, updated_at
    `;

    const result: QueryResult = await this.pool.query(query, values);

    if (result.rows.length === 0) {
      throw new Error('Payment not found');
    }

    const row = result.rows[0];
    return {
      id: row.id,
      user_id: row.user_id,
      amount: parseFloat(row.amount),
      currency: row.currency,
      status: row.status as PaymentStatus,
      razorpay_order_id: row.razorpay_order_id,
      razorpay_payment_id: row.razorpay_payment_id,
      razorpay_signature: row.razorpay_signature,
      metadata: row.metadata
        ? typeof row.metadata === 'string'
          ? JSON.parse(row.metadata)
          : row.metadata
        : null,
      created_at: row.created_at,
      updated_at: row.updated_at,
    } as Payment;
  }
}

