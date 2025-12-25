import { IsArray, IsNumber, Min, ArrayMinSize, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class PointDto {
  @IsNumber()
  latitude: number;

  @IsNumber()
  longitude: number;
}

export class FindRestaurantsDto {
  @IsArray()
  @ArrayMinSize(2)
  @ValidateNested({ each: true })
  @Type(() => PointDto)
  route: PointDto[];

  @IsNumber()
  @Min(0)
  buffer_time_minutes: number;
}

