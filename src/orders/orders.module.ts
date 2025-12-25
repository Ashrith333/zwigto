import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { DatabaseProvider } from './providers/database.provider';
import { RestaurantsModule } from '../restaurants/restaurants.module';

@Module({
  imports: [RestaurantsModule],
  controllers: [OrdersController],
  providers: [OrdersService, DatabaseProvider],
  exports: [OrdersService],
})
export class OrdersModule {}

