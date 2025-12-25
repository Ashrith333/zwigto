import { IsString, IsNotEmpty } from 'class-validator';

export class RejectRestaurantDto {
  @IsString()
  @IsNotEmpty()
  rejection_reason: string;
}

