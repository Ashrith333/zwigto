import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Pool, QueryResult } from 'pg';
import { Review, RestaurantRating } from '../interfaces/review.interface';

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
      console.log('Reviews module database connection established');
    } catch (error: any) {
      const errorMessage = error?.message || 'Unknown error';
      if (errorMessage.includes('Circuit breaker') || errorMessage.includes('authentication')) {
        console.warn('⚠️  Reviews module: Database connection failed (circuit breaker or auth issue). Will retry on first query.');
      } else {
        console.warn('⚠️  Reviews module: Database connection failed. Will retry on first query.');
      }
      // Don't throw - allow app to start
    }
  }

  async onModuleDestroy() {
    await this.pool.end();
  }

  async createReview(
    orderId: string,
    userId: string,
    restaurantId: string,
    rating: number,
    comment: string | null,
  ): Promise<Review> {
    const query = `
      INSERT INTO reviews (order_id, user_id, restaurant_id, rating, comment)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, order_id, user_id, restaurant_id, rating, comment, created_at, updated_at
    `;

    const result: QueryResult = await this.pool.query(query, [
      orderId,
      userId,
      restaurantId,
      rating,
      comment || null,
    ]);

    return result.rows[0] as Review;
  }

  async findReviewByOrderId(orderId: string): Promise<Review | null> {
    const query = `
      SELECT id, order_id, user_id, restaurant_id, rating, comment, created_at, updated_at
      FROM reviews
      WHERE order_id = $1
      LIMIT 1
    `;

    const result: QueryResult = await this.pool.query(query, [orderId]);

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0] as Review;
  }

  async findReviewById(id: string): Promise<Review | null> {
    const query = `
      SELECT id, order_id, user_id, restaurant_id, rating, comment, created_at, updated_at
      FROM reviews
      WHERE id = $1
      LIMIT 1
    `;

    const result: QueryResult = await this.pool.query(query, [id]);

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0] as Review;
  }

  async findReviewsByRestaurantId(restaurantId: string): Promise<Review[]> {
    const query = `
      SELECT id, order_id, user_id, restaurant_id, rating, comment, created_at, updated_at
      FROM reviews
      WHERE restaurant_id = $1
      ORDER BY created_at DESC
    `;

    const result: QueryResult = await this.pool.query(query, [restaurantId]);

    return result.rows as Review[];
  }

  async getRestaurantRating(restaurantId: string): Promise<RestaurantRating | null> {
    const query = `
      SELECT 
        restaurant_id,
        ROUND(AVG(rating)::numeric, 2) AS average_rating,
        COUNT(*)::int AS total_reviews
      FROM reviews
      WHERE restaurant_id = $1
      GROUP BY restaurant_id
    `;

    const result: QueryResult = await this.pool.query(query, [restaurantId]);

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      restaurant_id: row.restaurant_id,
      average_rating: parseFloat(row.average_rating),
      total_reviews: parseInt(row.total_reviews, 10),
    };
  }

  async updateReview(
    id: string,
    rating: number,
    comment: string | null,
  ): Promise<Review> {
    const query = `
      UPDATE reviews
      SET rating = $1, comment = $2, updated_at = NOW()
      WHERE id = $3
      RETURNING id, order_id, user_id, restaurant_id, rating, comment, created_at, updated_at
    `;

    const result: QueryResult = await this.pool.query(query, [rating, comment || null, id]);

    if (result.rows.length === 0) {
      throw new Error('Review not found');
    }

    return result.rows[0] as Review;
  }

  async canEditReview(reviewId: string, editWindowHours: number): Promise<boolean> {
    const query = `
      SELECT created_at
      FROM reviews
      WHERE id = $1
    `;

    const result: QueryResult = await this.pool.query(query, [reviewId]);

    if (result.rows.length === 0) {
      return false;
    }

    const createdAt = new Date(result.rows[0].created_at);
    const now = new Date();
    const hoursSinceCreation = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);

    return hoursSinceCreation <= editWindowHours;
  }
}

