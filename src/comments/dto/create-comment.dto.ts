import { IsString, IsUUID } from 'class-validator';

export class CreateCommentDto {
  @IsString()
  @IsUUID()
  ticketId: string;

  @IsString()
  body: string;
}
