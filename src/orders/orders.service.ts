import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { DatabaseProvider } from './providers/database.provider';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { OrderDto } from './dto/order.dto';
import {
  Order,
  OrderStatus,
  ORDER_STATUS_TRANSITIONS,
} from './interfaces/order.interface';
import { MenusService } from '../menus/menus.service';
import { UsersService } from '../users/users.service';

@Injectable()
export class OrdersService {
  constructor(
    private readonly databaseProvider: DatabaseProvider,
    private readonly menusService: MenusService,
    private readonly usersService: UsersService,
  ) {}

  async createOrder(userId: string, dto: CreateOrderDto): Promise<OrderDto> {
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('Order must have at least one item');
    }

    // For cash on pickup, use NULL for payment_id (or a special value if column allows strings)
    // If payment_id is UUID type, we'll use NULL and handle it in the response
    const paymentId = dto.payment_id || null;
    
    // Route polyline is optional for now
    const routePolyline = dto.route_polyline || [];

    // Validate menu items exist and get prices
    // We still need to verify items exist and get prices from DB for security
    const itemsWithPrices = await Promise.all(
      dto.items.map(async (item) => {
        try {
          // Get menu item to verify it exists and get current price
          const menuItem = await this.menusService.getMenuItem(item.menu_item_id);
          if (!menuItem) {
            throw new BadRequestException(`Menu item ${item.menu_item_id} not found`);
          }
          // Verify menu item belongs to the restaurant
          if (menuItem.restaurant_id !== dto.restaurant_id) {
            throw new BadRequestException(`Menu item ${item.menu_item_id} does not belong to restaurant ${dto.restaurant_id}`);
          }
          // Use price from database (not from frontend) for security
          return {
            menu_item_id: item.menu_item_id,
            quantity: item.quantity,
            price: menuItem.price,
          };
        } catch (error: any) {
          console.error(`Error fetching menu item ${item.menu_item_id}:`, error);
          if (error instanceof BadRequestException) {
            throw error;
          }
          throw new BadRequestException(
            `Failed to fetch menu item ${item.menu_item_id}: ${error.message || 'Menu item not found'}`
          );
        }
      })
    );

