import { IsString, IsOptional, IsNumber, IsEmail } from 'class-validator';

export class SubmitChangeRequestDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsNumber()
  @IsOptional()
  latitude?: number;

  @IsNumber()
  @IsOptional()
  longitude?: number;

  @IsString()
  @IsOptional()
  payment_account?: string;
}

