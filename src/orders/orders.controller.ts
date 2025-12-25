import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Request,
  UseGuards,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { OrderDto } from './dto/order.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../auth/interfaces/user.interface';
import { RestaurantsService } from '../restaurants/restaurants.service';

@Controller('orders')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OrdersController {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly restaurantsService: RestaurantsService,
  ) {}

  @Post()
  @Roles(UserRole.USER)
  async createOrder(
    @Request() req: any,
    @Body() dto: CreateOrderDto,
  ): Promise<OrderDto> {
    return this.ordersService.createOrder(req.user.id, dto);
  }

  @Get('me')
  @Roles(UserRole.USER)
  async getMyOrders(@Request() req: any): Promise<OrderDto[]> {
    return this.ordersService.getUserOrders(req.user.id);
  }

  @Get('restaurant')
  // Allow restaurant owners (regardless of role) to view their orders
  async getRestaurantOrders(@Request() req: any): Promise<OrderDto[]> {
    try {
      // Check if user owns a restaurant (works for USER, RESTAURANT, ADMIN roles)
      if (req.user.role !== UserRole.ADMIN) {
        const restaurantUser = await this.restaurantsService.getRestaurantForUser(req.user.id);
        if (!restaurantUser) {
          // Return empty array if no restaurant linked (instead of throwing error)
          return [];
        }
        return this.ordersService.getRestaurantOrders(restaurantUser.restaurant_id);
      } else {
        // Admin can view all orders via /admin/orders
        // For now, return empty array (admin should use /admin/orders)
        return [];
      }
    } catch (error: any) {
      console.error('Error in getRestaurantOrders:', error);
      // Return empty array on any error to prevent 500
      return [];
    }
  }

  @Get(':id')
  async getOrder(@Param('id') id: string, @Request() req: any): Promise<OrderDto> {
    const userId = req.user.role === UserRole.USER ? req.user.id : undefined;
    return this.ordersService.getOrder(id, userId);
  }

  @Patch(':id/status')
  // Allow restaurant owners (regardless of role) and admins to update order status
  async updateOrderStatus(
    @Param('id') id: string,
    @Body() dto: UpdateOrderStatusDto,
    @Request() req: any,
  ): Promise<OrderDto> {
    let restaurantId: string | undefined;

    // Check if user owns a restaurant (works for USER, RESTAURANT, ADMIN roles)
    if (req.user.role !== UserRole.ADMIN) {
      const restaurantUser = await this.restaurantsService.getRestaurantForUser(
        req.user.id,
      );

      if (!restaurantUser) {
        throw new Error('You are not linked to any restaurant');
      }

      restaurantId = restaurantUser.restaurant_id;
    }

    return this.ordersService.updateOrderStatus(id, dto, restaurantId);
  }

  @Patch(':id/pickup')
  @Roles(UserRole.USER)
  async completePickup(
    @Param('id') id: string,
    @Request() req: any,
  ): Promise<OrderDto> {
    return this.ordersService.completePickup(id, req.user.id);
  }
}

