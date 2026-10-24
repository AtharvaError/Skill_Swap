import { Module } from '@nestjs/common';
import { SessionsModule } from '../sessions/sessions.module';
import { SafetyController } from './safety.controller';
import { SafetyService } from './safety.service';

@Module({
  imports: [SessionsModule],
  controllers: [SafetyController],
  providers: [SafetyService],
})
export class SafetyModule {}
