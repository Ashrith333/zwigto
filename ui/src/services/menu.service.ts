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

  async getMenuItems(restaurantId: string, includeUnavailable: boolean = false, includeAuth: boolean = true): Promise<MenuItem[]> {
    // For customer views, don't send auth token so backend treats them as regular users
    // This ensures disabled items are filtered on backend
    const items = await apiClient.get<MenuItem[]>(`/restaurants/${restaurantId}/menu-items`, includeAuth);
    // Always filter out disabled items if includeUnavailable is false (customer view)
    // This ensures restaurant owners viewing as customers don't see disabled items
    if (!includeUnavailable && items) {
      return items.filter(item => item.is_available === true);
    }
    return items || [];
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

