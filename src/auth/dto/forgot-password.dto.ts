import { IsString, IsPhoneNumber, MinLength } from 'class-validator';

export class ForgotPasswordRequestDto {
  @IsString()
  @IsPhoneNumber('IN')
  phone: string;
}

export class ResetPasswordDto {
  @IsString()
  @IsPhoneNumber('IN')
  phone: string;

  @IsString()
  otp: string;

  @IsString()
  @MinLength(6)
  new_password: string;
}

