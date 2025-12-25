import { IsString, IsOptional, IsNumber, IsEmail, ValidateIf } from 'class-validator';

export class CreateRestaurantDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  address: string;

  @IsNumber()
  latitude: number;

  @IsNumber()
  longitude: number;

  @IsString()
  @IsOptional()
  phone?: string;

  // Only validate email if it's provided and not empty
  @ValidateIf((o) => o.email && o.email.trim() !== '')
  @IsEmail()
  @IsOptional()
  email?: string;

  // Transform empty strings to undefined for optional fields
  static transform(data: any): CreateRestaurantDto {
    return {
      ...data,
      description: data.description || undefined,
      phone: data.phone || undefined,
      email: data.email || undefined,
      payment_account: data.payment_account || undefined,
    };
  }

  @IsString()
  @IsOptional()
  payment_account?: string;
}

