import { IsEmail, IsString, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class LoginDto {
  @IsEmail({}, { message: 'Invalid email format' })
  @Transform(({ value }) => value?.toLowerCase()?.trim())
  email: string;

  @IsString()
  @MinLength(1, { message: 'Password is required' })
  password: string;
}
