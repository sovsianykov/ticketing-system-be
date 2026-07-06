import { registerAs } from '@nestjs/config';

export const appConfig = registerAs('app', () => ({
  url: process.env.APP_URL ?? 'https://ticketing-system-be.onrender.com/api/v1',
  port: parseInt(process.env.PORT ?? '8080', 10),
  isProduction: process.env.NODE_ENV === 'production',
  corsOrigin:
    process.env.CORS_ORIGIN ?? 'https://ticketing-system-fe-phi.vercel.app',
  frontendUrl:
    process.env.FRONTEND_URL ?? 'https://ticketing-system-fe-phi.vercel.app',
}));

export const jwtConfig = registerAs('jwt', () => ({
  accessSecret: process.env.JWT_ACCESS_SECRET,
  refreshSecret: process.env.JWT_REFRESH_SECRET,
}));

export const smtpConfig = registerAs('smtp', () => ({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT ?? '587', 10),
  user: process.env.SMTP_USER,
  password: process.env.SMTP_PASSWORD,
  from: process.env.SMTP_FROM,
}));

export const databaseConfig = registerAs('database', () => ({
  url: process.env.DATABASE_URL,
}));
