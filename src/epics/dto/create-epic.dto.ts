import { IsString, IsUUID, IsOptional } from 'class-validator';

export class CreateEpicDto {
  @IsString()
  @IsUUID()
  teamId: string;

  @IsString()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;
}
