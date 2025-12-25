import { apiClient } from './api-client';
import {
  FindRestaurantsRequest,
  EligibleRestaurant,
} from '../../shared/api-contracts';

class GeoService {
  async findEligibleRestaurants(
    request: FindRestaurantsRequest,
  ): Promise<EligibleRestaurant[]> {
    return apiClient.post<EligibleRestaurant[]>('/geo/restaurants', request, false);
  }
}

export const geoService = new GeoService();

