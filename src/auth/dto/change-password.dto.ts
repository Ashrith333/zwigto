import { IsString, MinLength, IsNotEmpty } from 'class-validator';

export class ChangePasswordDto {
  @IsNotEmpty()
  @IsString()
  current_password: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(6)
  new_password: string;
}

