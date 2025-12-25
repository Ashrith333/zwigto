import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { DatabaseProvider } from './providers/database.provider';
import { RestaurantsModule } from '../restaurants/restaurants.module';
import { MenusModule } from '../menus/menus.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [RestaurantsModule, MenusModule, UsersModule],
  controllers: [OrdersController],
  providers: [OrdersService, DatabaseProvider],
  exports: [OrdersService],
})
export class OrdersModule {}

