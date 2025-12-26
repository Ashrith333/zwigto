import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Inject,
  forwardRef,
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
    @Inject(forwardRef(() => OrdersService))
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

  // Reviews are no longer editable once created
  // async updateReview(...) - REMOVED

  async replyToReview(
    reviewId: string,
    restaurantId: string,
    reply: string,
  ): Promise<ReviewDto> {
    const review = await this.databaseProvider.findReviewById(reviewId);

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    if (review.restaurant_id !== restaurantId) {
      throw new ForbiddenException('You can only reply to reviews for your restaurant');
    }

    if (!reply || reply.trim().length === 0) {
      throw new BadRequestException('Reply cannot be empty');
    }

    const updated = await this.databaseProvider.replyToReview(reviewId, restaurantId, reply.trim());

    return this.mapToDto(updated);
  }

  async getReview(reviewId: string): Promise<ReviewDto> {
    const review = await this.databaseProvider.findReviewById(reviewId);

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    return this.mapToDto(review);
  }

  async getReviewByOrderId(orderId: string): Promise<ReviewDto | null> {
    const review = await this.databaseProvider.findReviewByOrderId(orderId);

    if (!review) {
      return null;
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
      restaurant_reply: review.restaurant_reply,
      created_at: review.created_at,
      updated_at: review.updated_at,
    };
  }
}

