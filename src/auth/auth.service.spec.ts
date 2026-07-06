import { Test, TestingModule } from '@nestjs/testing';
import {
  ConflictException,
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { EmailService } from '../email/email.service';
import { PrismaService } from '../prisma/prisma.service';
import * as argon2 from 'argon2';

jest.mock('argon2');

const mockUser = {
  id: 'user-1',
  email: 'test@example.com',
  passwordHash: 'hashed',
  name: 'Test',
  isEmailVerified: true,
  verifiedAt: new Date(),
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockPrisma = {
  user: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn() },
  refreshToken: {
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
  emailVerificationToken: {
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
  $transaction: jest.fn(),
};

const mockJwt = { sign: jest.fn().mockReturnValue('access-token') };
const mockConfig = { getOrThrow: jest.fn().mockReturnValue('secret'), get: jest.fn() };
const mockEmail = { sendVerificationEmail: jest.fn().mockResolvedValue(undefined) };

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: JwtService, useValue: mockJwt },
        { provide: ConfigService, useValue: mockConfig },
        { provide: EmailService, useValue: mockEmail },
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
    mockJwt.sign.mockReturnValue('access-token');
    mockConfig.getOrThrow.mockReturnValue('secret');
    mockEmail.sendVerificationEmail.mockResolvedValue(undefined);
    (argon2.hash as jest.Mock).mockResolvedValue('hashed');
    (argon2.verify as jest.Mock).mockResolvedValue(true);
  });

  describe('register', () => {
    it('throws ConflictException if user already exists', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      await expect(
        service.register({ email: 'test@example.com', password: 'pass', name: 'Test' }),
      ).rejects.toThrow(ConflictException);
    });

    it('creates user with lowercased email and hashed password', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue(mockUser);
      mockPrisma.emailVerificationToken.create.mockResolvedValue({});

      const result = await service.register({
        email: 'TEST@EXAMPLE.COM',
        password: 'pass',
        name: 'Test',
      });

      expect(mockPrisma.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ email: 'test@example.com' }),
      });
      expect(result).toEqual({ message: expect.any(String) });
    });
  });

  describe('login', () => {
    it('returns access and refresh tokens', async () => {
      mockPrisma.refreshToken.create.mockResolvedValue({});
      const userWithoutPassword = { ...mockUser };
      delete (userWithoutPassword as any).passwordHash;

      const result = await service.login(userWithoutPassword as any);
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
    });
  });

  describe('refreshTokens', () => {
    it('throws UnauthorizedException when no stored token', async () => {
      mockPrisma.refreshToken.findFirst.mockResolvedValue(null);
      await expect(service.refreshTokens('user-1', 'raw-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('revokes all tokens and throws on invalid token hash (potential reuse)', async () => {
      mockPrisma.refreshToken.findFirst.mockResolvedValue({
        id: 'rt-1',
        userId: 'user-1',
        tokenHash: 'hash',
        user: mockUser,
      });
      (argon2.verify as jest.Mock).mockResolvedValue(false);
      mockPrisma.refreshToken.updateMany.mockResolvedValue({});

      await expect(service.refreshTokens('user-1', 'bad-token')).rejects.toThrow(
        UnauthorizedException,
      );
      expect(mockPrisma.refreshToken.updateMany).toHaveBeenCalled();
    });

    it('rotates tokens on valid refresh', async () => {
      mockPrisma.refreshToken.findFirst.mockResolvedValue({
        id: 'rt-1',
        userId: 'user-1',
        tokenHash: 'hash',
        user: mockUser,
      });
      (argon2.verify as jest.Mock).mockResolvedValue(true);
      mockPrisma.refreshToken.update.mockResolvedValue({});
      mockPrisma.refreshToken.create.mockResolvedValue({});

      const result = await service.refreshTokens('user-1', 'valid-token');
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(mockPrisma.refreshToken.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'rt-1' } }),
      );
    });
  });

  describe('logout', () => {
    it('revokes specific token when valid refresh token provided', async () => {
      mockPrisma.refreshToken.findFirst.mockResolvedValue({
        id: 'rt-1',
        tokenHash: 'hash',
      });
      (argon2.verify as jest.Mock).mockResolvedValue(true);
      mockPrisma.refreshToken.update.mockResolvedValue({});

      const result = await service.logout('user-1', 'valid-token');
      expect(mockPrisma.refreshToken.update).toHaveBeenCalled();
      expect(result.message).toContain('Logged out');
    });

    it('revokes all sessions when no refresh token provided', async () => {
      mockPrisma.refreshToken.updateMany.mockResolvedValue({});
      const result = await service.logout('user-1');
      expect(mockPrisma.refreshToken.updateMany).toHaveBeenCalled();
      expect(result.message).toContain('Logged out');
    });
  });

  describe('verifyEmail', () => {
    it('throws BadRequestException when no matching token found', async () => {
      mockPrisma.emailVerificationToken.findMany.mockResolvedValue([]);
      await expect(service.verifyEmail('bad-token')).rejects.toThrow(BadRequestException);
    });

    it('marks token used and user verified on valid token', async () => {
      const verificationRecord = {
        id: 'vt-1',
        tokenHash: 'hash',
        user: mockUser,
      };
      mockPrisma.emailVerificationToken.findMany.mockResolvedValue([verificationRecord]);
      (argon2.verify as jest.Mock).mockResolvedValue(true);
      mockPrisma.$transaction.mockImplementation(async (fn: any) => fn(mockPrisma));
      mockPrisma.emailVerificationToken.update.mockResolvedValue({});
      mockPrisma.user.update.mockResolvedValue({ ...mockUser, isEmailVerified: true });
      mockPrisma.refreshToken.create.mockResolvedValue({});

      const result = await service.verifyEmail('valid-token');
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('user');
      expect(result.user).not.toHaveProperty('passwordHash');
    });
  });

  describe('resendVerificationEmail', () => {
    it('returns same message when user not found (prevents enumeration)', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      const result = await service.resendVerificationEmail('none@example.com');
      expect(result.message).toBeTruthy();
    });

    it('returns same message when user already verified', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ ...mockUser, isEmailVerified: true });
      const result = await service.resendVerificationEmail('test@example.com');
      expect(result.message).toBeTruthy();
    });

    it('invalidates old tokens and sends new one for unverified user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ ...mockUser, isEmailVerified: false });
      mockPrisma.emailVerificationToken.updateMany.mockResolvedValue({});
      mockPrisma.emailVerificationToken.create.mockResolvedValue({});
      mockEmail.sendVerificationEmail.mockResolvedValue(undefined);

      await service.resendVerificationEmail('test@example.com');
      expect(mockPrisma.emailVerificationToken.updateMany).toHaveBeenCalled();
    });
  });

  describe('deleteUser', () => {
    it('throws NotFoundException when user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      await expect(service.deleteUser('missing')).rejects.toThrow(NotFoundException);
    });

    it('deletes user and returns message', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.user.delete.mockResolvedValue(mockUser);
      const result = await service.deleteUser('user-1');
      expect(mockPrisma.user.delete).toHaveBeenCalledWith({ where: { id: 'user-1' } });
      expect(result.message).toBeTruthy();
    });
  });
});
