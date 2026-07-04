import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEpicDto } from './dto/create-epic.dto';
import { UpdateEpicDto } from './dto/update-epic.dto';

@Injectable()
export class EpicsService {
  constructor(private prisma: PrismaService) {}

  async createEpic(dto: CreateEpicDto) {
    return this.prisma.epic.create({
      data: {
        team: {
          connect: { id: dto.teamId },
        },
        title: dto.title,
        description: dto.description,
      },
    });
  }

  async getAllEpics(teamId?: string) {
    const where: Record<string, string> = {};

    if (teamId) {
      where.teamId = teamId;
    }

    return this.prisma.epic.findMany({
      where,
      include: {
        tickets: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async getEpicById(id: string) {
    const epic = await this.prisma.epic.findUnique({
      where: { id },
      include: {
        tickets: true,
      },
    });

    if (!epic) {
      throw new NotFoundException(`Epic with ID ${id} not found`);
    }

    return epic;
  }

  async updateEpic(id: string, updateEpicDto: UpdateEpicDto) {
    await this.getEpicById(id);

    return this.prisma.epic.update({
      where: { id },
      data: {
        ...(updateEpicDto.teamId && { teamId: updateEpicDto.teamId }),
        ...(updateEpicDto.title && { title: updateEpicDto.title }),
        ...(updateEpicDto.description !== undefined && {
          description: updateEpicDto.description,
        }),
      },
    });
  }

  async deleteEpic(id: string) {
    await this.getEpicById(id);

    return this.prisma.epic.delete({
      where: { id },
    });
  }
}
