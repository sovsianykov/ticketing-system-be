import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-jwt';
import { Request } from 'express';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../../users/users.service';
import { JwtPayload } from '../../common/types/user.types';

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh',
) {
  constructor(
    configService: ConfigService,
    private readonly usersService: UsersService,
  ) {
    super({
      jwtFromRequest: (req: Request) =>
        (req.cookies as Record<string, string | undefined>)?.refreshToken ??
        null,
      secretOrKey: configService.getOrThrow('jwt.refreshSecret'),
      passReqToCallback: true,
      ignoreExpiration: false,
    });
  }

  async validate(req: Request, payload: JwtPayload) {
    const rawToken = (req.cookies as Record<string, string | undefined>)
      ?.refreshToken;

    if (!rawToken) {
      throw new UnauthorizedException('Refresh token missing');
    }

    const user = await this.usersService.findById(payload.sub);

    if (!user) {
      throw new UnauthorizedException();
    }

    return { ...user, rawRefreshToken: rawToken };
  }
}
