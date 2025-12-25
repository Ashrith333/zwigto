import { IsEnum } from 'class-validator';
import { OrderStatus } from '../interfaces/order.interface';

export class UpdateOrderStatusDto {
  @IsEnum(OrderStatus)
  status: OrderStatus;
}

