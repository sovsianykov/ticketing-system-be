import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCommentDto } from './dto/create-comment.dto';

@Injectable()
export class CommentsService {
  constructor(private prisma: PrismaService) {}

  async createComment(dto: CreateCommentDto, authorId: string) {
    return this.prisma.ticketComment.create({
      data: {
        ticket: {
          connect: { id: dto.ticketId },
        },
        author: {
          connect: { id: authorId },
        },
        body: dto.body,
      },
    });
  }

  async getCommentsByTicket(ticketId: string) {
    return this.prisma.ticketComment.findMany({
      where: { ticketId },
      include: {
        author: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
  }

  async getCommentById(id: string) {
    const comment = await this.prisma.ticketComment.findUnique({
      where: { id },
      include: {
        author: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    if (!comment) {
      throw new NotFoundException(`Comment with ID ${id} not found`);
    }

    return comment;
  }

  async updateComment(id: string, body: string) {
    await this.getCommentById(id);

    return this.prisma.ticketComment.update({
      where: { id },
      data: { body },
    });
  }

  async deleteComment(id: string) {
    await this.getCommentById(id);

    return this.prisma.ticketComment.delete({
      where: { id },
    });
  }
}
