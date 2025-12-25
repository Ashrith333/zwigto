import { Injectable, BadRequestException } from '@nestjs/common';
import { DatabaseProvider } from './providers/database.provider';
import { FindRestaurantsDto } from './dto/find-restaurants.dto';
import { EligibleRestaurantDto } from './dto/eligible-restaurant.dto';

@Injectable()
export class GeoService {
  constructor(private readonly databaseProvider: DatabaseProvider) {}

  async findEligibleRestaurants(
    dto: FindRestaurantsDto,
  ): Promise<EligibleRestaurantDto[]> {
    if (dto.route.length < 2) {
      throw new BadRequestException('Route must have at least 2 points');
    }

    const eligibleRestaurants = await this.databaseProvider.findEligibleRestaurants(
      dto.route,
      dto.buffer_time_minutes,
    );

    return eligibleRestaurants.map((restaurant) => ({
      restaurant_id: restaurant.restaurant_id,
      detour_time_minutes: restaurant.detour_time_minutes,
    }));
  }
}

