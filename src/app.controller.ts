import { Controller, Get } from '@nestjs/common';
import { JwtConfig } from './auth/config/jwt.config';

@Controller()
export class AppController {
  @Get()
  getHealth() {
    return {
      status: 'ok',
      message: 'Zwigto API is running',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('health')
  health() {
    const jwtStatus = JwtConfig.verify();
    return {
      status: 'ok',
      service: 'zwigto-api',
      timestamp: new Date().toISOString(),
      jwt: jwtStatus,
    };
  }
}

