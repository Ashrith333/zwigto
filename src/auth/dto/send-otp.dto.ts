import { IsString, IsPhoneNumber } from 'class-validator';

export class SendOtpDto {
  @IsString()
  @IsPhoneNumber('IN')
  phone: string;
}