    try {
    const order = await this.databaseProvider.createOrder(userId, {
      restaurant_id: dto.restaurant_id,
      payment_id: paymentId,
      total_amount: dto.total_amount,
      route_polyline: routePolyline,
      items: itemsWithPrices,
      collection_pin: null, // No longer using per-order PIN
    });

      return this.mapToDto(order, true);
    } catch (error: any) {
      console.error('Error creating order:', error);
      throw new BadRequestException(
        `Failed to create order: ${error.message || 'Database error'}`
      );
    }
  }

  async getOrder(orderId: string, userId?: string): Promise<OrderDto> {
    const order = await this.databaseProvider.findOrderById(orderId);

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (userId && order.user_id !== userId) {
      throw new ForbiddenException('You can only access your own orders');
    }

    return this.mapToDto(order, true);
  }

  async getUserOrders(userId: string): Promise<OrderDto[]> {
    const orders = await this.databaseProvider.findOrdersByUserId(userId);
    return Promise.all(orders.map((order) => this.mapToDto(order, true)));
  }

  async getRestaurantOrders(restaurantId: string): Promise<OrderDto[]> {
    const orders = await this.databaseProvider.findOrdersByRestaurantId(restaurantId);
    return Promise.all(orders.map((order) => this.mapToDto(order, true)));
  }

  async getAllOrders(): Promise<OrderDto[]> {
    const orders = await this.databaseProvider.findAllOrders();
    return Promise.all(orders.map((order) => this.mapToDto(order, true)));
  }

  async updateOrderStatus(
    orderId: string,
    dto: UpdateOrderStatusDto,
    restaurantId?: string,
  ): Promise<OrderDto> {
    const order = await this.databaseProvider.findOrderById(orderId);

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (restaurantId && order.restaurant_id !== restaurantId) {
      throw new ForbiddenException('You can only update orders for your restaurant');
    }

    if (!this.isValidStatusTransition(order.status, dto.status)) {
      throw new BadRequestException(
        `Invalid status transition from ${order.status} to ${dto.status}`,
      );
    }

    // If marking as PICKED_UP, verify customer PIN
    if (dto.status === OrderStatus.PICKED_UP) {
      if (!dto.customer_pin) {
        throw new BadRequestException('Customer PIN is required to mark order as picked up');
      }

      // Get customer's default PIN
      const customer = await this.usersService.getUserById(order.user_id);
      if (!customer) {
        throw new NotFoundException('Customer not found');
      }

      if (!customer.default_pin) {
        throw new BadRequestException('Customer does not have a PIN set. Please contact support.');
      }

      if (customer.default_pin !== dto.customer_pin) {
        throw new BadRequestException('Invalid customer PIN');
      }
    }

    const pickupTime =
      dto.status === OrderStatus.PICKED_UP ? new Date() : null;

    const updated = await this.databaseProvider.updateOrderStatus(
      orderId,
      dto.status,
      pickupTime,
    );

    return this.mapToDto(updated, true);
  }

  async completePickup(orderId: string, userId: string, collectionPin?: string): Promise<OrderDto> {
    const order = await this.databaseProvider.findOrderById(orderId);

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.user_id !== userId) {
      throw new ForbiddenException('You can only complete pickup for your own orders');
    }

    if (order.status !== OrderStatus.READY) {
      throw new BadRequestException(
        `Order must be READY for pickup. Current status: ${order.status}`,
      );
    }

    // Verify collection PIN if provided
    if (collectionPin && order.collection_pin) {
      if (collectionPin !== order.collection_pin) {
        throw new BadRequestException('Invalid collection PIN');
      }
    } else if (order.collection_pin && !collectionPin) {
      throw new BadRequestException('Collection PIN is required');
    }

    const updated = await this.databaseProvider.updateOrderStatus(
      orderId,
      OrderStatus.PICKED_UP,
      new Date(),
    );

    return this.mapToDto(updated, true);
  }

  private isValidStatusTransition(
    currentStatus: OrderStatus,
    newStatus: OrderStatus,
  ): boolean {
    const allowedTransitions = ORDER_STATUS_TRANSITIONS[currentStatus];
    return allowedTransitions.includes(newStatus);
  }

  private async mapToDto(order: Order, includeItems: boolean = false): Promise<OrderDto> {
    // Handle payment_id: if null, it's cash on pickup
    const paymentId = order.payment_id || 'CASH_ON_PICKUP';
    const paymentMethod = order.payment_id ? 'ONLINE' : 'CASH_ON_PICKUP';
    
    // Get customer's default PIN to show in order (only for customer viewing their own orders)
    let customerDefaultPin: string | null = null;
    try {
      const customer = await this.usersService.getUserById(order.user_id);
      customerDefaultPin = customer?.default_pin || null;
    } catch (error) {
      console.warn('Failed to fetch customer PIN for order:', error);
    }
    
    const dto: OrderDto = {
      id: order.id,
      user_id: order.user_id,
      restaurant_id: order.restaurant_id,
      status: order.status,
      total_amount: order.total_amount,
      payment_id: paymentId, // Return 'CASH_ON_PICKUP' string for frontend compatibility
      payment_method: paymentMethod,
      collection_pin: customerDefaultPin || undefined, // Show customer's default PIN (not per-order PIN)
      route_polyline: order.route_polyline,
      pickup_time: order.pickup_time,
      created_at: order.created_at,
      updated_at: order.updated_at,
    };

    // Fetch order items if requested
    if (includeItems) {
      try {
        const orderItems = await this.databaseProvider.findOrderItemsByOrderId(order.id);
        dto.items = orderItems.map((item) => ({
          id: item.id,
          menu_item_id: item.menu_item_id,
          menu_item_name: (item as any).menu_item_name,
          quantity: item.quantity,
          price: item.price,
          prep_time_minutes: (item as any).prep_time_minutes,
        }));

        // Calculate ETA: max prep time + buffer
        if (dto.items && dto.items.length > 0) {
          const maxPrepTime = Math.max(...dto.items.map(item => item.prep_time_minutes || 0));
          const bufferMinutes = 5; // Platform buffer
          const estimatedMinutes = maxPrepTime + bufferMinutes;
          dto.estimated_ready_time = new Date(order.created_at.getTime() + estimatedMinutes * 60000);
        }
      } catch (error: any) {
        console.error(`Error fetching order items for order ${order.id}:`, error);
        // Don't fail the entire request if items can't be fetched, just log it
        dto.items = [];
      }
    }

    return dto;
  }
}

