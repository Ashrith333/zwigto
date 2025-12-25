import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { DatabaseProvider } from './providers/database.provider';
import { CreateRestaurantDto } from './dto/create-restaurant.dto';
import { UpdateRestaurantDto } from './dto/update-restaurant.dto';
import { SubmitChangeRequestDto } from './dto/submit-change-request.dto';
import { RestaurantProfileDto } from './dto/restaurant-profile.dto';
import { ChangeRequestDto } from './dto/change-request.dto';
import { Restaurant, RestaurantUser } from './interfaces/restaurant.interface';

@Injectable()
export class RestaurantsService {
  private readonly RESTRICTED_FIELDS = ['name', 'address', 'latitude', 'longitude', 'payment_account'];

  constructor(private readonly databaseProvider: DatabaseProvider) {}

  async createRestaurant(dto: CreateRestaurantDto, userId?: string): Promise<RestaurantProfileDto> {
    // Check if user already has a restaurant
    if (userId) {
      const existingRestaurantUser = await this.databaseProvider.findRestaurantUserByUserId(userId);
      if (existingRestaurantUser) {
        throw new BadRequestException('User is already linked to a restaurant. Please update your existing restaurant instead.');
      }
    }

    const restaurant = await this.databaseProvider.createRestaurant({
      name: dto.name,
      description: dto.description,
      address: dto.address,
      latitude: dto.latitude,
      longitude: dto.longitude,
      phone: dto.phone,
      email: dto.email,
      payment_account: dto.payment_account,
    });

    // If userId is provided (restaurant owner creating), link them to the restaurant
    if (userId) {
      try {
        const restaurantUser = await this.databaseProvider.createRestaurantUser(userId, restaurant.id);
        console.log('✅ Successfully linked user to restaurant:', {
          userId,
          restaurantId: restaurant.id,
          restaurantUserId: restaurantUser.id,
        });
      } catch (error: any) {
        // If linking fails, this is critical - throw error
        console.error('❌ Failed to link user to restaurant:', {
          userId,
          restaurantId: restaurant.id,
          error: error?.message,
          stack: error?.stack,
        });
        throw new BadRequestException(`Failed to link restaurant to your account: ${error?.message || 'Unknown error'}`);
      }
    }

    return this.mapToProfileDto(restaurant);
  }

  async listRestaurants(): Promise<RestaurantProfileDto[]> {
    const restaurants = await this.databaseProvider.findAllRestaurants();
    return restaurants.map((r) => this.mapToProfileDto(r));
  }

  async listPendingRestaurants(): Promise<RestaurantProfileDto[]> {
    const restaurants = await this.databaseProvider.findPendingRestaurants();
    return restaurants.map((r) => this.mapToProfileDto(r));
  }

  async getProfile(restaurantId: string): Promise<RestaurantProfileDto> {
    const restaurant = await this.databaseProvider.findRestaurantById(restaurantId);

    if (!restaurant) {
      throw new NotFoundException('Restaurant not found');
    }

    return this.mapToProfileDto(restaurant);
  }

  async updateRestaurant(
    restaurantId: string,
    dto: UpdateRestaurantDto,
  ): Promise<RestaurantProfileDto> {
    const restaurant = await this.databaseProvider.findRestaurantById(restaurantId);

    if (!restaurant) {
      throw new NotFoundException('Restaurant not found');
    }

    // Check if any fields changed
    const hasChanges = 
      (dto.name !== undefined && dto.name !== restaurant.name) ||
      (dto.description !== undefined && dto.description !== restaurant.description) ||
      (dto.address !== undefined && dto.address !== restaurant.address) ||
      (dto.latitude !== undefined && dto.latitude !== restaurant.latitude) ||
      (dto.longitude !== undefined && dto.longitude !== restaurant.longitude) ||
      (dto.phone !== undefined && dto.phone !== restaurant.phone) ||
      (dto.email !== undefined && dto.email !== restaurant.email) ||
      (dto.payment_account !== undefined && dto.payment_account !== restaurant.payment_account);

    // Update all fields that are provided
    const updated = await this.databaseProvider.updateRestaurant(restaurantId, {
      name: dto.name,
      description: dto.description,
      address: dto.address,
      latitude: dto.latitude,
      longitude: dto.longitude,
      phone: dto.phone,
      email: dto.email,
      payment_account: dto.payment_account,
    });

    // If owner made any changes, set status to PENDING for approval (even if REJECTED)
    // This allows rejected restaurants to be resubmitted for approval
    if (hasChanges) {
      await this.databaseProvider.updateRestaurantStatus(restaurantId, 'PENDING');
      const pendingRestaurant = await this.databaseProvider.findRestaurantById(restaurantId);
      return this.mapToProfileDto(pendingRestaurant!);
    }

    return this.mapToProfileDto(updated);
  }

  async getRestaurantForUser(userId: string): Promise<RestaurantUser | null> {
    return this.databaseProvider.findRestaurantUserByUserId(userId);
  }

