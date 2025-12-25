import { Controller, Post, Body } from '@nestjs/common';
import { GeoService } from './geo.service';
import { FindRestaurantsDto } from './dto/find-restaurants.dto';
import { EligibleRestaurantDto } from './dto/eligible-restaurant.dto';
import { Public } from '../auth/decorators/public.decorator';

@Controller('geo')
export class GeoController {
  constructor(private readonly geoService: GeoService) {}

  @Public()
  @Post('restaurants')
  async findEligibleRestaurants(
    @Body() dto: FindRestaurantsDto,
  ): Promise<EligibleRestaurantDto[]> {
    return this.geoService.findEligibleRestaurants(dto);
  }
}

