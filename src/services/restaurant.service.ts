import { apiClient } from './api-client';
import {
  CreateRestaurantRequest,
  UpdateRestaurantRequest,
  SubmitChangeRequestRequest,
  RestaurantProfile,
  ChangeRequest,
} from '../../shared/api-contracts';

class RestaurantService {
  async createRestaurant(request: CreateRestaurantRequest): Promise<RestaurantProfile> {
    return apiClient.post<RestaurantProfile>('/restaurants', request);
  }

  async getProfile(restaurantId: string): Promise<RestaurantProfile> {
    return apiClient.get<RestaurantProfile>(`/restaurants/${restaurantId}`);
  }

  async updateRestaurant(
    restaurantId: string,
    request: UpdateRestaurantRequest,
  ): Promise<RestaurantProfile> {
    return apiClient.patch<RestaurantProfile>(`/restaurants/${restaurantId}`, request);
  }

  async submitChangeRequest(
    restaurantId: string,
    request: SubmitChangeRequestRequest,
  ): Promise<ChangeRequest> {
    return apiClient.post<ChangeRequest>(`/restaurants/${restaurantId}/change-requests`, request);
  }
}

export const restaurantService = new RestaurantService();