  async submitChangeRequest(
    restaurantId: string,
    dto: SubmitChangeRequestDto,
  ): Promise<ChangeRequestDto> {
    const restaurant = await this.databaseProvider.findRestaurantById(restaurantId);

    if (!restaurant) {
      throw new NotFoundException('Restaurant not found');
    }

    const requestedFields: Record<string, any> = {};

    if (dto.name !== undefined) {
      requestedFields.name = dto.name;
    }
    if (dto.address !== undefined) {
      requestedFields.address = dto.address;
    }
    if (dto.latitude !== undefined) {
      requestedFields.latitude = dto.latitude;
    }
    if (dto.longitude !== undefined) {
      requestedFields.longitude = dto.longitude;
    }
    if (dto.payment_account !== undefined) {
      requestedFields.payment_account = dto.payment_account;
    }

    if (Object.keys(requestedFields).length === 0) {
      throw new BadRequestException('No restricted fields provided for change request');
    }

    // Set restaurant status to PENDING (even if REJECTED) when submitting change request
    // This allows rejected restaurants to be resubmitted for approval
    await this.databaseProvider.updateRestaurantStatus(restaurantId, 'PENDING');

    // Create or update change request (consolidates multiple changes into one request)
    const changeRequest = await this.databaseProvider.createChangeRequest(
      restaurantId,
      requestedFields,
    );

    return {
      id: changeRequest.id,
      restaurant_id: changeRequest.restaurant_id,
      requested_fields: changeRequest.requested_fields,
      status: changeRequest.status,
      created_at: changeRequest.created_at,
      updated_at: changeRequest.updated_at,
    };
  }

  async approveChangeRequest(changeRequestId: string): Promise<ChangeRequestDto> {
    const changeRequest = await this.databaseProvider.findChangeRequestById(changeRequestId);

    if (!changeRequest) {
      throw new NotFoundException('Change request not found');
    }

    if (changeRequest.status !== 'PENDING') {
      throw new BadRequestException('Change request is not pending');
    }

    await this.databaseProvider.updateChangeRequestStatus(changeRequestId, 'APPROVED');
    await this.databaseProvider.applyChangeRequest(
      changeRequest.restaurant_id,
      changeRequest.requested_fields,
    );

    const updated = await this.databaseProvider.findChangeRequestById(changeRequestId);

    return {
      id: updated.id,
      restaurant_id: updated.restaurant_id,
      requested_fields: updated.requested_fields,
      status: updated.status,
      created_at: updated.created_at,
      updated_at: updated.updated_at,
    };
  }

  async rejectChangeRequest(changeRequestId: string): Promise<ChangeRequestDto> {
    const changeRequest = await this.databaseProvider.findChangeRequestById(changeRequestId);

    if (!changeRequest) {
      throw new NotFoundException('Change request not found');
    }

    if (changeRequest.status !== 'PENDING') {
      throw new BadRequestException('Change request is not pending');
    }

    await this.databaseProvider.updateChangeRequestStatus(changeRequestId, 'REJECTED');

    const updated = await this.databaseProvider.findChangeRequestById(changeRequestId);

    return {
      id: updated.id,
      restaurant_id: updated.restaurant_id,
      requested_fields: updated.requested_fields,
      status: updated.status,
      created_at: updated.created_at,
      updated_at: updated.updated_at,
    };
  }

  async pauseRestaurant(restaurantId: string): Promise<RestaurantProfileDto> {
    const restaurant = await this.databaseProvider.findRestaurantById(restaurantId);

    if (!restaurant) {
      throw new NotFoundException('Restaurant not found');
    }

    const updated = await this.databaseProvider.updateRestaurantStatus(restaurantId, 'PAUSED');

    return this.mapToProfileDto(updated);
  }

  async activateRestaurant(restaurantId: string): Promise<RestaurantProfileDto> {
    const restaurant = await this.databaseProvider.findRestaurantById(restaurantId);

    if (!restaurant) {
      throw new NotFoundException('Restaurant not found');
    }

    // Only allow activation if restaurant is PAUSED (not PENDING or REJECTED)
    if (restaurant.status !== 'PAUSED') {
      throw new BadRequestException('Only paused restaurants can be activated');
    }

    const updated = await this.databaseProvider.updateRestaurantStatus(restaurantId, 'ACTIVE');

    return this.mapToProfileDto(updated);
  }

  async approveRestaurant(restaurantId: string): Promise<RestaurantProfileDto> {
    const restaurant = await this.databaseProvider.findRestaurantById(restaurantId);

    if (!restaurant) {
      throw new NotFoundException('Restaurant not found');
    }

    const updated = await this.databaseProvider.updateRestaurantStatus(restaurantId, 'ACTIVE');

    return this.mapToProfileDto(updated);
  }

  async rejectRestaurant(restaurantId: string, rejectionReason: string): Promise<RestaurantProfileDto> {
    const restaurant = await this.databaseProvider.findRestaurantById(restaurantId);

    if (!restaurant) {
      throw new NotFoundException('Restaurant not found');
    }

    const updated = await this.databaseProvider.updateRestaurantStatus(restaurantId, 'REJECTED', rejectionReason);

    return this.mapToProfileDto(updated);
  }

  async getAllChangeRequests(): Promise<ChangeRequestDto[]> {
    const changeRequests = await this.databaseProvider.findAllChangeRequests();
    return changeRequests.map((cr) => ({
      id: cr.id,
      restaurant_id: cr.restaurant_id,
      requested_fields: cr.requested_fields,
      status: cr.status,
      created_at: cr.created_at,
      updated_at: cr.updated_at,
    }));
  }

  private mapToProfileDto(restaurant: Restaurant): RestaurantProfileDto {
    return {
      id: restaurant.id,
      name: restaurant.name,
      description: restaurant.description,
      address: restaurant.address,
      latitude: restaurant.latitude,
      longitude: restaurant.longitude,
      phone: restaurant.phone,
      email: restaurant.email,
      payment_account: restaurant.payment_account,
      status: restaurant.status as 'ACTIVE' | 'PAUSED' | 'PENDING' | 'REJECTED',
      rejection_reason: restaurant.rejection_reason || null,
      created_at: restaurant.created_at,
      updated_at: restaurant.updated_at,
    };
  }
}

