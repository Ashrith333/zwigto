import { Module } from '@nestjs/common';
import { RestaurantsController } from './restaurants.controller';
import { RestaurantsService } from './restaurants.service';
import { DatabaseProvider } from './providers/database.provider';

@Module({
  controllers: [RestaurantsController],
  providers: [RestaurantsService, DatabaseProvider],
  exports: [RestaurantsService],
})
export class RestaurantsModule {}

