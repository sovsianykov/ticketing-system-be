import { Test, TestingModule } from '@nestjs/testing';
import { UsersRepository } from './users.repository';
import { PrismaService } from '../prisma/prisma.service';

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

const mockPrisma = {
  user: {
    create: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    findMany: jest.fn(),
  },
};

describe('UsersRepository', () => {
  let repository: UsersRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersRepository,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    repository = module.get<UsersRepository>(UsersRepository);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('creates a user', async () => {
      mockPrisma.user.create.mockResolvedValue(mockUser);
      const result = await repository.create({
        email: 'test@example.com',
        passwordHash: 'hashed',
        name: 'Test User',
      });
      expect(mockPrisma.user.create).toHaveBeenCalledWith({
        data: { email: 'test@example.com', passwordHash: 'hashed', name: 'Test User' },
      });
      expect(result).toEqual(mockUser);
    });
  });

  describe('findById', () => {
    it('returns user when found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      const result = await repository.findById('user-1');
      expect(result).toEqual(mockUser);
    });

    it('returns null when not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      const result = await repository.findById('not-found');
      expect(result).toBeNull();
    });
  });

  describe('findByEmail', () => {
    it('lowercases email before querying', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      await repository.findByEmail('TEST@EXAMPLE.COM');
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
    });

    it('returns null when not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      const result = await repository.findByEmail('none@example.com');
      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('updates user with provided data', async () => {
      const updated = { ...mockUser, name: 'New Name' };
      mockPrisma.user.update.mockResolvedValue(updated);
      const result = await repository.update('user-1', { name: 'New Name' });
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { name: 'New Name' },
      });
      expect(result).toEqual(updated);
    });
  });

  describe('markEmailAsVerified', () => {
    it('sets isEmailVerified and verifiedAt', async () => {
      mockPrisma.user.update.mockResolvedValue({ ...mockUser, isEmailVerified: true });
      await repository.markEmailAsVerified('user-1');
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: expect.objectContaining({ isEmailVerified: true }),
      });
    });
  });

  describe('findAll', () => {
    it('returns all users', async () => {
      mockPrisma.user.findMany.mockResolvedValue([mockUser]);
      const result = await repository.findAll();
      expect(result).toEqual([mockUser]);
    });
  });
});
