import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(
    private configService: ConfigService,
    private reflector: Reflector,
  ) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers?.authorization;

    // Only bypass when no Authorization header is provided in dev mode
    const isDevMode = this.configService.get('DEV_MODE') === 'true';
    const isDevelopment = this.configService.get('NODE_ENV') === 'development';

    if (isDevMode && isDevelopment && !authHeader) {
      request.user = {
        id: '42c914e3-42c0-42b4-82e6-445b44914770',
        email: 'demo@example.com',
        first_name: 'Demo',
        last_name: 'User',
        role: 'company_user',
      };
      return true;
    }

    return super.canActivate(context);
  }
}
