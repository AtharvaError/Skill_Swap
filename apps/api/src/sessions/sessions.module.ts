import { Module } from '@nestjs/common';
import { DailyModule } from '../daily/daily.module';
import { CalendarModule } from '../calendar/calendar.module';
import { SessionsController } from './sessions.controller';
import { SessionsService } from './sessions.service';

@Module({
  imports: [DailyModule, CalendarModule],
  controllers: [SessionsController],
  providers: [SessionsService],
})
export class SessionsModule {}
