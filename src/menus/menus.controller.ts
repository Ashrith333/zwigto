import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Request,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { MenusService } from './menus.service';
import { CreateMenuItemDto } from './dto/create-menu-item.dto';
import { UpdateMenuItemDto } from './dto/update-menu-item.dto';
import { MenuItemDto } from './dto/menu-item.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { UserRole } from '../auth/interfaces/user.interface';
import { RestaurantsService } from '../restaurants/restaurants.service';

@Controller('restaurants/:restaurantId/menu-items')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MenusController {
  constructor(
    private readonly menusService: MenusService,
    private readonly restaurantsService: RestaurantsService,
  ) {}

  @Post()
  // Allow all authenticated users who own the restaurant (not just RESTAURANT role)
  async createMenuItem(
    @Param('restaurantId') restaurantId: string,
    @Body() dto: CreateMenuItemDto,
    @Request() req: any,
  ): Promise<MenuItemDto> {
    // Check if user owns this restaurant (works for USER, RESTAURANT, ADMIN roles)
    if (req.user.role !== UserRole.ADMIN) {
      const restaurantUser = await this.restaurantsService.getRestaurantForUser(
        req.user.id,
      );

      if (!restaurantUser || restaurantUser.restaurant_id !== restaurantId) {
        throw new ForbiddenException('You can only manage your own restaurant menu');
      }
    }

    return this.menusService.createMenuItem(restaurantId, dto);
  }

  @Get()
  @Public() // Allow public access for viewing menus
  async getMenuItems(
    @Param('restaurantId') restaurantId: string,
    @Request() req: any,
  ): Promise<MenuItemDto[]> {
    // Restaurant owners can see all items (including unavailable)
    // Users only see available items
    let isOwner = false;
    if (req.user) {
      if (req.user.role === UserRole.ADMIN) {
        isOwner = true;
      } else {
        try {
          const restaurantUser = await this.restaurantsService.getRestaurantForUser(req.user.id);
          isOwner = restaurantUser?.restaurant_id === restaurantId;
        } catch (error) {
          // If check fails, assume not owner
          isOwner = false;
        }
      }
    }
    return this.menusService.getMenuItems(restaurantId, isOwner);
  }

  @Get(':id')
  async getMenuItem(@Param('id') id: string): Promise<MenuItemDto> {
    return this.menusService.getMenuItem(id);
  }

  @Patch(':id')
  // Allow all authenticated users who own the restaurant
  async updateMenuItem(
    @Param('id') id: string,
    @Body() dto: UpdateMenuItemDto,
    @Request() req: any,
  ): Promise<MenuItemDto> {
    const restaurantId = await this.menusService.getMenuItemRestaurantId(id);

    if (!restaurantId) {
      throw new ForbiddenException('Menu item not found');
    }

    if (req.user.role !== UserRole.ADMIN) {
      const restaurantUser = await this.restaurantsService.getRestaurantForUser(
        req.user.id,
      );

      if (!restaurantUser || restaurantUser.restaurant_id !== restaurantId) {
        throw new ForbiddenException('You can only update your own restaurant menu items');
      }
    }

    return this.menusService.updateMenuItem(id, dto);
  }

  @Delete(':id')
  // Allow all authenticated users who own the restaurant
  async deleteMenuItem(
    @Param('id') id: string,
    @Request() req: any,
  ): Promise<{ message: string }> {
    const restaurantId = await this.menusService.getMenuItemRestaurantId(id);

    if (!restaurantId) {
      throw new ForbiddenException('Menu item not found');
    }

    if (req.user.role !== UserRole.ADMIN) {
      const restaurantUser = await this.restaurantsService.getRestaurantForUser(
        req.user.id,
      );

      if (!restaurantUser || restaurantUser.restaurant_id !== restaurantId) {
        throw new ForbiddenException('You can only delete your own restaurant menu items');
      }
    }

    await this.menusService.deleteMenuItem(id);
    return { message: 'Menu item deleted successfully' };
  }
}

