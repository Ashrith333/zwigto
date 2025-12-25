import { IsString, IsPhoneNumber, MinLength } from 'class-validator';

export class LoginDto {
  @IsString()
  @IsPhoneNumber('IN')
  phone: string;

  @IsString()
  @MinLength(6)
  password: string;
}

