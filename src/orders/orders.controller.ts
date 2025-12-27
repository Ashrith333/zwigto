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
  @Roles(UserRole.USER, UserRole.ADMIN)
  async createOrder(
    @Request() req: any,
    @Body() dto: CreateOrderDto,
  ): Promise<OrderDto> {
    try {
      console.log('Creating order for user:', req.user.id);
      console.log('Order DTO:', JSON.stringify(dto, null, 2));
      return await this.ordersService.createOrder(req.user.id, dto);
    } catch (error: any) {
      console.error('Error in createOrder controller:', error);
      console.error('Error stack:', error.stack);
      throw error;
    }
  }

  @Get('me')
  @Roles(UserRole.USER, UserRole.ADMIN)
  async getMyOrders(@Request() req: any): Promise<OrderDto[]> {
    return this.ordersService.getUserOrders(req.user.id);
  }

  @Get('restaurant')
  // Allow restaurant owners (regardless of role) to view their orders
  async getRestaurantOrders(@Request() req: any): Promise<OrderDto[]> {
    try {
      console.log('getRestaurantOrders called for user:', req.user.id, 'role:', req.user.role);
      
      // Check if user owns a restaurant (works for USER, RESTAURANT, ADMIN roles)
      const restaurantUser = await this.restaurantsService.getRestaurantForUser(req.user.id);
      console.log('Restaurant user found:', restaurantUser);
      
      if (!restaurantUser) {
        console.log('No restaurant linked to user, returning empty array');
        // Return empty array if no restaurant linked (instead of throwing error)
        return [];
      }
      
      const orders = await this.ordersService.getRestaurantOrders(restaurantUser.restaurant_id);
      console.log(`Found ${orders.length} orders for restaurant ${restaurantUser.restaurant_id}`);
      return orders;
    } catch (error: any) {
      console.error('Error in getRestaurantOrders:', error);
      console.error('Error stack:', error.stack);
      // Return empty array on any error to prevent 500
      return [];
    }
  }

  @Get(':id')
  async getOrder(@Param('id') id: string, @Request() req: any): Promise<OrderDto> {
    // Always pass userId so users can view their own orders regardless of role
    // (e.g., restaurant owners can view orders they placed as customers)
    const userId = req.user.id;
    
    // Check if user owns a restaurant (for restaurant owners to view orders placed at their restaurant)
    let restaurantId: string | undefined;
    try {
      const restaurantUser = await this.restaurantsService.getRestaurantForUser(req.user.id);
      if (restaurantUser) {
        restaurantId = restaurantUser.restaurant_id;
      }
    } catch (error) {
      // Ignore errors, restaurantId stays undefined
    }
    
    return this.ordersService.getOrder(id, userId, restaurantId);
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
    // Admins can also own restaurants, so check for all roles
    const restaurantUser = await this.restaurantsService.getRestaurantForUser(
      req.user.id,
    );

    if (restaurantUser) {
      restaurantId = restaurantUser.restaurant_id;
    } else if (req.user.role !== UserRole.ADMIN) {
      // Only throw error if not admin and not linked to restaurant
      throw new Error('You are not linked to any restaurant');
    }
    // If admin and no restaurant linked, allow them to update any order (restaurantId stays undefined)

    return this.ordersService.updateOrderStatus(id, dto, restaurantId);
  }

  @Patch(':id/pickup')
  @Roles(UserRole.USER)
  async completePickup(
    @Param('id') id: string,
    @Request() req: any,
  ): Promise<OrderDto> {
    // Note: Pickup is now handled by restaurant via updateOrderStatus with PIN verification
    return this.ordersService.completePickup(id, req.user.id);
  }
}

