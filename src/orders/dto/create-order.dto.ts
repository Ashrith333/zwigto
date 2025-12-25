import { IsString, IsNumber, IsArray, IsObject, ValidateNested, Min } from 'class-validator';
import { Type } from 'class-transformer';

class RoutePointDto {
  @IsNumber()
  latitude: number;

  @IsNumber()
  longitude: number;
}

class OrderItemDto {
  @IsString()
  menu_item_id: string;

  @IsNumber()
  @Min(1)
  quantity: number;
}

export class CreateOrderDto {
  @IsString()
  restaurant_id: string;

  @IsString()
  payment_id: string;

  @IsNumber()
  @Min(0)
  total_amount: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RoutePointDto)
  route_polyline: RoutePointDto[];
}

