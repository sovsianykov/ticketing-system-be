import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { EpicsService } from './epics.service';
import { PrismaService } from '../prisma/prisma.service';

const mockEpic = {
  id: 'epic-1',
  title: 'Auth Epic',
  description: 'Auth features',
  teamId: 'team-1',
  createdAt: new Date(),
  updatedAt: new Date(),
  tickets: [],
};

const mockPrisma = {
  epic: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};

describe('EpicsService', () => {
  let service: EpicsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EpicsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<EpicsService>(EpicsService);
    jest.clearAllMocks();
  });

  describe('createEpic', () => {
    it('creates epic connected to team', async () => {
      mockPrisma.epic.create.mockResolvedValue(mockEpic);
      const result = await service.createEpic({
        teamId: 'team-1',
        title: 'Auth Epic',
        description: 'Auth features',
      });
      expect(result).toEqual(mockEpic);
      const callData = mockPrisma.epic.create.mock.calls[0][0].data;
      expect(callData.team).toEqual({ connect: { id: 'team-1' } });
    });
  });

  describe('getAllEpics', () => {
    it('returns all epics without filter', async () => {
      mockPrisma.epic.findMany.mockResolvedValue([mockEpic]);
      const result = await service.getAllEpics();
      expect(result).toHaveLength(1);
      expect(mockPrisma.epic.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: {} }),
      );
    });

    it('filters by teamId when provided', async () => {
      mockPrisma.epic.findMany.mockResolvedValue([mockEpic]);
      await service.getAllEpics('team-1');
      expect(mockPrisma.epic.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { teamId: 'team-1' } }),
      );
    });
  });

  describe('getEpicById', () => {
    it('returns epic with tickets when found', async () => {
      mockPrisma.epic.findUnique.mockResolvedValue(mockEpic);
      const result = await service.getEpicById('epic-1');
      expect(result).toEqual(mockEpic);
    });

    it('throws NotFoundException when epic missing', async () => {
      mockPrisma.epic.findUnique.mockResolvedValue(null);
      await expect(service.getEpicById('missing')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateEpic', () => {
    it('throws NotFoundException when epic missing', async () => {
      mockPrisma.epic.findUnique.mockResolvedValue(null);
      await expect(service.updateEpic('missing', { title: 'X' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('updates epic fields', async () => {
      mockPrisma.epic.findUnique.mockResolvedValue(mockEpic);
      mockPrisma.epic.update.mockResolvedValue({ ...mockEpic, title: 'Updated' });
      const result = await service.updateEpic('epic-1', { title: 'Updated' });
      expect(result.title).toBe('Updated');
    });

    it('includes description when explicitly set to undefined', async () => {
      mockPrisma.epic.findUnique.mockResolvedValue(mockEpic);
      mockPrisma.epic.update.mockResolvedValue({ ...mockEpic, description: null });
      await service.updateEpic('epic-1', { description: undefined });
      const updateData = mockPrisma.epic.update.mock.calls[0][0].data;
      expect(updateData).not.toHaveProperty('description');
    });
  });

  describe('deleteEpic', () => {
    it('throws NotFoundException when epic missing', async () => {
      mockPrisma.epic.findUnique.mockResolvedValue(null);
      await expect(service.deleteEpic('missing')).rejects.toThrow(NotFoundException);
    });

    it('deletes epic', async () => {
      mockPrisma.epic.findUnique.mockResolvedValue(mockEpic);
      mockPrisma.epic.delete.mockResolvedValue(mockEpic);
      await service.deleteEpic('epic-1');
      expect(mockPrisma.epic.delete).toHaveBeenCalledWith({ where: { id: 'epic-1' } });
    });
  });
});
