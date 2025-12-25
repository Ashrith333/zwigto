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
      max: 20,
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
      // Check if default_pin column exists, if not, use COALESCE to return null
      const query = `
        SELECT id, phone, role, COALESCE(default_pin, NULL) as default_pin, created_at
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
        created_at: row.created_at,
      } as User;
    } catch (error: any) {
      const errorMessage = error?.message || 'Unknown error';
      // If column doesn't exist, try without it
      if (errorMessage.includes('column "default_pin" does not exist')) {
        console.warn('⚠️  default_pin column does not exist. Please run ADD_USER_DEFAULT_PIN.sql migration.');
        const fallbackQuery = `
          SELECT id, phone, role, created_at
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
          default_pin: null,
          created_at: row.created_at,
        } as User;
      }
      throw error;
    }
  }
}

