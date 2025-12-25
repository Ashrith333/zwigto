import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { DatabaseProvider } from './providers/database.provider';
import { CreateReviewDto } from './dto/create-review.dto';
import { ReviewDto } from './dto/review.dto';
import { RestaurantRatingDto } from './dto/restaurant-rating.dto';
import { Review } from './interfaces/review.interface';
import { OrdersService } from '../orders/orders.service';
import { OrderStatus } from '../orders/interfaces/order.interface';

@Injectable()
export class ReviewsService {
  private readonly EDIT_WINDOW_HOURS = 24; // 24 hours to edit review

  constructor(
    private readonly databaseProvider: DatabaseProvider,
    private readonly ordersService: OrdersService,
  ) {}

  async createReview(userId: string, dto: CreateReviewDto): Promise<ReviewDto> {
    const order = await this.ordersService.getOrder(dto.order_id, userId);

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.user_id !== userId) {
      throw new ForbiddenException('You can only review your own orders');
    }

    if (order.status !== OrderStatus.PICKED_UP) {
      throw new BadRequestException(
        `Order must be PICKED_UP to leave a review. Current status: ${order.status}`,
      );
    }

    const existingReview = await this.databaseProvider.findReviewByOrderId(
      dto.order_id,
    );

    if (existingReview) {
      throw new BadRequestException('Review already exists for this order');
    }

    const review = await this.databaseProvider.createReview(
      dto.order_id,
      userId,
      order.restaurant_id,
      dto.rating,
      dto.comment || null,
    );

    return this.mapToDto(review);
  }

  async updateReview(
    reviewId: string,
    userId: string,
    rating: number,
    comment: string | null,
  ): Promise<ReviewDto> {
    const review = await this.databaseProvider.findReviewById(reviewId);

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    if (review.user_id !== userId) {
      throw new ForbiddenException('You can only edit your own reviews');
    }

    const canEdit = await this.databaseProvider.canEditReview(
      reviewId,
      this.EDIT_WINDOW_HOURS,
    );

    if (!canEdit) {
      throw new BadRequestException(
        `Review can only be edited within ${this.EDIT_WINDOW_HOURS} hours of creation`,
      );
    }

    if (rating < 1 || rating > 5) {
      throw new BadRequestException('Rating must be between 1 and 5');
    }

    const updated = await this.databaseProvider.updateReview(reviewId, rating, comment);

    return this.mapToDto(updated);
  }

  async getReview(reviewId: string): Promise<ReviewDto> {
    const review = await this.databaseProvider.findReviewById(reviewId);

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    return this.mapToDto(review);
  }

  async getRestaurantReviews(restaurantId: string): Promise<ReviewDto[]> {
    const reviews = await this.databaseProvider.findReviewsByRestaurantId(restaurantId);
    return reviews.map((review) => this.mapToDto(review));
  }

  async getRestaurantRating(restaurantId: string): Promise<RestaurantRatingDto> {
    const rating = await this.databaseProvider.getRestaurantRating(restaurantId);

    if (!rating) {
      return {
        restaurant_id: restaurantId,
        average_rating: 0,
        total_reviews: 0,
      };
    }

    return {
      restaurant_id: rating.restaurant_id,
      average_rating: rating.average_rating,
      total_reviews: rating.total_reviews,
    };
  }

  private mapToDto(review: Review): ReviewDto {
    return {
      id: review.id,
      order_id: review.order_id,
      user_id: review.user_id,
      restaurant_id: review.restaurant_id,
      rating: review.rating,
      comment: review.comment,
      created_at: review.created_at,
      updated_at: review.updated_at,
    };
  }
}

