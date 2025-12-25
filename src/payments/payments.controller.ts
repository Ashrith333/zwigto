import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Request,
  Headers,
  UseGuards,
  RawBodyRequest,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { PaymentDto } from './dto/payment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../auth/interfaces/user.interface';
import { Public } from '../auth/decorators/public.decorator';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.USER)
  async createPayment(
    @Request() req: any,
    @Body() dto: CreatePaymentDto,
  ): Promise<PaymentDto> {
    return this.paymentsService.createPayment(req.user.id, dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async getAllPayments(): Promise<PaymentDto[]> {
    return this.paymentsService.getAllPayments();
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.USER)
  async getPayment(
    @Param('id') id: string,
    @Request() req: any,
  ): Promise<PaymentDto> {
    return this.paymentsService.getPayment(id, req.user.id);
  }

  @Post('webhook')
  @Public()
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Request() req: RawBodyRequest<Request>,
    @Headers('x-razorpay-signature') signature: string,
  ): Promise<{ processed: boolean; paymentId?: string }> {
    if (!signature) {
      throw new Error('Missing webhook signature');
    }

    const rawBody = req.rawBody;
    if (!rawBody) {
      throw new Error('Missing request body');
    }

    const webhookBody =
      typeof rawBody === 'string' ? rawBody : rawBody.toString('utf-8');

    return this.paymentsService.handleWebhook(webhookBody, signature);
  }
}

