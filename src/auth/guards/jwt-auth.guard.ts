import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  private isHandlingPublicRoute = false;

  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>('isPublic', [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      // For public routes, still try to validate token if present
      // This allows restaurant owners to be identified so they can see all menu items
      const request = context.switchToHttp().getRequest();
      const token = request.headers?.authorization?.replace('Bearer ', '');
      
      if (token) {
        // Mark that we're handling a public route
        this.isHandlingPublicRoute = true;
        try {
          // Try to validate token and populate user, but don't fail if invalid
          const result = super.canActivate(context);
          // Handle both Promise and Observable cases
          if (result instanceof Promise) {
            return result.then(
              (value) => {
                this.isHandlingPublicRoute = false;
                return value;
              },
              (error) => {
                // Token invalid or expired, but route is public so allow access
                // User will be undefined, which is fine for public routes
                this.isHandlingPublicRoute = false;
                return true;
              }
            );
          }
          // If it's an Observable, convert to Promise
          this.isHandlingPublicRoute = false;
          return result;
        } catch (error) {
          // Token invalid or expired, but route is public so allow access
          // User will be undefined, which is fine for public routes
          this.isHandlingPublicRoute = false;
          return true;
        }
      }
      return true;
    }

    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, info: any) {
    // If we're handling a public route, don't throw errors
    // Just return the user if valid, or null if invalid
    if (this.isHandlingPublicRoute) {
      return user || null;
    }

    // For protected routes, throw error if token is invalid
    if (err || !user) {
      console.error('JWT Auth Guard - Token validation failed:', {
        err: err?.message,
        info: info?.message,
        hasUser: !!user,
      });
      throw err || new UnauthorizedException('Invalid or expired token');
    }
    return user;
  }
}

