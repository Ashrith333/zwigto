import { Injectable } from '@nestjs/common';
import { RestaurantsService } from '../restaurants/restaurants.service';
import { OrdersService } from '../orders/orders.service';
import { PaymentsService } from '../payments/payments.service';
import { ChangeRequestDto } from '../restaurants/dto/change-request.dto';
import { RestaurantProfileDto } from '../restaurants/dto/restaurant-profile.dto';
import { OrderDto } from '../orders/dto/order.dto';
import { UpdateOrderStatusDto } from '../orders/dto/update-order-status.dto';
import { OrderStatus } from '../orders/interfaces/order.interface';

@Injectable()
export class AdminService {
  constructor(
    private readonly restaurantsService: RestaurantsService,
    private readonly ordersService: OrdersService,
    private readonly paymentsService: PaymentsService,
  ) {}

  async approveChangeRequest(changeRequestId: string): Promise<ChangeRequestDto> {
    return this.restaurantsService.approveChangeRequest(changeRequestId);
  }

  async rejectChangeRequest(changeRequestId: string): Promise<ChangeRequestDto> {
    return this.restaurantsService.rejectChangeRequest(changeRequestId);
  }

  async pauseRestaurant(restaurantId: string): Promise<RestaurantProfileDto> {
    return this.restaurantsService.pauseRestaurant(restaurantId);
  }

  async approveRestaurant(restaurantId: string): Promise<RestaurantProfileDto> {
    return this.restaurantsService.approveRestaurant(restaurantId);
  }

  async rejectRestaurant(restaurantId: string, rejectionReason: string): Promise<RestaurantProfileDto> {
    return this.restaurantsService.rejectRestaurant(restaurantId, rejectionReason);
  }

  async cancelOrder(orderId: string): Promise<OrderDto> {
    const updateDto: UpdateOrderStatusDto = {
      status: OrderStatus.CANCELLED,
    };
    return this.ordersService.updateOrderStatus(orderId, updateDto);
  }

  async refundPayment(
    paymentId: string,
    amount?: number,
  ): Promise<{ refund_id: string; status: string }> {
    return this.paymentsService.refundPayment(paymentId, amount);
  }

  async getPendingRestaurants(): Promise<RestaurantProfileDto[]> {
    return this.restaurantsService.listPendingRestaurants();
  }

  async getAllChangeRequests(): Promise<ChangeRequestDto[]> {
    return this.restaurantsService.getAllChangeRequests();
  }

  async getAllOrders(): Promise<OrderDto[]> {
    return this.ordersService.getAllOrders();
  }

  async getAllPayments(): Promise<any[]> {
    return this.paymentsService.getAllPayments();
  }
}

