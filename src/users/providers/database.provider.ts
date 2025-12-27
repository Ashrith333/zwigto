import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Pool, QueryResult } from 'pg';
import { User } from '../interfaces/user.interface';

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
      console.log('Users module database connection established');
    } catch (error: any) {
      const errorMessage = error?.message || 'Unknown error';
      if (errorMessage.includes('Circuit breaker') || errorMessage.includes('authentication')) {
        console.warn('⚠️  Users module: Database connection failed (circuit breaker or auth issue). Will retry on first query.');
      } else {
        console.warn('⚠️  Users module: Database connection failed. Will retry on first query.');
      }
      // Don't throw - allow app to start
    }
  }

  async onModuleDestroy() {
    await this.pool.end();
  }

  async findUserById(id: string): Promise<User | null> {
    try {
      const query = `
        SELECT 
          id, 
          phone, 
          role, 
          COALESCE(default_pin, NULL) as default_pin,
          COALESCE(default_role, NULL) as default_role,
          COALESCE(name, NULL) as name,
          COALESCE(default_addresses, '[]'::jsonb) as default_addresses,
          created_at
        FROM users
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
        phone: row.phone,
        role: row.role,
        default_pin: row.default_pin || null,
        default_role: row.default_role || null,
        name: row.name || null,
        default_addresses: row.default_addresses || null,
        created_at: row.created_at,
      } as User;
    } catch (error: any) {
      const errorMessage = error?.message || 'Unknown error';
      // If columns don't exist, try with fallback
      if (errorMessage.includes('column') && errorMessage.includes('does not exist')) {
        console.warn('⚠️  Some columns may not exist. Please run ADD_USER_PROFILE_FIELDS.sql migration.');
        const fallbackQuery = `
          SELECT id, phone, role, COALESCE(default_pin, NULL) as default_pin, created_at
          FROM users
          WHERE id = $1
          LIMIT 1
        `;
        const result: QueryResult = await this.pool.query(fallbackQuery, [id]);
        if (result.rows.length === 0) {
          return null;
        }
        const row = result.rows[0];
        return {
          id: row.id,
          phone: row.phone,
          role: row.role,
          default_pin: row.default_pin || null,
          default_role: null,
          name: null,
          default_addresses: null,
          created_at: row.created_at,
        } as User;
      }
      throw error;
    }
  }

  async updateUserDefaultRole(userId: string, defaultRole: string): Promise<void> {
    try {
      const query = `
        UPDATE users
        SET default_role = $1
        WHERE id = $2
      `;
      await this.pool.query(query, [defaultRole, userId]);
    } catch (error: any) {
      const errorMessage = error?.message || 'Unknown error';
      if (errorMessage.includes('column') && errorMessage.includes('does not exist')) {
        console.warn('⚠️  default_role column does not exist. Please run ADD_USER_PROFILE_FIELDS.sql migration.');
        throw new Error('Database migration required. Please run ADD_USER_PROFILE_FIELDS.sql migration.');
      }
      throw error;
    }
  }

  async updateUserProfile(userId: string, name?: string, defaultAddresses?: any[]): Promise<void> {
    try {
      const updates: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (name !== undefined) {
        updates.push(`name = $${paramIndex++}`);
        values.push(name);
      }

      if (defaultAddresses !== undefined) {
        updates.push(`default_addresses = $${paramIndex++}::jsonb`);
        values.push(JSON.stringify(defaultAddresses));
      }

      if (updates.length === 0) {
        return; // No updates to make
      }

      values.push(userId);
      const query = `
        UPDATE users
        SET ${updates.join(', ')}
        WHERE id = $${paramIndex}
      `;
      await this.pool.query(query, values);
    } catch (error: any) {
      const errorMessage = error?.message || 'Unknown error';
      if (errorMessage.includes('column') && errorMessage.includes('does not exist')) {
        console.warn('⚠️  Some profile columns may not exist. Please run ADD_USER_PROFILE_FIELDS.sql migration.');
        // If name column doesn't exist but we're trying to update it, throw a helpful error
        if (name !== undefined && errorMessage.includes('name')) {
          throw new Error('Database migration required. Please run ADD_USER_PROFILE_FIELDS.sql migration to enable name updates.');
        }
        // For other columns, just log and continue
        if (defaultAddresses !== undefined && errorMessage.includes('default_addresses')) {
          throw new Error('Database migration required. Please run ADD_USER_PROFILE_FIELDS.sql migration to enable address updates.');
        }
      }
      throw error;
    }
  }
}

