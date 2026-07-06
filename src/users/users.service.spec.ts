import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersRepository } from './users.repository';
import * as argon2 from 'argon2';

jest.mock('argon2');

const mockUser = {
  id: 'user-1',
  email: 'test@example.com',
  passwordHash: 'hashed',
  name: 'Test User',
  isEmailVerified: false,
  verifiedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockRepository = {
  create: jest.fn(),
  findById: jest.fn(),
  findByEmail: jest.fn(),
  update: jest.fn(),
  markEmailAsVerified: jest.fn(),
  findAll: jest.fn(),
};

describe('UsersService', () => {
  let service: UsersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: UsersRepository, useValue: mockRepository },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('throws ConflictException if email already exists', async () => {
      mockRepository.findByEmail.mockResolvedValue(mockUser);
      await expect(
        service.create({ email: 'test@example.com', password: 'pass', name: 'Test' }),
      ).rejects.toThrow(ConflictException);
    });

    it('hashes password and creates user', async () => {
      mockRepository.findByEmail.mockResolvedValue(null);
      (argon2.hash as jest.Mock).mockResolvedValue('hashed');
      mockRepository.create.mockResolvedValue(mockUser);

      const result = await service.create({
        email: 'TEST@EXAMPLE.COM',
        password: 'plaintext',
        name: 'Test User',
      });

      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ email: 'test@example.com', passwordHash: 'hashed' }),
      );
      expect(result).not.toHaveProperty('passwordHash');
    });
  });

  describe('findById', () => {
    it('throws NotFoundException when user missing', async () => {
      mockRepository.findById.mockResolvedValue(null);
      await expect(service.findById('missing')).rejects.toThrow(NotFoundException);
    });

    it('returns user without passwordHash', async () => {
      mockRepository.findById.mockResolvedValue(mockUser);
      const result = await service.findById('user-1');
      expect(result).not.toHaveProperty('passwordHash');
      expect(result.id).toBe('user-1');
    });
  });

  describe('findByEmail', () => {
    it('returns null when user not found', async () => {
      mockRepository.findByEmail.mockResolvedValue(null);
      const result = await service.findByEmail('none@example.com');
      expect(result).toBeNull();
    });

    it('returns user without passwordHash', async () => {
      mockRepository.findByEmail.mockResolvedValue(mockUser);
      const result = await service.findByEmail('test@example.com');
      expect(result).not.toHaveProperty('passwordHash');
    });
  });

  describe('update', () => {
    it('throws NotFoundException when user missing', async () => {
      mockRepository.findById.mockResolvedValue(null);
      await expect(service.update('missing', { name: 'X' })).rejects.toThrow(NotFoundException);
    });

    it('updates and returns user without passwordHash', async () => {
      mockRepository.findById.mockResolvedValue(mockUser);
      mockRepository.update.mockResolvedValue({ ...mockUser, name: 'Updated' });
      const result = await service.update('user-1', { name: 'Updated' });
      expect(result.name).toBe('Updated');
      expect(result).not.toHaveProperty('passwordHash');
    });
  });

  describe('findAll', () => {
    it('returns all users without passwordHash', async () => {
      mockRepository.findAll.mockResolvedValue([mockUser]);
      const result = await service.findAll();
      expect(result).toHaveLength(1);
      expect(result[0]).not.toHaveProperty('passwordHash');
    });
  });

  describe('validateUser', () => {
    it('returns null when user not found', async () => {
      mockRepository.findByEmail.mockResolvedValue(null);
      const result = await service.validateUser('none@example.com', 'pass');
      expect(result).toBeNull();
    });

    it('returns null when password invalid', async () => {
      mockRepository.findByEmail.mockResolvedValue(mockUser);
      (argon2.verify as jest.Mock).mockResolvedValue(false);
      const result = await service.validateUser('test@example.com', 'wrong');
      expect(result).toBeNull();
    });

    it('returns user without passwordHash on valid credentials', async () => {
      mockRepository.findByEmail.mockResolvedValue(mockUser);
      (argon2.verify as jest.Mock).mockResolvedValue(true);
      const result = await service.validateUser('test@example.com', 'correct');
      expect(result).not.toBeNull();
      expect(result).not.toHaveProperty('passwordHash');
    });

    it('lowercases email before lookup', async () => {
      mockRepository.findByEmail.mockResolvedValue(null);
      await service.validateUser('TEST@EXAMPLE.COM', 'pass');
      expect(mockRepository.findByEmail).toHaveBeenCalledWith('test@example.com');
    });
  });
});
