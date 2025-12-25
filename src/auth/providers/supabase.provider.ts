import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Pool, QueryResult } from 'pg';
import { User } from '../interfaces/user.interface';

@Injectable()
export class SupabaseProvider implements OnModuleInit, OnModuleDestroy {
  private pool: Pool;

  constructor() {
    let connectionString = process.env.DATABASE_URL;
    
    if (!connectionString) {
      connectionString = 'postgresql://postgres.lreibhelpqsfnefnthtc:Ashashashash333@aws-1-ap-south-1.pooler.supabase.com:6543/postgres';
      console.warn('DATABASE_URL not found in environment, using fallback');
    }

    this.pool = new Pool({
      connectionString,
      ssl: {
        rejectUnauthorized: false,
      },
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });
  }

  async onModuleInit() {
    try {
      const result = await this.pool.query('SELECT NOW()');
      console.log('Auth module database connection established');
    } catch (error: any) {
      const errorMessage = error?.message || 'Unknown error';
      if (errorMessage.includes('Circuit breaker') || errorMessage.includes('authentication')) {
        console.warn('⚠️  Auth module: Database connection failed (circuit breaker or auth issue). Will retry on first query.');
        console.warn('   Please verify DATABASE_URL in .env file. See FIX_DATABASE_CONNECTION.md for help.');
      } else {
        console.warn('⚠️  Auth module: Database connection failed. Will retry on first query.');
      }
      // Don't throw - allow app to start, connection will be retried on first query
    }
  }

  async onModuleDestroy() {
    await this.pool.end();
  }

  async findUserByPhone(phone: string): Promise<User | null> {
    try {
      const query = `
        SELECT id, phone, password_hash, role
        FROM users
        WHERE phone = $1
        LIMIT 1
      `;

      const result: QueryResult = await this.pool.query(query, [phone]);

      if (result.rows.length === 0) {
        return null;
      }

      return result.rows[0] as User;
    } catch (error: any) {
      const errorMessage = error?.message || 'Unknown error';
      if (errorMessage.includes('Circuit breaker')) {
        throw new Error('Database connection is temporarily blocked. Please wait a few minutes and verify your DATABASE_URL password in .env file. See FIX_DATABASE_CONNECTION.md for help.');
      }
      if (errorMessage.includes('password authentication failed')) {
        throw new Error('Database authentication failed. Please verify DATABASE_URL password in .env file.');
      }
      throw new Error(`Database error: ${errorMessage}`);
    }
  }

  async findUserById(id: string): Promise<User | null> {
    try {
      const query = `
        SELECT id, phone, password_hash, role, default_pin
        FROM users
        WHERE id = $1
        LIMIT 1
      `;

      const result: QueryResult = await this.pool.query(query, [id]);

      if (result.rows.length === 0) {
        return null;
      }

      return result.rows[0] as User;
    } catch (error: any) {
      const errorMessage = error?.message || 'Unknown error';
      if (errorMessage.includes('Circuit breaker')) {
        throw new Error('Database connection is temporarily blocked. Please wait a few minutes and verify your DATABASE_URL password in .env file.');
      }
      if (errorMessage.includes('password authentication failed')) {
        throw new Error('Database authentication failed. Please verify DATABASE_URL password in .env file.');
      }
      throw new Error(`Database error: ${errorMessage}`);
    }
  }

  async createUser(phone: string, role: string = 'USER'): Promise<User> {
    try {
      // Generate a random 4-digit PIN for the user
      const defaultPin = Math.floor(1000 + Math.random() * 9000).toString();
      
      const query = `
        INSERT INTO users (phone, role, password_hash, default_pin)
        VALUES ($1, $2, NULL, $3)
        RETURNING id, phone, password_hash, role, default_pin
      `;

      const result: QueryResult = await this.pool.query(query, [phone, role, defaultPin]);

      if (result.rows.length === 0) {
        throw new Error('Failed to create user');
      }

      return result.rows[0] as User;
    } catch (error: any) {
      const errorMessage = error?.message || 'Unknown error';
      if (errorMessage.includes('Circuit breaker')) {
        throw new Error('Database connection is temporarily blocked. Please wait a few minutes and verify your DATABASE_URL password in .env file.');
      }
      if (errorMessage.includes('password authentication failed')) {
        throw new Error('Database authentication failed. Please verify DATABASE_URL password in .env file.');
      }
      throw error;
    }
  }

  async updateUserRole(userId: string, role: string): Promise<void> {
    try {
      const query = `
        UPDATE users
        SET role = $1
        WHERE id = $2
      `;
      await this.pool.query(query, [role, userId]);
    } catch (error: any) {
      const errorMessage = error?.message || 'Unknown error';
      if (errorMessage.includes('Circuit breaker')) {
        throw new Error('Database connection is temporarily blocked. Please wait a few minutes and verify your DATABASE_URL password in .env file.');
      }
      if (errorMessage.includes('password authentication failed')) {
        throw new Error('Database authentication failed. Please verify DATABASE_URL password in .env file.');
      }
      throw error;
    }
  }

  async updateUserPassword(userId: string, passwordHash: string): Promise<void> {
    try {
      const query = `
        UPDATE users
        SET password_hash = $1
        WHERE id = $2
      `;

      const result: QueryResult = await this.pool.query(query, [passwordHash, userId]);

      if (result.rowCount === 0) {
        throw new Error('Failed to update password: User not found');
      }
    } catch (error: any) {
      const errorMessage = error?.message || 'Unknown error';
      if (errorMessage.includes('Circuit breaker')) {
        throw new Error('Database connection is temporarily blocked. Please wait a few minutes and verify your DATABASE_URL password in .env file.');
      }
      if (errorMessage.includes('password authentication failed')) {
        throw new Error('Database authentication failed. Please verify DATABASE_URL password in .env file.');
      }
      throw error;
    }
  }
}
