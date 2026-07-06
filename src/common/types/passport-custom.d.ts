declare module 'passport-custom' {
  import { Request } from 'express';

  type VerifyCallback = (err: Error | null, user?: unknown) => void;
  type VerifyFunction = (req: Request, done: VerifyCallback) => void;

  export class Strategy {
    constructor(verify: VerifyFunction);
    name: string;
    authenticate(req: Request): void;
  }
}
