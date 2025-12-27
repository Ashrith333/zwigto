import { IsEnum, IsNotEmpty } from 'class-validator';

export class SetDefaultRoleDto {
  @IsNotEmpty()
  @IsEnum(['USER', 'RESTAURANT', 'ADMIN'])
  default_role: 'USER' | 'RESTAURANT' | 'ADMIN';
}

