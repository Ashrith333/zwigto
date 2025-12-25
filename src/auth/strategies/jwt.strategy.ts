import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UserPayload } from '../interfaces/user.interface';
import { JwtConfig } from '../config/jwt.config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    // Ensure JWT config is initialized
    JwtConfig.initialize();
    const secret = JwtConfig.getSecret();
    const config = JwtConfig.verify();
    
    console.log('✅ JWT Strategy initialized with secret:', config.secretPreview);
    if (!config.valid) {
      console.error('⚠️  CRITICAL: JWT_SECRET not properly configured!');
    }
    
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  async validate(payload: any): Promise<UserPayload> {
    // JWT standard uses 'sub' for subject (user ID)
    // Support both 'sub' and 'id' for backward compatibility
    const userId = payload.sub || payload.id;
    
    console.log('JWT Strategy validate called with payload:', {
      sub: payload.sub,
      id: payload.id,
      userId,
      hasPhone: !!payload.phone,
      hasRole: !!payload.role,
      phone: payload.phone,
      role: payload.role,
      fullPayload: payload,
    });

    if (!userId || !payload.phone || !payload.role) {
      console.error('Invalid token payload - missing required fields:', {
        hasUserId: !!userId,
        hasPhone: !!payload.phone,
        hasRole: !!payload.role,
      });
      throw new UnauthorizedException('Invalid token payload');
    }

    // Return UserPayload with 'id' field (mapped from 'sub')
    return {
      id: userId,
      phone: payload.phone,
      role: payload.role,
    };
  }
}

