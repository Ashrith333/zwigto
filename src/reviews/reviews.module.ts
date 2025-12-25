import { Module } from '@nestjs/common';
import { ReviewsController } from './reviews.controller';
import { ReviewsService } from './reviews.service';
import { DatabaseProvider } from './providers/database.provider';
import { OrdersModule } from '../orders/orders.module';

@Module({
  imports: [OrdersModule],
  controllers: [ReviewsController],
  providers: [ReviewsService, DatabaseProvider],
  exports: [ReviewsService],
})
export class ReviewsModule {}

