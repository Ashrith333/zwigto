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

@Injectable()
export class OrdersService {
  constructor(private readonly databaseProvider: DatabaseProvider) {}

  async createOrder(userId: string, dto: CreateOrderDto): Promise<OrderDto> {
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('Order must have at least one item');
    }

    if (!dto.route_polyline || dto.route_polyline.length < 2) {
      throw new BadRequestException('Route polyline must have at least 2 points');
    }

    const order = await this.databaseProvider.createOrder(userId, {
      restaurant_id: dto.restaurant_id,
      payment_id: dto.payment_id,
      total_amount: dto.total_amount,
      route_polyline: dto.route_polyline,
      items: dto.items.map((item) => ({
        menu_item_id: item.menu_item_id,
        quantity: item.quantity,
        price: 0,
      })),
    });

    return this.mapToDto(order);
  }

  async getOrder(orderId: string, userId?: string): Promise<OrderDto> {
    const order = await this.databaseProvider.findOrderById(orderId);

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (userId && order.user_id !== userId) {
      throw new ForbiddenException('You can only access your own orders');
    }

    return this.mapToDto(order);
  }

  async getUserOrders(userId: string): Promise<OrderDto[]> {
    const orders = await this.databaseProvider.findOrdersByUserId(userId);
    return orders.map((order) => this.mapToDto(order));
  }

  async getRestaurantOrders(restaurantId: string): Promise<OrderDto[]> {
    const orders = await this.databaseProvider.findOrdersByRestaurantId(restaurantId);
    return orders.map((order) => this.mapToDto(order));
  }

  async getAllOrders(): Promise<OrderDto[]> {
    const orders = await this.databaseProvider.findAllOrders();
    return orders.map((order) => this.mapToDto(order));
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

    const pickupTime =
      dto.status === OrderStatus.PICKED_UP ? new Date() : null;

    const updated = await this.databaseProvider.updateOrderStatus(
      orderId,
      dto.status,
      pickupTime,
    );

    return this.mapToDto(updated);
  }

  async completePickup(orderId: string, userId: string): Promise<OrderDto> {
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

    const updated = await this.databaseProvider.updateOrderStatus(
      orderId,
      OrderStatus.PICKED_UP,
      new Date(),
    );

    return this.mapToDto(updated);
  }

  private isValidStatusTransition(
    currentStatus: OrderStatus,
    newStatus: OrderStatus,
  ): boolean {
    const allowedTransitions = ORDER_STATUS_TRANSITIONS[currentStatus];
    return allowedTransitions.includes(newStatus);
  }

  private mapToDto(order: Order): OrderDto {
    return {
      id: order.id,
      user_id: order.user_id,
      restaurant_id: order.restaurant_id,
      status: order.status,
      total_amount: order.total_amount,
      payment_id: order.payment_id,
      route_polyline: order.route_polyline,
      pickup_time: order.pickup_time,
      created_at: order.created_at,
      updated_at: order.updated_at,
    };
  }
}

