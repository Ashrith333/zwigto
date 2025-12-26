import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { ApproveChangeRequestDto } from './dto/approve-change-request.dto';
import { RejectChangeRequestDto } from './dto/reject-change-request.dto';
import { RejectRestaurantDto } from './dto/reject-restaurant.dto';
import { PauseRestaurantDto } from './dto/pause-restaurant.dto';
import { CancelOrderDto } from './dto/cancel-order.dto';
import { RefundPaymentDto } from './dto/refund-payment.dto';
import { ChangeRequestDto } from '../restaurants/dto/change-request.dto';
import { RestaurantProfileDto } from '../restaurants/dto/restaurant-profile.dto';
import { OrderDto } from '../orders/dto/order.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../auth/interfaces/user.interface';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Post('change-requests/:id/approve')
  async approveChangeRequest(
    @Param('id') id: string,
  ): Promise<ChangeRequestDto> {
    return this.adminService.approveChangeRequest(id);
  }

  @Post('change-requests/:id/reject')
  async rejectChangeRequest(
    @Param('id') id: string,
    @Body() dto: RejectChangeRequestDto,
  ): Promise<ChangeRequestDto> {
    return this.adminService.rejectChangeRequest(id, dto.rejection_reason);
  }

  @Patch('restaurants/:id/pause')
  async pauseRestaurant(
    @Param('id') id: string,
  ): Promise<RestaurantProfileDto> {
    return this.adminService.pauseRestaurant(id);
  }

  @Patch('restaurants/:id/approve')
  async approveRestaurant(
    @Param('id') id: string,
  ): Promise<RestaurantProfileDto> {
    return this.adminService.approveRestaurant(id);
  }

  @Patch('restaurants/:id/reject')
  async rejectRestaurant(
    @Param('id') id: string,
    @Body() dto: RejectRestaurantDto,
  ): Promise<RestaurantProfileDto> {
    return this.adminService.rejectRestaurant(id, dto.rejection_reason);
  }

  @Patch('orders/:id/cancel')
  async cancelOrder(@Param('id') id: string): Promise<OrderDto> {
    return this.adminService.cancelOrder(id);
  }

  @Post('payments/:id/refund')
  async refundPayment(
    @Param('id') id: string,
    @Body() dto: RefundPaymentDto,
  ): Promise<{ refund_id: string; status: string }> {
    return this.adminService.refundPayment(id, dto.amount);
  }

  @Get('restaurants/pending')
  async getPendingRestaurants(): Promise<RestaurantProfileDto[]> {
    return this.adminService.getPendingRestaurants();
  }

  @Get('restaurants/pending-with-changes')
  async getPendingRestaurantsWithChanges(): Promise<any[]> {
    return this.adminService.getPendingRestaurantsWithChanges();
  }

  @Get('change-requests')
  async getAllChangeRequests(): Promise<ChangeRequestDto[]> {
    return this.adminService.getAllChangeRequests();
  }

  @Get('orders')
  async getAllOrders(): Promise<OrderDto[]> {
    return this.adminService.getAllOrders();
  }

  @Get('payments')
  async getAllPayments(): Promise<any[]> {
    return this.adminService.getAllPayments();
  }
}

