import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Pool, QueryResult } from 'pg';
import { Restaurant, RestaurantUser, RestaurantChangeRequest } from '../interfaces/restaurant.interface';

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
      console.log('Restaurants module database connection established');
    } catch (error: any) {
      const errorMessage = error?.message || 'Unknown error';
      if (errorMessage.includes('Circuit breaker') || errorMessage.includes('authentication')) {
        console.warn('⚠️  Restaurants module: Database connection failed (circuit breaker or auth issue). Will retry on first query.');
        console.warn('   Please verify DATABASE_URL in .env file. See FIX_DATABASE_CONNECTION.md for help.');
      } else {
        console.warn('⚠️  Restaurants module: Database connection failed. Will retry on first query.');
      }
      // Don't throw - allow app to start, connection will be retried on first query
    }
  }

  async onModuleDestroy() {
    await this.pool.end();
  }

  async createRestaurant(data: {
    name: string;
    description?: string;
    address: string;
    latitude: number;
    longitude: number;
    phone?: string;
    email?: string;
    payment_account?: string;
  }): Promise<Restaurant> {
    try {
      const query = `
        INSERT INTO restaurants (
          name, description, address, latitude, longitude,
          phone, email, payment_account, status
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'PENDING')
        RETURNING id, name, description, address, latitude, longitude,
                  phone, email, payment_account, status, rejection_reason, created_at, updated_at
      `;

      // Convert empty strings to null for optional fields
      const description = data.description && data.description.trim() ? data.description.trim() : null;
      const phone = data.phone && data.phone.trim() ? data.phone.trim() : null;
      const email = data.email && data.email.trim() ? data.email.trim() : null;
      const paymentAccount = data.payment_account && data.payment_account.trim() ? data.payment_account.trim() : null;

      const result: QueryResult = await this.pool.query(query, [
        data.name.trim(),
        description,
        data.address.trim(),
        data.latitude,
        data.longitude,
        phone,
        email,
        paymentAccount,
      ]);

      if (result.rows.length === 0) {
        throw new Error('Failed to create restaurant - no data returned from database');
      }

      return result.rows[0] as Restaurant;
    } catch (error: any) {
      console.error('Database error creating restaurant:', {
        message: error?.message,
        code: error?.code,
        detail: error?.detail,
        constraint: error?.constraint,
      });
      throw new Error(`Failed to create restaurant: ${error?.message || 'Unknown error'}`);
    }
  }

  async findAllRestaurants(): Promise<Restaurant[]> {
    const query = `
      SELECT 
        r.id, 
        r.name, 
        r.description, 
        r.address, 
        r.latitude, 
        r.longitude,
        r.phone, 
        r.email, 
        r.payment_account, 
        r.status, 
        r.rejection_reason, 
        r.created_at, 
        r.updated_at,
        COALESCE(
          (SELECT ROUND(AVG(rating)::numeric, 1) 
           FROM reviews 
           WHERE restaurant_id = r.id), 
          0
        ) AS average_rating,
        COALESCE(
          (SELECT ROUND(AVG(prep_time_minutes)::numeric, 0) 
           FROM menu_items 
           WHERE restaurant_id = r.id AND is_available = true), 
          0
        ) AS avg_prep_time_minutes
      FROM restaurants r
      WHERE r.status = 'ACTIVE'
      ORDER BY r.created_at DESC
    `;

    const result: QueryResult = await this.pool.query(query);
    return result.rows as Restaurant[];
  }

  async findPendingRestaurants(): Promise<Restaurant[]> {
    const query = `
      SELECT id, name, description, address, latitude, longitude,
             phone, email, payment_account, status, rejection_reason, created_at, updated_at
      FROM restaurants
      WHERE status = 'PENDING'
      ORDER BY created_at DESC
    `;

    const result: QueryResult = await this.pool.query(query);
    return result.rows as Restaurant[];
  }

  async findRestaurantById(id: string): Promise<Restaurant | null> {
    const query = `
      SELECT 
        r.id, 
        r.name, 
        r.description, 
        r.address, 
        r.latitude, 
        r.longitude,
        r.phone, 
        r.email, 
        r.payment_account, 
        r.status, 
        r.rejection_reason, 
        r.created_at, 
        r.updated_at,
        COALESCE(
          (SELECT ROUND(AVG(rating)::numeric, 1) 
           FROM reviews 
           WHERE restaurant_id = r.id), 
          0
        ) AS average_rating,
        COALESCE(
          (SELECT ROUND(AVG(prep_time_minutes)::numeric, 0) 
           FROM menu_items 
           WHERE restaurant_id = r.id AND is_available = true), 
          0
        ) AS avg_prep_time_minutes
      FROM restaurants r
      WHERE r.id = $1
      LIMIT 1
    `;

    const result: QueryResult = await this.pool.query(query, [id]);

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0] as Restaurant;
  }

  async updateRestaurant(
    id: string,
    data: {
      name?: string;
      description?: string;
      address?: string;
      latitude?: number;
      longitude?: number;
      phone?: string;
      email?: string;
      payment_account?: string;
    },
  ): Promise<Restaurant> {
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (data.name !== undefined) {
      updates.push(`name = $${paramCount++}`);
      values.push(data.name);
    }
    if (data.description !== undefined) {
      updates.push(`description = $${paramCount++}`);
      values.push(data.description);
    }
    if (data.address !== undefined) {
      updates.push(`address = $${paramCount++}`);
      values.push(data.address);
    }
    if (data.latitude !== undefined) {
      updates.push(`latitude = $${paramCount++}`);
      values.push(data.latitude);
    }
    if (data.longitude !== undefined) {
      updates.push(`longitude = $${paramCount++}`);
      values.push(data.longitude);
    }
    if (data.phone !== undefined) {
      updates.push(`phone = $${paramCount++}`);
      values.push(data.phone);
    }
    if (data.email !== undefined) {
      updates.push(`email = $${paramCount++}`);
      values.push(data.email);
    }
    if (data.payment_account !== undefined) {
      updates.push(`payment_account = $${paramCount++}`);
      values.push(data.payment_account);
    }

    if (updates.length === 0) {
      return this.findRestaurantById(id);
    }

    updates.push(`updated_at = NOW()`);
    values.push(id);

    const query = `
      UPDATE restaurants
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING id, name, description, address, latitude, longitude,
                phone, email, payment_account, status, rejection_reason, created_at, updated_at
    `;

    const result: QueryResult = await this.pool.query(query, values);

    if (result.rows.length === 0) {
      throw new Error('Restaurant not found');
    }

    return result.rows[0] as Restaurant;
  }

  async findRestaurantUserByUserId(userId: string): Promise<RestaurantUser | null> {
    const query = `
      SELECT id, restaurant_id, user_id, created_at
      FROM restaurant_users
      WHERE user_id = $1
      LIMIT 1
    `;

    const result: QueryResult = await this.pool.query(query, [userId]);

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0] as RestaurantUser;
  }

  async createRestaurantUser(userId: string, restaurantId: string): Promise<RestaurantUser> {
    // First check if user already has a restaurant link
    const existing = await this.findRestaurantUserByUserId(userId);
    if (existing) {
      // Update existing link
      const updateQuery = `
        UPDATE restaurant_users
        SET restaurant_id = $1
        WHERE user_id = $2
        RETURNING id, user_id, restaurant_id, created_at
      `;
      const result: QueryResult = await this.pool.query(updateQuery, [restaurantId, userId]);
      return result.rows[0] as RestaurantUser;
    }

    // Create new link
    const insertQuery = `
      INSERT INTO restaurant_users (user_id, restaurant_id)
      VALUES ($1, $2)
      RETURNING id, user_id, restaurant_id, created_at
    `;

    const result: QueryResult = await this.pool.query(insertQuery, [userId, restaurantId]);

    if (result.rows.length === 0) {
      throw new Error('Failed to create restaurant user link');
    }

    return result.rows[0] as RestaurantUser;
  }

  async findPendingChangeRequestByRestaurantId(restaurantId: string): Promise<RestaurantChangeRequest | null> {
    const query = `
      SELECT id, restaurant_id, requested_fields, status, created_at, updated_at
      FROM restaurant_change_requests
      WHERE restaurant_id = $1 AND status = 'PENDING'
      ORDER BY created_at DESC
      LIMIT 1
    `;

    const result: QueryResult = await this.pool.query(query, [restaurantId]);

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0] as RestaurantChangeRequest;
  }

  async createChangeRequest(
    restaurantId: string,
    requestedFields: Record<string, any>,
  ): Promise<RestaurantChangeRequest> {
    // Check if there's already a pending change request for this restaurant
    const existing = await this.findPendingChangeRequestByRestaurantId(restaurantId);
    
    if (existing) {
      // Update existing pending change request with new fields (merge with existing)
      const mergedFields = { ...existing.requested_fields, ...requestedFields };
      const updateQuery = `
        UPDATE restaurant_change_requests
        SET requested_fields = $1, updated_at = NOW()
        WHERE id = $2
        RETURNING id, restaurant_id, requested_fields, status, created_at, updated_at
      `;

      const result: QueryResult = await this.pool.query(updateQuery, [
        JSON.stringify(mergedFields),
        existing.id,
      ]);

      return result.rows[0] as RestaurantChangeRequest;
    }

    // Create new change request
    const query = `
      INSERT INTO restaurant_change_requests (restaurant_id, requested_fields, status)
      VALUES ($1, $2, 'PENDING')
      RETURNING id, restaurant_id, requested_fields, status, created_at, updated_at
    `;

    const result: QueryResult = await this.pool.query(query, [
      restaurantId,
      JSON.stringify(requestedFields),
    ]);

    return result.rows[0] as RestaurantChangeRequest;
  }

  async findAllChangeRequests(): Promise<RestaurantChangeRequest[]> {
    const query = `
      SELECT id, restaurant_id, requested_fields, status, created_at, updated_at
      FROM restaurant_change_requests
      ORDER BY created_at DESC
    `;

    const result: QueryResult = await this.pool.query(query);
    return result.rows as RestaurantChangeRequest[];
  }

  async findChangeRequestById(id: string): Promise<RestaurantChangeRequest | null> {
    const query = `
      SELECT id, restaurant_id, requested_fields, status, created_at, updated_at
      FROM restaurant_change_requests
      WHERE id = $1
      LIMIT 1
    `;

    const result: QueryResult = await this.pool.query(query, [id]);

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      ...row,
      requested_fields: typeof row.requested_fields === 'string' 
        ? JSON.parse(row.requested_fields) 
        : row.requested_fields,
    } as RestaurantChangeRequest;
  }

  async updateChangeRequestStatus(
    id: string,
    status: 'APPROVED' | 'REJECTED',
  ): Promise<RestaurantChangeRequest> {
    const query = `
      UPDATE restaurant_change_requests
      SET status = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING id, restaurant_id, requested_fields, status, created_at, updated_at
    `;

    const result: QueryResult = await this.pool.query(query, [status, id]);

    if (result.rows.length === 0) {
      throw new Error('Change request not found');
    }

    const row = result.rows[0];
    return {
      ...row,
      requested_fields: typeof row.requested_fields === 'string' 
        ? JSON.parse(row.requested_fields) 
        : row.requested_fields,
    } as RestaurantChangeRequest;
  }

  async applyChangeRequest(restaurantId: string, fields: Record<string, any>): Promise<Restaurant> {
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (fields.name !== undefined) {
      updates.push(`name = $${paramCount++}`);
      values.push(fields.name);
    }
    if (fields.address !== undefined) {
      updates.push(`address = $${paramCount++}`);
      values.push(fields.address);
    }
    if (fields.latitude !== undefined) {
      updates.push(`latitude = $${paramCount++}`);
      values.push(fields.latitude);
    }
    if (fields.longitude !== undefined) {
      updates.push(`longitude = $${paramCount++}`);
      values.push(fields.longitude);
    }
    if (fields.payment_account !== undefined) {
      updates.push(`payment_account = $${paramCount++}`);
      values.push(fields.payment_account);
    }

    if (updates.length === 0) {
      return this.findRestaurantById(restaurantId);
    }

    updates.push(`updated_at = NOW()`);
    values.push(restaurantId);

    const query = `
      UPDATE restaurants
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING id, name, description, address, latitude, longitude,
                phone, email, payment_account, status, rejection_reason, created_at, updated_at
    `;

    const result: QueryResult = await this.pool.query(query, values);

    if (result.rows.length === 0) {
      throw new Error('Restaurant not found');
    }

    return result.rows[0] as Restaurant;
  }

  async updateRestaurantStatus(
    id: string,
    status: 'ACTIVE' | 'PAUSED' | 'PENDING' | 'REJECTED',
    rejectionReason?: string,
  ): Promise<Restaurant> {
    const updates: string[] = ['status = $1', 'updated_at = NOW()'];
    const values: any[] = [status];
    
    if (rejectionReason !== undefined) {
      updates.push(`rejection_reason = $${values.length + 1}`);
      values.push(rejectionReason);
    } else if (status !== 'REJECTED') {
      // Clear rejection reason if status is not REJECTED
      updates.push(`rejection_reason = NULL`);
    }
    
    values.push(id);
    
    const query = `
      UPDATE restaurants
      SET ${updates.join(', ')}
      WHERE id = $${values.length}
      RETURNING id, name, description, address, latitude, longitude,
                phone, email, payment_account, status, rejection_reason, created_at, updated_at
    `;

    const result: QueryResult = await this.pool.query(query, values);

    if (result.rows.length === 0) {
      throw new Error('Restaurant not found');
    }

    return result.rows[0] as Restaurant;
  }
}

