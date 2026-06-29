import {
  Injectable,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { EmailService } from '../email/email.service';
import { PrismaService } from '../prisma/prisma.service';
import { UserWithoutPassword, JwtPayload } from '../common/types/user.types';
import * as argon2 from 'argon2';
import { randomBytes } from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private emailService: EmailService,
    private prisma: PrismaService,
  ) {}

  async register(registerDto: RegisterDto) {
    const existingUser = await this.usersService['usersRepository'].findByEmail(
      registerDto.email,
    );

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    const passwordHash = await argon2.hash(registerDto.password);

    const user = await this.usersService['usersRepository'].create({
      email: registerDto.email.toLowerCase(),
      passwordHash,
      name: registerDto.name,
    });

    this.createAndSendVerificationToken(user.id, user.email).catch(() => {
      // Silently ignore email sending errors
    });

    const { passwordHash: _, ...userWithoutPassword } = user;
    const tokens = await this.generateTokens(user);

    return {
      ...tokens,
      user: userWithoutPassword,
    };
  }

  async validateUser(email: string, password: string) {
    const user = await this.usersService.validateUser(email, password);
    return user;
  }

  async login(user: UserWithoutPassword) {
    const tokens = await this.generateTokens(user);

    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        isEmailVerified: user.isEmailVerified,
      },
    };
  }

  private async generateTokens(user: UserWithoutPassword) {
    const payload = { email: user.email, sub: user.id };

    const accessToken = this.jwtService.sign(payload);
    const refreshToken = randomBytes(32).toString('hex');
    // Use fixed salt for token hashing to enable lookup
    const refreshTokenHash = await argon2.hash(refreshToken, { salt: Buffer.from('fixed-salt-for-refresh-tokens') });
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await this.prisma.refreshToken.create({
      data: {
        tokenHash: refreshTokenHash,
        userId: user.id,
        expiresAt,
      },
    });

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
    };
  }

  async verifyEmail(token: string) {
    // Use the same fixed salt for lookup
    const tokenHash = await argon2.hash(token, { salt: Buffer.from('fixed-salt-for-verification-tokens') });

    const verificationToken =
      await this.prisma.emailVerificationToken.findFirst({
        where: {
          tokenHash,
          usedAt: null,
          expiresAt: {
            gt: new Date(),
          },
        },
        include: {
          user: true,
        },
      });

    if (!verificationToken) {
      throw new BadRequestException('Invalid or expired token');
    }

    await this.prisma.$transaction([
      this.prisma.emailVerificationToken.update({
        where: { id: verificationToken.id },
        data: { usedAt: new Date() },
      }),
      this.prisma.user.update({
        where: { id: verificationToken.user.id },
        data: {
          isEmailVerified: true,
          verifiedAt: new Date(),
        },
      }),
    ]);

    return { message: 'Email verified successfully' };
  }

  async resendVerificationEmail(email: string) {
    const user = await this.usersService['usersRepository'].findByEmail(email);

    if (!user) {
      throw new BadRequestException('User not found');
    }

    if (user.isEmailVerified) {
      throw new BadRequestException('Email already verified');
    }

    await this.invalidateOldTokens(user.id);
    await this.createAndSendVerificationToken(user.id, user.email);

    return { message: 'Verification email sent' };
  }

  private async createAndSendVerificationToken(userId: string, email: string) {
    const token = randomBytes(32).toString('hex');
    // Use fixed salt for token hashing to enable lookup
    const tokenHash = await argon2.hash(token, { salt: Buffer.from('fixed-salt-for-verification-tokens') });
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    await this.prisma.emailVerificationToken.create({
      data: {
        tokenHash,
        userId,
        expiresAt,
      },
    });

    await this.emailService.sendVerificationEmail(email, token);
  }

  private async invalidateOldTokens(userId: string) {
    await this.prisma.emailVerificationToken.updateMany({
      where: {
        userId,
        usedAt: null,
      },
      data: {
        usedAt: new Date(),
      },
    });
  }

  async refreshTokens(refreshToken: string) {
    if (!refreshToken) {
      throw new BadRequestException('Refresh token is required');
    }

    // Use the same fixed salt for lookup
    const refreshTokenHash = await argon2.hash(refreshToken, { salt: Buffer.from('fixed-salt-for-refresh-tokens') });

    const storedToken = await this.prisma.refreshToken.findFirst({
      where: {
        tokenHash: refreshTokenHash,
        revokedAt: null,
        expiresAt: {
          gt: new Date(),
        },
      },
      include: {
        user: true,
      },
    });

    if (!storedToken) {
      // Check if token exists but is expired or revoked
      const anyToken = await this.prisma.refreshToken.findFirst({
        where: {
          tokenHash: refreshTokenHash,
        },
      });

      if (!anyToken) {
        throw new BadRequestException('Invalid refresh token - not found in database');
      }

      if (anyToken.revokedAt) {
        throw new BadRequestException('Refresh token has been revoked');
      }

      if (anyToken.expiresAt <= new Date()) {
        throw new BadRequestException('Refresh token has expired');
      }

      throw new BadRequestException('Invalid or expired refresh token');
    }

    await this.prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: {
        lastUsedAt: new Date(),
      },
    });

    const payload = { email: storedToken.user.email, sub: storedToken.user.id };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: storedToken.user.id,
        email: storedToken.user.email,
        name: storedToken.user.name,
        isEmailVerified: storedToken.user.isEmailVerified,
      },
    };
  }
}
