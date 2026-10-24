import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthGuard } from '../auth/auth.guard';
import { UserId } from '../auth/current-user.decorator';
import { ReportUserDto } from './safety.dto';
import { SafetyService } from './safety.service';

@Controller()
@UseGuards(AuthGuard)
export class SafetyController {
  constructor(private safetyService: SafetyService) {}

  @Get('blocks')
  listBlocked(@UserId() userId: string) {
    return this.safetyService.listBlocked(userId);
  }

  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @HttpCode(200)
  @Post('users/:id/block')
  block(@UserId() userId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.safetyService.block(userId, id);
  }

  @Delete('users/:id/block')
  unblock(@UserId() userId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.safetyService.unblock(userId, id);
  }

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('users/:id/report')
  report(
    @UserId() userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReportUserDto,
  ) {
    return this.safetyService.report(userId, id, dto);
  }
}
