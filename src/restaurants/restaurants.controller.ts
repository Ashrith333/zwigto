import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Request,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { RestaurantsService } from './restaurants.service';
import { CreateRestaurantDto } from './dto/create-restaurant.dto';
import { UpdateRestaurantDto } from './dto/update-restaurant.dto';
import { SubmitChangeRequestDto } from './dto/submit-change-request.dto';
import { RestaurantProfileDto } from './dto/restaurant-profile.dto';
import { ChangeRequestDto } from './dto/change-request.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../auth/interfaces/user.interface';

@Controller('restaurants')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RestaurantsController {
  constructor(private readonly restaurantsService: RestaurantsService) {}

  @Post()
  // Allow all authenticated users to create restaurants
  // This enables USER role to become restaurant owners
  async createRestaurant(
    @Body() dto: CreateRestaurantDto,
    @Request() req: any,
  ): Promise<RestaurantProfileDto> {
    try {
      // Clean up empty strings - convert to undefined for optional fields
      // This prevents validation errors with empty strings
      const cleanedDto: CreateRestaurantDto = {
        ...dto,
        description: dto.description?.trim() || undefined,
        phone: dto.phone?.trim() || undefined,
        email: dto.email?.trim() || undefined,
        payment_account: dto.payment_account?.trim() || undefined,
      };

      // Any authenticated user can create a restaurant and link themselves
      // This allows USER, RESTAURANT, and ADMIN to create restaurants
      const userId = req.user.id;
      console.log('Creating restaurant for user:', {
        userId,
        phone: req.user.phone,
        role: req.user.role,
        restaurantName: cleanedDto.name,
      });
      const restaurant = await this.restaurantsService.createRestaurant(cleanedDto, userId);
      console.log('✅ Restaurant created and linked:', {
        restaurantId: restaurant.id,
        userId,
        status: restaurant.status,
      });
      return restaurant;
    } catch (error: any) {
      console.error('❌ Error creating restaurant:', {
        message: error?.message,
        stack: error?.stack,
        dto: dto,
        userId: req.user?.id,
      });
      throw error;
    }
  }

  @Get()
  async listRestaurants(): Promise<RestaurantProfileDto[]> {
    return this.restaurantsService.listRestaurants();
  }

  @Get('me')
  // Allow all authenticated users to check if they have a restaurant
  // This enables USER role to create restaurants too
  async getMyRestaurant(@Request() req: any): Promise<RestaurantProfileDto | null> {
    const restaurantUser = await this.restaurantsService.getRestaurantForUser(req.user.id);
    if (!restaurantUser) {
      // Return null if no restaurant exists yet - frontend will show setup screen
      console.log('No restaurant linked to user:', req.user.id);
      return null as any;
    }
    console.log('Found restaurant for user:', {
      userId: req.user.id,
      restaurantId: restaurantUser.restaurant_id,
    });
    // Return restaurant profile regardless of status (PENDING, ACTIVE, PAUSED)
    const profile = await this.restaurantsService.getProfile(restaurantUser.restaurant_id);
    console.log('Restaurant profile loaded:', {
      restaurantId: profile.id,
      status: profile.status,
      name: profile.name,
    });
    return profile;
  }

  @Get(':id')
  async getProfile(@Param('id') id: string): Promise<RestaurantProfileDto> {
    return this.restaurantsService.getProfile(id);
  }

  @Patch(':id')
  @Roles(UserRole.USER, UserRole.RESTAURANT, UserRole.ADMIN) // Explicitly allow all roles
  async updateRestaurant(
    @Param('id') id: string,
    @Body() dto: UpdateRestaurantDto,
    @Request() req: any,
  ): Promise<RestaurantProfileDto> {
    // Allow restaurant owners (regardless of role) and admins to update
    if (req.user.role !== UserRole.ADMIN) {
      const restaurantUser = await this.restaurantsService.getRestaurantForUser(
        req.user.id,
      );

      if (!restaurantUser || restaurantUser.restaurant_id !== id) {
        throw new ForbiddenException('You can only update your own restaurant');
      }
    }

    return this.restaurantsService.updateRestaurant(id, dto);
  }

  @Patch(':id/pause')
  // Allow restaurant owners (regardless of role) to pause/unpause
  async pauseRestaurant(
    @Param('id') id: string,
    @Request() req: any,
  ): Promise<RestaurantProfileDto> {
    // Check if user owns this restaurant
    if (req.user.role !== UserRole.ADMIN) {
      const restaurantUser = await this.restaurantsService.getRestaurantForUser(
        req.user.id,
      );

      if (!restaurantUser || restaurantUser.restaurant_id !== id) {
        throw new ForbiddenException('You can only pause your own restaurant');
      }
    }

    return this.restaurantsService.pauseRestaurant(id);
  }

  @Patch(':id/activate')
  // Allow restaurant owners (regardless of role) to activate
  async activateRestaurant(
    @Param('id') id: string,
    @Request() req: any,
  ): Promise<RestaurantProfileDto> {
    // Check if user owns this restaurant
    if (req.user.role !== UserRole.ADMIN) {
      const restaurantUser = await this.restaurantsService.getRestaurantForUser(
        req.user.id,
      );

      if (!restaurantUser || restaurantUser.restaurant_id !== id) {
        throw new ForbiddenException('You can only activate your own restaurant');
      }
    }

    return this.restaurantsService.activateRestaurant(id);
  }

  @Post(':id/change-requests')
  @Roles(UserRole.RESTAURANT)
  async submitChangeRequest(
    @Param('id') id: string,
    @Body() dto: SubmitChangeRequestDto,
    @Request() req: any,
  ): Promise<ChangeRequestDto> {
    const restaurantUser = await this.restaurantsService.getRestaurantForUser(req.user.id);

    if (!restaurantUser || restaurantUser.restaurant_id !== id) {
      throw new ForbiddenException('You can only submit change requests for your own restaurant');
    }

    return this.restaurantsService.submitChangeRequest(id, dto);
  }

  @Patch('change-requests/:id/approve')
  @Roles(UserRole.ADMIN)
  async approveChangeRequest(
    @Param('id') id: string,
  ): Promise<ChangeRequestDto> {
    return this.restaurantsService.approveChangeRequest(id);
  }

  @Patch('change-requests/:id/reject')
  @Roles(UserRole.ADMIN)
  async rejectChangeRequest(@Param('id') id: string): Promise<ChangeRequestDto> {
    return this.restaurantsService.rejectChangeRequest(id);
  }

  @Get('change-requests')
  @Roles(UserRole.ADMIN)
  async getAllChangeRequests(): Promise<ChangeRequestDto[]> {
    return this.restaurantsService.getAllChangeRequests();
  }

  @Post(':id/delete')
  // Allow restaurant owners (regardless of role) to delete their restaurant
  async deleteRestaurant(
    @Param('id') id: string,
    @Request() req: any,
  ): Promise<{ message: string }> {
    // Check if user owns this restaurant
    if (req.user.role !== UserRole.ADMIN) {
      const restaurantUser = await this.restaurantsService.getRestaurantForUser(req.user.id);

      if (!restaurantUser || restaurantUser.restaurant_id !== id) {
        throw new ForbiddenException('You can only delete your own restaurant');
      }
    }

    await this.restaurantsService.deleteRestaurant(id, req.user.id);
    return { message: 'Restaurant deleted successfully' };
  }
}

