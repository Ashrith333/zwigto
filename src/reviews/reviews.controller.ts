import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Request,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { ReviewDto } from './dto/review.dto';
import { RestaurantRatingDto } from './dto/restaurant-rating.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../auth/interfaces/user.interface';
import { RestaurantsService } from '../restaurants/restaurants.service';

@Controller('reviews')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReviewsController {
  constructor(
    private readonly reviewsService: ReviewsService,
    private readonly restaurantsService: RestaurantsService,
  ) {}

  @Post()
  @Roles(UserRole.USER, UserRole.ADMIN)
  async createReview(
    @Request() req: any,
    @Body() dto: CreateReviewDto,
  ): Promise<ReviewDto> {
    try {
      console.log('Creating review for user:', req.user.id, 'order:', dto.order_id);
      return await this.reviewsService.createReview(req.user.id, dto);
    } catch (error: any) {
      console.error('Error creating review:', error);
      throw error;
    }
  }

  @Patch(':id/reply')
  // Allow restaurant owners (regardless of role) to reply to reviews
  async replyToReview(
    @Param('id') id: string,
    @Request() req: any,
    @Body() body: { reply: string },
  ): Promise<ReviewDto> {
    const restaurantUser = await this.restaurantsService.getRestaurantForUser(req.user.id);
    
    if (!restaurantUser) {
      throw new BadRequestException('You must own a restaurant to reply to reviews');
    }

    return this.reviewsService.replyToReview(id, restaurantUser.restaurant_id, body.reply);
  }

  @Get(':id')
  async getReview(@Param('id') id: string): Promise<ReviewDto> {
    return this.reviewsService.getReview(id);
  }

  @Get('restaurant/:restaurantId')
  async getRestaurantReviews(
    @Param('restaurantId') restaurantId: string,
  ): Promise<ReviewDto[]> {
    return this.reviewsService.getRestaurantReviews(restaurantId);
  }

  @Get('restaurant/:restaurantId/rating')
  async getRestaurantRating(
    @Param('restaurantId') restaurantId: string,
  ): Promise<RestaurantRatingDto> {
    return this.reviewsService.getRestaurantRating(restaurantId);
  }
}

