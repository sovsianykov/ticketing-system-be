import { IsString, IsEnum, IsUUID, IsOptional } from 'class-validator';
import { TicketType } from './create-ticket.dto';

export enum TicketState {
  NEW = 'new',
  READY_FOR_IMPLEMENTATION = 'ready_for_implementation',
  IN_PROGRESS = 'in_progress',
  READY_FOR_ACCEPTANCE = 'ready_for_acceptance',
  DONE = 'done',
}

export class UpdateTicketDto {
  @IsString()
  @IsUUID()
  @IsOptional()
  teamId?: string;

  @IsString()
  @IsUUID()
  @IsOptional()
  epicId?: string;

  @IsEnum(TicketType)
  @IsOptional()
  type?: TicketType;

  @IsEnum(TicketState)
  @IsOptional()
  state?: TicketState;

  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  body?: string;
}
