import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { DatabaseProvider } from './providers/database.provider';
import { RazorpayProvider } from './providers/razorpay.provider';

@Module({
  controllers: [PaymentsController],
  providers: [PaymentsService, DatabaseProvider, RazorpayProvider],
  exports: [PaymentsService],
})
export class PaymentsModule {}

