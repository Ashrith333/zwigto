import { Module, forwardRef } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { DatabaseProvider } from './providers/database.provider';
import { OrderEventsGateway } from './order-events.gateway';
import { RestaurantsModule } from '../restaurants/restaurants.module';
import { MenusModule } from '../menus/menus.module';
import { UsersModule } from '../users/users.module';
import { ReviewsModule } from '../reviews/reviews.module';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [
    RestaurantsModule,
    MenusModule,
    UsersModule,
    forwardRef(() => ReviewsModule),
    JwtModule.register({}),
  ],
  controllers: [OrdersController],
  providers: [OrdersService, DatabaseProvider, OrderEventsGateway],
  exports: [OrdersService, OrderEventsGateway],
})
export class OrdersModule {}

