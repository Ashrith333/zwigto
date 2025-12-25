import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { SupabaseProvider } from './providers/supabase.provider';
import { SupabaseOtpProvider } from './providers/supabase-otp.provider';
import { JwtConfig } from './config/jwt.config';

// Ensure JWT config is initialized before module registration
JwtConfig.initialize();
const jwtConfig = JwtConfig.verify();

@Module({
  imports: [
    PassportModule,
    JwtModule.register({
      secret: JwtConfig.getSecret(),
      signOptions: {
        expiresIn: JwtConfig.getExpiresIn(),
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, SupabaseProvider, SupabaseOtpProvider],
  exports: [AuthService, JwtModule],
})
export class AuthModule {
  constructor() {
    console.log('✅ AuthModule initialized with JWT config:', {
      secretConfigured: jwtConfig.valid,
      secretPreview: jwtConfig.secretPreview,
      expiresIn: jwtConfig.expiresIn,
    });
  }
}

