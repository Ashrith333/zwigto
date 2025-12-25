import { IsString, IsNumber, IsArray, IsObject, ValidateNested, Min, IsOptional } from 'class-validator';
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
  @IsOptional()
  payment_id?: string; // Optional for cash on pickup

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
  @IsOptional()
  route_polyline?: RoutePointDto[]; // Optional for now
}

