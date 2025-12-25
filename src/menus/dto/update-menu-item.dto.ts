import { IsString, IsNumber, IsOptional, IsBoolean, Min, IsEnum } from 'class-validator';
import { FoodType } from './create-menu-item.dto';

export class UpdateMenuItemDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  price?: number;

  @IsNumber()
  @Min(1)
  @IsOptional()
  prep_time_minutes?: number;

  @IsEnum(FoodType)
  @IsOptional()
  food_type?: FoodType;

  @IsString()
  @IsOptional()
  image_url?: string;

  @IsBoolean()
  @IsOptional()
  is_available?: boolean;
}

