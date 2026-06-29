import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTeamDto } from './dto/create-team.dto';
import { UpdateTeamDto } from './dto/update-team.dto';

@Injectable()
export class TeamsService {
  constructor(private prisma: PrismaService) {}

  async createTeam(createTeamDto: CreateTeamDto) {
    return this.prisma.team.create({
      data: {
        name: createTeamDto.name,
      },
    });
  }

  async getAllTeams() {
    return this.prisma.team.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async getTeamById(id: string) {
    const team = await this.prisma.team.findUnique({
      where: { id },
    });

    if (!team) {
      throw new NotFoundException(`Team with ID ${id} not found`);
    }

    return team;
  }

  async updateTeam(id: string, updateTeamDto: UpdateTeamDto) {
    await this.getTeamById(id);

    return this.prisma.team.update({
      where: { id },
      data: {
        ...(updateTeamDto.name && { name: updateTeamDto.name }),
      },
    });
  }

  async deleteTeam(id: string) {
    await this.getTeamById(id);

    return this.prisma.team.delete({
      where: { id },
    });
  }
}
