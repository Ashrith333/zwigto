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

  async listRestaurants(): Promise<RestaurantProfile[]> {
    return apiClient.get<RestaurantProfile[]>('/restaurants');
  }

  async getMyRestaurant(): Promise<RestaurantProfile | null> {
    try {
      const result = await apiClient.get<RestaurantProfile | null>('/restaurants/me');
      // If backend returns null (no restaurant), return null
      if (result === null) {
        console.log('No restaurant found for user');
        return null;
      }
      return result;
    } catch (error: any) {
      console.error('Error getting restaurant:', error);
      // If 404 or no restaurant found, return null (don't throw)
      if (error?.message?.includes('not linked') || 
          error?.message?.includes('Forbidden') ||
          error?.message?.includes('404') ||
          error?.message?.includes('null')) {
        console.log('No restaurant linked to user, returning null');
        return null;
      }
      // For auth errors, re-throw so parent can handle logout
      if (error?.message?.includes('token') || 
          error?.message?.includes('Unauthorized') || 
          error?.message?.includes('Invalid')) {
        throw error;
      }
      // For other errors, return null (assume no restaurant)
      console.warn('Unexpected error, returning null:', error?.message);
      return null;
    }
  }

  async pauseRestaurant(restaurantId: string): Promise<RestaurantProfile> {
    return apiClient.patch<RestaurantProfile>(`/restaurants/${restaurantId}/pause`, {});
  }

  async deleteRestaurant(restaurantId: string): Promise<{ message: string }> {
    return apiClient.post<{ message: string }>(`/restaurants/${restaurantId}/delete`, {});
  }

  async activateRestaurant(restaurantId: string): Promise<RestaurantProfile> {
    return apiClient.patch<RestaurantProfile>(`/restaurants/${restaurantId}/activate`, {});
  }
}

export const restaurantService = new RestaurantService();

