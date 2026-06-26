import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { DailyModule } from '../daily/daily.module';
import { SessionsController } from './sessions.controller';
import { SessionsService } from './sessions.service';

@Module({
  imports: [PrismaModule, DailyModule],
  controllers: [SessionsController],
  providers: [SessionsService],
})
export class SessionsModule {}
