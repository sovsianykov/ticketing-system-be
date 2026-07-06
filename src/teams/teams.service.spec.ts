import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { TeamsService } from './teams.service';
import { PrismaService } from '../prisma/prisma.service';

const mockTeam = {
  id: 'team-1',
  name: 'Backend',
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockPrisma = {
  team: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};

describe('TeamsService', () => {
  let service: TeamsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TeamsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<TeamsService>(TeamsService);
    jest.clearAllMocks();
  });

  describe('createTeam', () => {
    it('creates a team with given name', async () => {
      mockPrisma.team.create.mockResolvedValue(mockTeam);
      const result = await service.createTeam({ name: 'Backend' });
      expect(mockPrisma.team.create).toHaveBeenCalledWith({ data: { name: 'Backend' } });
      expect(result).toEqual(mockTeam);
    });
  });

  describe('getAllTeams', () => {
    it('returns all teams ordered by createdAt desc', async () => {
      mockPrisma.team.findMany.mockResolvedValue([mockTeam]);
      const result = await service.getAllTeams();
      expect(result).toHaveLength(1);
      expect(mockPrisma.team.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { createdAt: 'desc' } }),
      );
    });
  });

  describe('getTeamById', () => {
    it('returns team when found', async () => {
      mockPrisma.team.findUnique.mockResolvedValue(mockTeam);
      const result = await service.getTeamById('team-1');
      expect(result).toEqual(mockTeam);
    });

    it('throws NotFoundException when team missing', async () => {
      mockPrisma.team.findUnique.mockResolvedValue(null);
      await expect(service.getTeamById('missing')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateTeam', () => {
    it('throws NotFoundException when team missing', async () => {
      mockPrisma.team.findUnique.mockResolvedValue(null);
      await expect(service.updateTeam('missing', { name: 'X' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('updates team name', async () => {
      mockPrisma.team.findUnique.mockResolvedValue(mockTeam);
      mockPrisma.team.update.mockResolvedValue({ ...mockTeam, name: 'Frontend' });
      const result = await service.updateTeam('team-1', { name: 'Frontend' });
      expect(result.name).toBe('Frontend');
    });

    it('skips undefined name in update', async () => {
      mockPrisma.team.findUnique.mockResolvedValue(mockTeam);
      mockPrisma.team.update.mockResolvedValue(mockTeam);
      await service.updateTeam('team-1', {});
      const updateData = mockPrisma.team.update.mock.calls[0][0].data;
      expect(updateData).not.toHaveProperty('name');
    });
  });

  describe('deleteTeam', () => {
    it('throws NotFoundException when team missing', async () => {
      mockPrisma.team.findUnique.mockResolvedValue(null);
      await expect(service.deleteTeam('missing')).rejects.toThrow(NotFoundException);
    });

    it('deletes team', async () => {
      mockPrisma.team.findUnique.mockResolvedValue(mockTeam);
      mockPrisma.team.delete.mockResolvedValue(mockTeam);
      await service.deleteTeam('team-1');
      expect(mockPrisma.team.delete).toHaveBeenCalledWith({ where: { id: 'team-1' } });
    });
  });
});
