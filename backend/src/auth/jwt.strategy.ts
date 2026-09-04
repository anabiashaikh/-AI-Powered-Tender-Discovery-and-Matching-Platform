import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private authService: AuthService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get('JWT_SECRET'),
    });
  }

  async validate(payload: any) {
    const isDemoMode = this.configService.get<string>('DEMO_MODE') === 'true';
    const demoEmail = (this.configService.get<string>('DEMO_EMAIL') || 'admin@tenderdiscovery.com').trim();

    if (isDemoMode && (payload?.is_demo || payload?.sub === '00000000-0000-0000-0000-000000000001')) {
      return {
        id: '00000000-0000-0000-0000-000000000001',
        email: payload.email || demoEmail,
        role: payload.role || 'admin',
      };
    }

    const user = await this.authService.validateUser(payload.sub);
    
    if (!user) {
      throw new UnauthorizedException();
    }

    return {
      id: user.id,
      email: user.email,
      role: user.role,
    };
  }
}
