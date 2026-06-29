import { IsString, IsEnum, IsUUID, IsOptional } from 'class-validator';

export enum TicketType {
  BUG = 'bug',
  FEATURE = 'feature',
  FIX = 'fix',
}

export class CreateTicketDto {
  @IsString()
  @IsUUID()
  teamId: string;

  @IsString()
  @IsUUID()
  @IsOptional()
  epicId?: string;

  @IsString()
  @IsUUID()
  @IsOptional()
  createdById?: string;

  @IsEnum(TicketType)
  type: TicketType;

  @IsString()
  title: string;

  @IsString()
  body: string;
}
