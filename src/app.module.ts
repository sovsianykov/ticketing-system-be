import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { appConfig, jwtConfig, smtpConfig, databaseConfig } from './config/app.config';
import { PrismaService } from './prisma/prisma.service';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { EmailModule } from './email/email.module';
import { TicketsModule } from './tickets/tickets.module';
import { TeamsModule } from './teams/teams.module';
import { CommentsModule } from './comments/comments.module';
import { EpicsModule } from './epics/epics.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, jwtConfig, smtpConfig, databaseConfig],
    }),
    PrismaModule,
    UsersModule,
    AuthModule,
    EmailModule,
    TicketsModule,
    TeamsModule,
    CommentsModule,
    EpicsModule,
  ],
  providers: [PrismaService],
})
export class AppModule {}
