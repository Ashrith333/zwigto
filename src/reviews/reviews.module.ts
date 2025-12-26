import { Module, forwardRef } from '@nestjs/common';
import { ReviewsController } from './reviews.controller';
import { ReviewsService } from './reviews.service';
import { DatabaseProvider } from './providers/database.provider';
import { OrdersModule } from '../orders/orders.module';
import { RestaurantsModule } from '../restaurants/restaurants.module';

@Module({
  imports: [forwardRef(() => OrdersModule), RestaurantsModule],
  controllers: [ReviewsController],
  providers: [ReviewsService, DatabaseProvider],
  exports: [ReviewsService],
})
export class ReviewsModule {}

