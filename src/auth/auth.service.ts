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

    await this.createAndSendVerificationToken(user.id, user.email);

    const { passwordHash: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async validateUser(email: string, password: string) {
    const user = await this.usersService.validateUser(email, password);
    return user;
  }

  async login(user: any) {
    const payload = { email: user.email, sub: user.id };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        isEmailVerified: user.isEmailVerified,
      },
    };
  }

  async verifyEmail(token: string) {
    const tokenHash = await argon2.hash(token);

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
    const tokenHash = await argon2.hash(token);
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
}
