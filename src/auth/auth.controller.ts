import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { SendOtpDto } from './dto/send-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { LoginDto } from './dto/login.dto';
import { SetPasswordDto } from './dto/set-password.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UnifiedAuthDto } from './dto/unified-auth.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { Public } from './decorators/public.decorator';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('send-otp')
  @HttpCode(HttpStatus.OK)
  async sendOtp(@Body() dto: SendOtpDto): Promise<{ message: string }> {
    return this.authService.sendOtp(dto);
  }

  @Public()
  @Post('verify-otp')
  @HttpCode(HttpStatus.OK)
  async verifyOtp(@Body() dto: VerifyOtpDto): Promise<AuthResponseDto> {
    return this.authService.verifyOtp(dto);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto): Promise<AuthResponseDto> {
    return this.authService.login(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('set-password')
  @HttpCode(HttpStatus.OK)
  async setPassword(
    @Request() req: any,
    @Body() dto: SetPasswordDto,
  ): Promise<{ message: string }> {
    return this.authService.setPassword(req.user.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @Request() req: any,
    @Body() dto: ChangePasswordDto,
  ): Promise<{ message: string }> {
    return this.authService.changePassword(req.user.id, dto.current_password, dto.new_password);
  }

  @Public()
  @Post('unified-auth')
  @HttpCode(HttpStatus.OK)
  async unifiedAuth(
    @Body() dto: UnifiedAuthDto,
  ): Promise<AuthResponseDto | { message: string; requiresOtp: boolean }> {
    return this.authService.unifiedAuth(dto);
  }
}

