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
import { TicketsService } from './tickets.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketDto, TicketState } from './dto/update-ticket.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { UserWithoutPassword } from '../common/types/user.types';

interface RequestWithUser extends Request {
  user: UserWithoutPassword;
}

@Controller('tickets')
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  createTicket(@Request() req: RequestWithUser, @Body() createTicketDto: CreateTicketDto) {
    return this.ticketsService.createTicket(createTicketDto, req.user.id);
  }

  @Get()
  getAllTickets(
    @Query('teamId') teamId?: string,
    @Query('state') state?: TicketState,
    @Query('type') type?: string,
  ) {
    return this.ticketsService.getAllTickets({ teamId, state, type });
  }

  @Get(':id')
  getTicketById(@Param('id') id: string) {
    return this.ticketsService.getTicketById(id);
  }

  @Patch(':id')
  updateTicket(
    @Param('id') id: string,
    @Body() updateTicketDto: UpdateTicketDto,
  ) {
    return this.ticketsService.updateTicket(id, updateTicketDto);
  }

  @Delete(':id')
  deleteTicket(@Param('id') id: string) {
    return this.ticketsService.deleteTicket(id);
  }
}
