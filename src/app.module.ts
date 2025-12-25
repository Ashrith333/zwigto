import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { RestaurantsModule } from './restaurants/restaurants.module';
import { MenusModule } from './menus/menus.module';
import { GeoModule } from './geo/geo.module';
import { OrdersModule } from './orders/orders.module';
import { PaymentsModule } from './payments/payments.module';
import { ReviewsModule } from './reviews/reviews.module';
import { AdminModule } from './admin/admin.module';

@Module({
  controllers: [AppController],
  imports: [
    AuthModule,
    UsersModule,
    RestaurantsModule,
    MenusModule,
    GeoModule,
    OrdersModule,
    PaymentsModule,
    ReviewsModule,
    AdminModule,
  ],
})
export class AppModule {}

