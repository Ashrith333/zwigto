import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Pool, QueryResult } from 'pg';
import { Order, OrderItem, OrderStatus } from '../interfaces/order.interface';

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
      max: 5, // Reduced to prevent connection pool exhaustion
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });
  }

  async onModuleInit() {
    try {
      await this.pool.query('SELECT NOW()');
      console.log('Orders module database connection established');
    } catch (error: any) {
      const errorMessage = error?.message || 'Unknown error';
      if (errorMessage.includes('Circuit breaker') || errorMessage.includes('authentication')) {
        console.warn('⚠️  Orders module: Database connection failed (circuit breaker or auth issue). Will retry on first query.');
      } else {
        console.warn('⚠️  Orders module: Database connection failed. Will retry on first query.');
      }
      // Don't throw - allow app to start
    }
  }

  async onModuleDestroy() {
    await this.pool.end();
  }

  async createOrder(
    userId: string,
      data: {
      restaurant_id: string;
      payment_id: string | null;
      total_amount: number;
      route_polyline: Array<{ latitude: number; longitude: number }>;
      items: Array<{ menu_item_id: string; quantity: number; price: number }>;
      collection_pin: string | null;
    },
  ): Promise<Order> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      const orderQuery = `
        INSERT INTO orders (
          user_id, restaurant_id, status, total_amount, payment_id, route_polyline, collection_pin
        )
        VALUES ($1, $2, 'PENDING', $3, $4, $5::jsonb, $6)
        RETURNING id, user_id, restaurant_id, status, total_amount, payment_id,
                  route_polyline, collection_pin, pickup_time, created_at, updated_at
      `;

      const orderResult: QueryResult = await client.query(orderQuery, [
        userId,
        data.restaurant_id,
        data.total_amount,
        data.payment_id || null, // Use NULL for cash on pickup
        JSON.stringify(data.route_polyline || []),
        data.collection_pin || null,
      ]);

      const order = orderResult.rows[0];

      if (data.items.length > 0) {
        const orderItemsParams: any[] = [order.id];
        const orderItemsValues = data.items
          .map((item, index) => {
            const baseIndex = index * 3 + 2;
            orderItemsParams.push(item.menu_item_id, item.quantity, item.price);
            return `($1, $${baseIndex}, $${baseIndex + 1}, $${baseIndex + 2})`;
          })
          .join(', ');

        const orderItemsQuery = `
          INSERT INTO order_items (order_id, menu_item_id, quantity, price)
          VALUES ${orderItemsValues}
        `;

        try {
          await client.query(orderItemsQuery, orderItemsParams);
        } catch (itemsError: any) {
          console.error('Error inserting order items:', itemsError);
          throw new Error(`Failed to insert order items: ${itemsError.message || 'Database error'}`);
        }
      }

      await client.query('COMMIT');

      return {
        id: order.id,
        user_id: order.user_id,
        restaurant_id: order.restaurant_id,
        status: order.status as OrderStatus,
        total_amount: parseFloat(order.total_amount),
        payment_id: order.payment_id,
        collection_pin: order.collection_pin,
        route_polyline:
          typeof order.route_polyline === 'string'
            ? JSON.parse(order.route_polyline)
            : order.route_polyline,
        pickup_time: order.pickup_time,
        created_at: order.created_at,
        updated_at: order.updated_at,
      } as Order;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async findOrderById(id: string): Promise<Order | null> {
    const query = `
      SELECT id, user_id, restaurant_id, status, total_amount, payment_id,
             route_polyline, pickup_time, created_at, updated_at
      FROM orders
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
      restaurant_id: row.restaurant_id,
      status: row.status as OrderStatus,
      total_amount: parseFloat(row.total_amount),
      payment_id: row.payment_id,
      collection_pin: row.collection_pin,
      route_polyline:
        typeof row.route_polyline === 'string'
          ? JSON.parse(row.route_polyline)
          : row.route_polyline,
      pickup_time: row.pickup_time,
      created_at: row.created_at,
      updated_at: row.updated_at,
    } as Order;
  }

  async findOrdersByUserId(userId: string): Promise<Order[]> {
    const query = `
      SELECT id, user_id, restaurant_id, status, total_amount, payment_id,
             route_polyline, pickup_time, created_at, updated_at
      FROM orders
      WHERE user_id = $1
      ORDER BY created_at DESC
    `;

    const result: QueryResult = await this.pool.query(query, [userId]);

    return result.rows.map((row) => ({
      id: row.id,
      user_id: row.user_id,
      restaurant_id: row.restaurant_id,
      status: row.status as OrderStatus,
      total_amount: parseFloat(row.total_amount),
      payment_id: row.payment_id,
      collection_pin: row.collection_pin,
      route_polyline:
        typeof row.route_polyline === 'string'
          ? JSON.parse(row.route_polyline)
          : row.route_polyline,
      pickup_time: row.pickup_time,
      created_at: row.created_at,
      updated_at: row.updated_at,
    })) as Order[];
  }

  async findOrdersByRestaurantId(restaurantId: string): Promise<Order[]> {
    const query = `
      SELECT id, user_id, restaurant_id, status, total_amount, payment_id,
             route_polyline, pickup_time, created_at, updated_at
      FROM orders
      WHERE restaurant_id = $1
      ORDER BY created_at DESC
    `;

    const result: QueryResult = await this.pool.query(query, [restaurantId]);

    return result.rows.map((row) => ({
      id: row.id,
      user_id: row.user_id,
      restaurant_id: row.restaurant_id,
      status: row.status as OrderStatus,
      total_amount: parseFloat(row.total_amount),
      payment_id: row.payment_id,
      route_polyline:
        typeof row.route_polyline === 'string'
          ? JSON.parse(row.route_polyline)
          : row.route_polyline,
      pickup_time: row.pickup_time,
      created_at: row.created_at,
      updated_at: row.updated_at,
    })) as Order[];
  }

  async findAllOrders(): Promise<Order[]> {
    const query = `
      SELECT id, user_id, restaurant_id, status, total_amount, payment_id,
             route_polyline, collection_pin, pickup_time, created_at, updated_at
      FROM orders
      ORDER BY created_at DESC
    `;

    const result: QueryResult = await this.pool.query(query);

    return result.rows.map((row) => ({
      id: row.id,
      user_id: row.user_id,
      restaurant_id: row.restaurant_id,
      status: row.status as OrderStatus,
      total_amount: parseFloat(row.total_amount),
      payment_id: row.payment_id,
      collection_pin: row.collection_pin,
      route_polyline:
        typeof row.route_polyline === 'string'
          ? JSON.parse(row.route_polyline)
          : row.route_polyline,
      pickup_time: row.pickup_time,
      created_at: row.created_at,
      updated_at: row.updated_at,
    })) as Order[];
  }

  async updateOrderStatus(
    id: string,
    status: OrderStatus,
    pickupTime: Date | null = null,
  ): Promise<Order> {
    const updates: string[] = ['status = $1', 'updated_at = NOW()'];
    const values: any[] = [status];
    let paramCount = 2;

    if (pickupTime !== null) {
      updates.push(`pickup_time = $${paramCount++}`);
      values.push(pickupTime);
    }

    values.push(id);

    const query = `
      UPDATE orders
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING id, user_id, restaurant_id, status, total_amount, payment_id,
                route_polyline, collection_pin, pickup_time, created_at, updated_at
    `;

    const result: QueryResult = await this.pool.query(query, values);

    if (result.rows.length === 0) {
      throw new Error('Order not found');
    }

    const row = result.rows[0];
    return {
      id: row.id,
      user_id: row.user_id,
      restaurant_id: row.restaurant_id,
      status: row.status as OrderStatus,
      total_amount: parseFloat(row.total_amount),
      payment_id: row.payment_id,
      collection_pin: row.collection_pin,
      route_polyline:
        typeof row.route_polyline === 'string'
          ? JSON.parse(row.route_polyline)
          : row.route_polyline,
      pickup_time: row.pickup_time,
      created_at: row.created_at,
      updated_at: row.updated_at,
    } as Order;
  }

  async findOrderItemsByOrderId(orderId: string): Promise<any[]> {
    const query = `
      SELECT oi.id, oi.order_id, oi.menu_item_id, oi.quantity, oi.price, oi.created_at,
             mi.name as menu_item_name, mi.prep_time_minutes
      FROM order_items oi
      LEFT JOIN menu_items mi ON oi.menu_item_id = mi.id
      WHERE oi.order_id = $1
      ORDER BY oi.created_at ASC
    `;

    try {
      const result: QueryResult = await this.pool.query(query, [orderId]);

      return result.rows.map((row) => ({
        id: row.id,
        order_id: row.order_id,
        menu_item_id: row.menu_item_id,
        quantity: row.quantity,
        price: parseFloat(row.price || '0'),
        created_at: row.created_at,
        menu_item_name: row.menu_item_name,
        prep_time_minutes: row.prep_time_minutes,
      }));
    } catch (error: any) {
      console.error(`Error finding order items for order ${orderId}:`, error);
      throw new Error(`Failed to fetch order items: ${error.message || 'Database error'}`);
    }
  }
}

