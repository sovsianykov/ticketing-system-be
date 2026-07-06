import {
  Injectable,
  ConflictException,
  BadRequestException,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { RegisterDto } from './dto/register.dto';
import { EmailService } from '../email/email.service';
import { PrismaService } from '../prisma/prisma.service';
import { UserWithoutPassword } from '../common/types/user.types';
import * as argon2 from 'argon2';
import { randomBytes } from 'node:crypto';

const REFRESH_TOKEN_TTL_DAYS = 30;
const EMAIL_TOKEN_TTL_HOURS = 24;

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly emailService: EmailService,
    private readonly prisma: PrismaService,
  ) {}

  // =========================
  // REGISTER
  // =========================
  async register(registerDto: RegisterDto): Promise<{ message: string }> {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: registerDto.email.toLowerCase() },
    });

    if (existingUser) {
      throw new ConflictException('User already exists');
    }

    const passwordHash = await argon2.hash(registerDto.password);

    const user = await this.prisma.user.create({
      data: {
        email: registerDto.email.toLowerCase(),
        passwordHash,
        name: registerDto.name,
      },
    });

    void this.createAndSendVerificationToken(user.id, user.email);

    return { message: 'Registration successful. Please verify your email.' };
  }

  // =========================
  // LOGIN
  // =========================
  async login(
    user: UserWithoutPassword,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const accessToken = this.generateAccessToken(user);
    const refreshToken = await this.generateAndStoreRefreshToken(user.id);

    return { accessToken, refreshToken };
  }

  // =========================
  // REFRESH TOKENS
  // =========================
  async refreshTokens(
    userId: string,
    rawRefreshToken: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const storedToken = await this.prisma.refreshToken.findFirst({
      where: {
        userId,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      include: { user: true },
    });

    if (!storedToken) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const isValid = await argon2.verify(storedToken.tokenHash, rawRefreshToken);

    if (!isValid) {
      // Possible token reuse — revoke all tokens for this user (breach response)
      await this.prisma.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Rotate: revoke old token, issue new pair
    await this.prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { revokedAt: new Date() },
    });

    const { passwordHash, ...user } = storedToken.user;
    void passwordHash;

    const accessToken = this.generateAccessToken(user);
    const refreshToken = await this.generateAndStoreRefreshToken(userId);

    return { accessToken, refreshToken };
  }

  // =========================
  // LOGOUT
  // =========================
  async logout(
    userId: string,
    rawRefreshToken?: string,
  ): Promise<{ message: string }> {
    if (rawRefreshToken) {
      const storedToken = await this.prisma.refreshToken.findFirst({
        where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
      });

      if (storedToken) {
        const isValid = await argon2.verify(
          storedToken.tokenHash,
          rawRefreshToken,
        );
        if (isValid) {
          await this.prisma.refreshToken.update({
            where: { id: storedToken.id },
            data: { revokedAt: new Date() },
          });
          return { message: 'Logged out successfully' };
        }
      }
    }

    // Fallback: revoke all sessions for this user
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    return { message: 'Logged out successfully' };
  }

  // =========================
  // EMAIL VERIFICATION
  // =========================
  async verifyEmail(token: string): Promise<{ message: string }> {
    // Token is opaque (hashed in DB), so we must scan active tokens and verify each.
    // Volume is bounded: one active token per user at a time (resend invalidates prior tokens).
    const candidates = await this.prisma.emailVerificationToken.findMany({
      where: { usedAt: null, expiresAt: { gt: new Date() } },
      include: { user: true },
    });

    let matched: (typeof candidates)[0] | null = null;

    for (const record of candidates) {
      if (await argon2.verify(record.tokenHash, token)) {
        matched = record;
        break;
      }
    }

    if (!matched) {
      throw new BadRequestException('Invalid or expired verification token');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.emailVerificationToken.update({
        where: { id: matched.id },
        data: { usedAt: new Date() },
      });

      await tx.user.update({
        where: { id: matched.user.id },
        data: { isEmailVerified: true, verifiedAt: new Date() },
      });
    });

    return { message: 'Email verified successfully' };
  }

  // =========================
  // RESEND VERIFICATION EMAIL
  // =========================
  async resendVerificationEmail(email: string): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    // Return same message whether user exists or not to prevent user enumeration
    if (!user || user.isEmailVerified) {
      return {
        message:
          'If your email is registered and unverified, a new link has been sent.',
      };
    }

    // Invalidate all existing verification tokens
    await this.prisma.emailVerificationToken.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: new Date() },
    });

    void this.createAndSendVerificationToken(user.id, user.email);

    return {
      message:
        'If your email is registered and unverified, a new link has been sent.',
    };
  }

  // =========================
  // DELETE USER
  // =========================
  async deleteUser(userId: string): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.prisma.user.delete({ where: { id: userId } });

    return { message: 'User deleted' };
  }

  // =========================
  // PRIVATE HELPERS
  // =========================

  private generateAccessToken(user: UserWithoutPassword): string {
    return this.jwtService.sign(
      { sub: user.id, email: user.email },
      {
        secret: this.configService.getOrThrow('jwt.accessSecret'),
        expiresIn: '15m',
      },
    );
  }

  private async generateAndStoreRefreshToken(userId: string): Promise<string> {
    const rawToken = randomBytes(40).toString('hex');
    const tokenHash = await argon2.hash(rawToken);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_TTL_DAYS);

    await this.prisma.refreshToken.create({
      data: { tokenHash, userId, expiresAt },
    });

    return rawToken;
  }

  private async createAndSendVerificationToken(
    userId: string,
    email: string,
  ): Promise<void> {
    const token = randomBytes(32).toString('hex');
    const tokenHash = await argon2.hash(token);

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + EMAIL_TOKEN_TTL_HOURS);

    await this.prisma.emailVerificationToken.create({
      data: { tokenHash, userId, expiresAt },
    });

    await this.emailService.sendVerificationEmail(email, token);
  }
}
