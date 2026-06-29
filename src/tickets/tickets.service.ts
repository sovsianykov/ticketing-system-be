import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketDto, TicketState } from './dto/update-ticket.dto';

@Injectable()
export class TicketsService {
  constructor(private prisma: PrismaService) {}

  async createTicket(dto: CreateTicketDto, createdById: string) {
    return this.prisma.ticket.create({
      data: {
        team: {
          connect: { id: dto.teamId },
        },

        createdBy: {
          connect: { id: createdById },
        },

        ...(dto.epicId && {
          epic: {
            connect: { id: dto.epicId },
          },
        }),

        type: dto.type,
        title: dto.title,
        body: dto.body,
      },
    });
  }

  async getAllTickets(filters?: {
    teamId?: string;
    state?: TicketState;
    type?: string;
  }) {
    const where: Record<string, string> = {};

    if (filters?.teamId) {
      where.teamId = filters.teamId;
    }

    if (filters?.state) {
      where.state = filters.state;
    }

    if (filters?.type) {
      where.type = filters.type;
    }

    return this.prisma.ticket.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async getTicketById(id: string) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id },
    });

    if (!ticket) {
      throw new NotFoundException(`Ticket with ID ${id} not found`);
    }

    return ticket;
  }

  async updateTicket(id: string, updateTicketDto: UpdateTicketDto) {
    await this.getTicketById(id);

    return this.prisma.ticket.update({
      where: { id },
      data: {
        ...(updateTicketDto.teamId && { teamId: updateTicketDto.teamId }),
        ...(updateTicketDto.epicId !== undefined && {
          epicId: updateTicketDto.epicId,
        }),
        ...(updateTicketDto.type && { type: updateTicketDto.type }),
        ...(updateTicketDto.state && { state: updateTicketDto.state }),
        ...(updateTicketDto.title && { title: updateTicketDto.title }),
        ...(updateTicketDto.body && { body: updateTicketDto.body }),
      },
    });
  }

  async deleteTicket(id: string) {
    await this.getTicketById(id);

    return this.prisma.ticket.delete({
      where: { id },
    });
  }
}
