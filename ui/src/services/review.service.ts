import { apiClient } from './api-client';
import {
  CreateReviewRequest,
  UpdateReviewRequest,
  ReplyReviewRequest,
  Review,
  RestaurantRating,
} from '../../shared/api-contracts';

class ReviewService {
  async createReview(request: CreateReviewRequest): Promise<Review> {
    return apiClient.post<Review>('/reviews', request);
  }

  async updateReview(reviewId: string, request: UpdateReviewRequest): Promise<Review> {
    return apiClient.patch<Review>(`/reviews/${reviewId}`, request);
  }

  async replyToReview(reviewId: string, request: ReplyReviewRequest): Promise<Review> {
    return apiClient.patch<Review>(`/reviews/${reviewId}/reply`, request);
  }

  async getReview(reviewId: string): Promise<Review> {
    return apiClient.get<Review>(`/reviews/${reviewId}`);
  }

  async getRestaurantReviews(restaurantId: string): Promise<Review[]> {
    return apiClient.get<Review[]>(`/reviews/restaurant/${restaurantId}`);
  }

  async getRestaurantRating(restaurantId: string): Promise<RestaurantRating> {
    return apiClient.get<RestaurantRating>(`/reviews/restaurant/${restaurantId}/rating`);
  }
}

export const reviewService = new ReviewService();

