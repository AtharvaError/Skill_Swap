import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { CalendarController } from './calendar.controller';
import { CalendarService } from './calendar.service';

@Module({
  imports: [PrismaModule],
  providers: [CalendarService],
  controllers: [CalendarController],
})
export class CalendarModule {}
