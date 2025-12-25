import { IsEnum, IsString, IsOptional } from 'class-validator';
import { OrderStatus } from '../interfaces/order.interface';

export class UpdateOrderStatusDto {
  @IsEnum(OrderStatus)
  status: OrderStatus;

  @IsString()
  @IsOptional()
  customer_pin?: string; // Customer's default PIN required when marking as PICKED_UP
}

