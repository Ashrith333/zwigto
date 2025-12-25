import { apiClient } from './api-client';
import {
  CreateMenuItemRequest,
  UpdateMenuItemRequest,
  MenuItem,
} from '../../shared/api-contracts';

class MenuService {
  async createMenuItem(
    restaurantId: string,
    request: CreateMenuItemRequest,
  ): Promise<MenuItem> {
    return apiClient.post<MenuItem>(
      `/restaurants/${restaurantId}/menu-items`,
      request,
    );
  }

  async getMenuItems(restaurantId: string): Promise<MenuItem[]> {
    return apiClient.get<MenuItem[]>(`/restaurants/${restaurantId}/menu-items`);
  }

  async getMenuItem(restaurantId: string, itemId: string): Promise<MenuItem> {
    return apiClient.get<MenuItem>(`/restaurants/${restaurantId}/menu-items/${itemId}`);
  }

  async updateMenuItem(
    restaurantId: string,
    itemId: string,
    request: UpdateMenuItemRequest,
  ): Promise<MenuItem> {
    return apiClient.patch<MenuItem>(
      `/restaurants/${restaurantId}/menu-items/${itemId}`,
      request,
    );
  }

  async deleteMenuItem(restaurantId: string, itemId: string): Promise<void> {
    return apiClient.delete<void>(`/restaurants/${restaurantId}/menu-items/${itemId}`);
  }
}

export const menuService = new MenuService();

