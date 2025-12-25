import { IsString, IsNotEmpty, IsOptional, Matches } from 'class-validator';

export class UnifiedAuthDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^\+?[1-9]\d{1,14}$/, {
    message: 'Phone number must be in international format',
  })
  phone: string;

  @IsString()
  @IsNotEmpty()
  password: string;

  @IsString()
  @IsOptional()
  otp?: string; // Required only for new user signup
}

