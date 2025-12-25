import { IsString, IsPhoneNumber, Length } from 'class-validator';

export class VerifyOtpDto {
  @IsString()
  @IsPhoneNumber('IN')
  phone: string;

  @IsString()
  @Length(4, 6)
  otp: string;
}

