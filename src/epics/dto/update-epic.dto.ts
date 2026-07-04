import { IsString, IsUUID, IsOptional } from 'class-validator';

export class UpdateEpicDto {
  @IsString()
  @IsUUID()
  @IsOptional()
  teamId?: string;

  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;
}
