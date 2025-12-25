import { IsString, IsNumber, IsOptional, Min, IsEnum } from 'class-validator';

export enum FoodType {
  VEG = 'VEG',
  NON_VEG = 'NON_VEG',
}

export class CreateMenuItemDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @Min(0)
  price: number;

  @IsNumber()
  @Min(1)
  prep_time_minutes: number;

  @IsEnum(FoodType)
  @IsOptional()
  food_type?: FoodType;

  @IsString()
  @IsOptional()
  image_url?: string;
}

