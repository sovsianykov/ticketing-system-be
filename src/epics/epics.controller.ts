import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { EpicsService } from './epics.service';
import { CreateEpicDto } from './dto/create-epic.dto';
import { UpdateEpicDto } from './dto/update-epic.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('epics')
export class EpicsController {
  constructor(private readonly epicsService: EpicsService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  createEpic(@Body() createEpicDto: CreateEpicDto) {
    return this.epicsService.createEpic(createEpicDto);
  }

  @Get()
  getAllEpics(@Query('teamId') teamId?: string) {
    return this.epicsService.getAllEpics(teamId);
  }

  @Get(':id')
  getEpicById(@Param('id') id: string) {
    return this.epicsService.getEpicById(id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  updateEpic(@Param('id') id: string, @Body() updateEpicDto: UpdateEpicDto) {
    return this.epicsService.updateEpic(id, updateEpicDto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  deleteEpic(@Param('id') id: string) {
    return this.epicsService.deleteEpic(id);
  }
}
