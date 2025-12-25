import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { DatabaseProvider } from './providers/database.provider';
import { CreateMenuItemDto } from './dto/create-menu-item.dto';
import { UpdateMenuItemDto } from './dto/update-menu-item.dto';
import { MenuItemDto } from './dto/menu-item.dto';
import { MenuItem } from './interfaces/menu-item.interface';

@Injectable()
export class MenusService {
  constructor(private readonly databaseProvider: DatabaseProvider) {}

  async createMenuItem(
    restaurantId: string,
    dto: CreateMenuItemDto,
  ): Promise<MenuItemDto> {
    const menuItem = await this.databaseProvider.createMenuItem(restaurantId, {
      name: dto.name,
      description: dto.description,
      price: dto.price,
      prep_time_minutes: dto.prep_time_minutes,
      food_type: dto.food_type,
      image_url: dto.image_url,
    });

    return this.mapToDto(menuItem);
  }

  async getMenuItems(restaurantId: string, includeUnavailable: boolean = false): Promise<MenuItemDto[]> {
    const menuItems = await this.databaseProvider.findMenuItemsByRestaurantId(restaurantId);
    // Filter out unavailable items unless explicitly requested (for restaurant owners)
    const filteredItems = includeUnavailable 
      ? menuItems 
      : menuItems.filter((item) => item.is_available);
    return filteredItems.map((item) => this.mapToDto(item));
  }

  async getMenuItem(id: string): Promise<MenuItemDto> {
    const menuItem = await this.databaseProvider.findMenuItemById(id);

    if (!menuItem) {
      throw new NotFoundException('Menu item not found');
    }

    return this.mapToDto(menuItem);
  }

  async updateMenuItem(id: string, dto: UpdateMenuItemDto): Promise<MenuItemDto> {
    const menuItem = await this.databaseProvider.findMenuItemById(id);

    if (!menuItem) {
      throw new NotFoundException('Menu item not found');
    }

    const updated = await this.databaseProvider.updateMenuItem(id, {
      name: dto.name,
      description: dto.description,
      price: dto.price,
      prep_time_minutes: dto.prep_time_minutes,
      food_type: dto.food_type,
      image_url: dto.image_url,
      is_available: dto.is_available,
    });

    return this.mapToDto(updated);
  }

  async deleteMenuItem(id: string): Promise<void> {
    const menuItem = await this.databaseProvider.findMenuItemById(id);

    if (!menuItem) {
      throw new NotFoundException('Menu item not found');
    }

    await this.databaseProvider.deleteMenuItem(id);
  }

  async getMenuItemRestaurantId(id: string): Promise<string | null> {
    const menuItem = await this.databaseProvider.findMenuItemById(id);
    return menuItem?.restaurant_id || null;
  }

  private mapToDto(menuItem: MenuItem): MenuItemDto {
    return {
      id: menuItem.id,
      restaurant_id: menuItem.restaurant_id,
      name: menuItem.name,
      description: menuItem.description,
      price: menuItem.price,
      prep_time_minutes: menuItem.prep_time_minutes,
      food_type: menuItem.food_type,
      image_url: menuItem.image_url,
      is_available: menuItem.is_available,
      created_at: menuItem.created_at,
      updated_at: menuItem.updated_at,
    };
  }
}

