import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { CommentsService } from './comments.service';
import { PrismaService } from '../prisma/prisma.service';

const mockComment = {
  id: 'comment-1',
  body: 'Test comment',
  ticketId: 'ticket-1',
  authorId: 'user-1',
  createdAt: new Date(),
  updatedAt: new Date(),
  author: { id: 'user-1', email: 'test@example.com', name: 'Test' },
};

const mockPrisma = {
  ticketComment: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};

describe('CommentsService', () => {
  let service: CommentsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommentsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<CommentsService>(CommentsService);
    jest.clearAllMocks();
  });

  describe('createComment', () => {
    it('creates a comment connected to ticket and author', async () => {
      mockPrisma.ticketComment.create.mockResolvedValue(mockComment);
      const result = await service.createComment(
        { ticketId: 'ticket-1', body: 'Test comment' },
        'user-1',
      );
      expect(result).toEqual(mockComment);
      const callData = mockPrisma.ticketComment.create.mock.calls[0][0].data;
      expect(callData.ticket).toEqual({ connect: { id: 'ticket-1' } });
      expect(callData.author).toEqual({ connect: { id: 'user-1' } });
    });
  });

  describe('getCommentsByTicket', () => {
    it('returns comments for a ticket ordered by createdAt asc', async () => {
      mockPrisma.ticketComment.findMany.mockResolvedValue([mockComment]);
      const result = await service.getCommentsByTicket('ticket-1');
      expect(result).toHaveLength(1);
      expect(mockPrisma.ticketComment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { ticketId: 'ticket-1' },
          orderBy: { createdAt: 'asc' },
        }),
      );
    });
  });

  describe('getCommentById', () => {
    it('returns comment with author when found', async () => {
      mockPrisma.ticketComment.findUnique.mockResolvedValue(mockComment);
      const result = await service.getCommentById('comment-1');
      expect(result).toEqual(mockComment);
    });

    it('throws NotFoundException when comment missing', async () => {
      mockPrisma.ticketComment.findUnique.mockResolvedValue(null);
      await expect(service.getCommentById('missing')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateComment', () => {
    it('throws NotFoundException when comment missing', async () => {
      mockPrisma.ticketComment.findUnique.mockResolvedValue(null);
      await expect(service.updateComment('missing', 'new body')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('updates comment body', async () => {
      mockPrisma.ticketComment.findUnique.mockResolvedValue(mockComment);
      mockPrisma.ticketComment.update.mockResolvedValue({ ...mockComment, body: 'new body' });
      const result = await service.updateComment('comment-1', 'new body');
      expect(result.body).toBe('new body');
      expect(mockPrisma.ticketComment.update).toHaveBeenCalledWith({
        where: { id: 'comment-1' },
        data: { body: 'new body' },
      });
    });
  });

  describe('deleteComment', () => {
    it('throws NotFoundException when comment missing', async () => {
      mockPrisma.ticketComment.findUnique.mockResolvedValue(null);
      await expect(service.deleteComment('missing')).rejects.toThrow(NotFoundException);
    });

    it('deletes comment', async () => {
      mockPrisma.ticketComment.findUnique.mockResolvedValue(mockComment);
      mockPrisma.ticketComment.delete.mockResolvedValue(mockComment);
      await service.deleteComment('comment-1');
      expect(mockPrisma.ticketComment.delete).toHaveBeenCalledWith({ where: { id: 'comment-1' } });
    });
  });
});
