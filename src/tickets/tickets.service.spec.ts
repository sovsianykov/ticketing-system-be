import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { TicketsService } from './tickets.service';
import { PrismaService } from '../prisma/prisma.service';

const mockTicket = {
  id: 'ticket-1',
  title: 'Test ticket',
  body: 'Body',
  type: 'bug',
  state: 'new',
  teamId: 'team-1',
  epicId: null,
  createdById: 'user-1',
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockPrisma = {
  ticket: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};

describe('TicketsService', () => {
  let service: TicketsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TicketsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<TicketsService>(TicketsService);
    jest.clearAllMocks();
  });

  describe('createTicket', () => {
    it('creates a ticket with required fields', async () => {
      mockPrisma.ticket.create.mockResolvedValue(mockTicket);
      const result = await service.createTicket(
        { teamId: 'team-1', type: 'bug', title: 'Test ticket', body: 'Body' },
        'user-1',
      );
      expect(result).toEqual(mockTicket);
      expect(mockPrisma.ticket.create).toHaveBeenCalled();
    });

    it('includes epic connect when epicId provided', async () => {
      mockPrisma.ticket.create.mockResolvedValue(mockTicket);
      await service.createTicket(
        { teamId: 'team-1', type: 'bug', title: 'T', body: 'B', epicId: 'epic-1' },
        'user-1',
      );
      const callData = mockPrisma.ticket.create.mock.calls[0][0].data;
      expect(callData).toHaveProperty('epic');
    });
  });

  describe('getAllTickets', () => {
    it('returns tickets without filters', async () => {
      mockPrisma.ticket.findMany.mockResolvedValue([mockTicket]);
      const result = await service.getAllTickets();
      expect(result).toHaveLength(1);
      expect(mockPrisma.ticket.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: {} }),
      );
    });

    it('applies teamId filter', async () => {
      mockPrisma.ticket.findMany.mockResolvedValue([mockTicket]);
      await service.getAllTickets({ teamId: 'team-1' });
      expect(mockPrisma.ticket.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { teamId: 'team-1' } }),
      );
    });

    it('applies state filter', async () => {
      mockPrisma.ticket.findMany.mockResolvedValue([]);
      await service.getAllTickets({ state: 'in_progress' as any });
      expect(mockPrisma.ticket.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { state: 'in_progress' } }),
      );
    });
  });

  describe('getTicketById', () => {
    it('returns ticket when found', async () => {
      mockPrisma.ticket.findUnique.mockResolvedValue(mockTicket);
      const result = await service.getTicketById('ticket-1');
      expect(result).toEqual(mockTicket);
    });

    it('throws NotFoundException when ticket missing', async () => {
      mockPrisma.ticket.findUnique.mockResolvedValue(null);
      await expect(service.getTicketById('missing')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateTicket', () => {
    it('throws NotFoundException when ticket missing', async () => {
      mockPrisma.ticket.findUnique.mockResolvedValue(null);
      await expect(service.updateTicket('missing', { title: 'New' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('updates and returns ticket', async () => {
      mockPrisma.ticket.findUnique.mockResolvedValue(mockTicket);
      mockPrisma.ticket.update.mockResolvedValue({ ...mockTicket, title: 'Updated' });
      const result = await service.updateTicket('ticket-1', { title: 'Updated' });
      expect(result.title).toBe('Updated');
    });
  });

  describe('deleteTicket', () => {
    it('throws NotFoundException when ticket missing', async () => {
      mockPrisma.ticket.findUnique.mockResolvedValue(null);
      await expect(service.deleteTicket('missing')).rejects.toThrow(NotFoundException);
    });

    it('deletes ticket', async () => {
      mockPrisma.ticket.findUnique.mockResolvedValue(mockTicket);
      mockPrisma.ticket.delete.mockResolvedValue(mockTicket);
      await service.deleteTicket('ticket-1');
      expect(mockPrisma.ticket.delete).toHaveBeenCalledWith({ where: { id: 'ticket-1' } });
    });
  });
});
