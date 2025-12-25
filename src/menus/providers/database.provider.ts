import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Pool, QueryResult } from 'pg';
import { MenuItem } from '../interfaces/menu-item.interface';

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
      console.log('Menus module database connection established');
    } catch (error: any) {
      const errorMessage = error?.message || 'Unknown error';
      if (errorMessage.includes('Circuit breaker') || errorMessage.includes('authentication')) {
        console.warn('⚠️  Menus module: Database connection failed (circuit breaker or auth issue). Will retry on first query.');
      } else {
        console.warn('⚠️  Menus module: Database connection failed. Will retry on first query.');
      }
      // Don't throw - allow app to start
    }
  }

  async onModuleDestroy() {
    await this.pool.end();
  }

  async createMenuItem(
    restaurantId: string,
    data: {
      name: string;
      description?: string;
      price: number;
      prep_time_minutes: number;
      food_type?: string;
      image_url?: string;
    },
  ): Promise<MenuItem> {
    const query = `
      INSERT INTO menu_items (
        restaurant_id, name, description, price, prep_time_minutes, food_type, image_url, is_available
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, true)
      RETURNING id, restaurant_id, name, description, price, prep_time_minutes,
                food_type, image_url, is_available, created_at, updated_at
    `;

    const result: QueryResult = await this.pool.query(query, [
      restaurantId,
      data.name,
      data.description || null,
      data.price,
      data.prep_time_minutes,
      data.food_type || null,
      data.image_url || null,
    ]);

    return result.rows[0] as MenuItem;
  }

  async findMenuItemById(id: string): Promise<MenuItem | null> {
    const query = `
      SELECT id, restaurant_id, name, description, price, prep_time_minutes,
             image_url, is_available, created_at, updated_at
      FROM menu_items
      WHERE id = $1
      LIMIT 1
    `;

    const result: QueryResult = await this.pool.query(query, [id]);

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0] as MenuItem;
  }

  async findMenuItemsByRestaurantId(restaurantId: string): Promise<MenuItem[]> {
    const query = `
      SELECT id, restaurant_id, name, description, price, prep_time_minutes,
             food_type, image_url, is_available, created_at, updated_at
      FROM menu_items
      WHERE restaurant_id = $1
      ORDER BY created_at DESC
    `;

    const result: QueryResult = await this.pool.query(query, [restaurantId]);

    return result.rows as MenuItem[];
  }

  async updateMenuItem(
    id: string,
    data: {
      name?: string;
      description?: string;
      price?: number;
      prep_time_minutes?: number;
      food_type?: string;
      image_url?: string;
      is_available?: boolean;
    },
  ): Promise<MenuItem> {
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
    if (data.price !== undefined) {
      updates.push(`price = $${paramCount++}`);
      values.push(data.price);
    }
    if (data.prep_time_minutes !== undefined) {
      updates.push(`prep_time_minutes = $${paramCount++}`);
      values.push(data.prep_time_minutes);
    }
    if (data.food_type !== undefined) {
      updates.push(`food_type = $${paramCount++}`);
      values.push(data.food_type);
    }
    if (data.image_url !== undefined) {
      updates.push(`image_url = $${paramCount++}`);
      values.push(data.image_url);
    }
    if (data.is_available !== undefined) {
      updates.push(`is_available = $${paramCount++}`);
      values.push(data.is_available);
    }

    if (updates.length === 0) {
      return this.findMenuItemById(id);
    }

    updates.push(`updated_at = NOW()`);
    values.push(id);

    const query = `
      UPDATE menu_items
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING id, restaurant_id, name, description, price, prep_time_minutes,
                food_type, image_url, is_available, created_at, updated_at
    `;

    const result: QueryResult = await this.pool.query(query, values);

    if (result.rows.length === 0) {
      throw new Error('Menu item not found');
    }

    return result.rows[0] as MenuItem;
  }

  async deleteMenuItem(id: string): Promise<void> {
    const query = `
      DELETE FROM menu_items
      WHERE id = $1
    `;

    const result: QueryResult = await this.pool.query(query, [id]);

    if (result.rowCount === 0) {
      throw new Error('Menu item not found');
    }
  }
}

