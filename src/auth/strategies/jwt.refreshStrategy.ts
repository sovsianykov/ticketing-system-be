import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-custom';
import { Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service';
import * as argon2 from 'argon2';

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh',
) {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async validate(req: Request) {
    const rawToken = (req.cookies as Record<string, string | undefined>)
      ?.refreshToken;

    if (!rawToken) {
      throw new UnauthorizedException('Refresh token missing');
    }

    const activeTokens = await this.prisma.refreshToken.findMany({
      where: {
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      include: { user: true },
    });

    let matched: (typeof activeTokens)[0] | null = null;
    for (const token of activeTokens) {
      if (await argon2.verify(token.tokenHash, rawToken)) {
        matched = token;
        break;
      }
    }

    if (!matched) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const { passwordHash, ...user } = matched.user;
    void passwordHash;

    return { ...user, rawRefreshToken: rawToken };
  }
}
