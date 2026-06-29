import { Request } from 'express';

export interface UserWithoutPassword {
  id: string;
  email: string;
  name: string | null;
  isEmailVerified: boolean;
  verifiedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface JwtPayload {
  email: string;
  sub: string;
}

export interface RequestWithUser extends Request {
  user: UserWithoutPassword;
}
