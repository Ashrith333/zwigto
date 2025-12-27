import { IsOptional, IsString, IsArray } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsArray()
  default_addresses?: any[];
}

