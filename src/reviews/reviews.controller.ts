import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { ReviewDto } from './dto/review.dto';
import { RestaurantRatingDto } from './dto/restaurant-rating.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../auth/interfaces/user.interface';
import { UpdateReviewDto } from './dto/update-review.dto';

@Controller('reviews')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post()
  @Roles(UserRole.USER)
  async createReview(
    @Request() req: any,
    @Body() dto: CreateReviewDto,
  ): Promise<ReviewDto> {
    return this.reviewsService.createReview(req.user.id, dto);
  }

  @Patch(':id')
  @Roles(UserRole.USER)
  async updateReview(
    @Param('id') id: string,
    @Request() req: any,
    @Body() dto: UpdateReviewDto,
  ): Promise<ReviewDto> {
    return this.reviewsService.updateReview(id, req.user.id, dto.rating, dto.comment || null);
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

