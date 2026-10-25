import {
  Body,
  Controller,
  Get,
  HttpCode,
  Patch,
  Param,
  ParseEnumPipe,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { RedemptionStatus, ReportStatus } from '@prisma/client';
import { AuthGuard } from '../auth/auth.guard';
import { UserId } from '../auth/current-user.decorator';
import { AdminGuard } from './admin.guard';
import {
  CreateRewardDto,
  FulfilRedemptionDto,
  ResolveReportDto,
  UpdateRewardDto,
} from './admin.dto';
import { AdminService } from './admin.service';

@Controller('admin')
@UseGuards(AuthGuard, AdminGuard)
export class AdminController {
  constructor(private adminService: AdminService) {}

  @Get('summary')
  summary() {
    return this.adminService.summary();
  }

  @Get('reports')
  listReports(
    @Query('status', new ParseEnumPipe(ReportStatus, { optional: true }))
    status?: ReportStatus,
  ) {
    return this.adminService.listReports(status ?? 'OPEN');
  }

  @HttpCode(200)
  @Post('reports/:id/resolve')
  resolveReport(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ResolveReportDto,
  ) {
    return this.adminService.resolveReport(id, dto.status);
  }

  @Get('users')
  listUsers(@Query('q') search?: string) {
    return this.adminService.listUsers(
      typeof search === 'string' ? search.slice(0, 100) : undefined,
    );
  }

  @HttpCode(200)
  @Post('users/:id/suspend')
  suspend(@UserId() actorId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.adminService.setSuspended(actorId, id, true);
  }

  @HttpCode(200)
  @Post('users/:id/unsuspend')
  unsuspend(@UserId() actorId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.adminService.setSuspended(actorId, id, false);
  }

  @Get('redemptions')
  listRedemptions(
    @Query('status', new ParseEnumPipe(RedemptionStatus, { optional: true }))
    status?: RedemptionStatus,
  ) {
    return this.adminService.listRedemptions(status ?? 'PENDING');
  }

  @HttpCode(200)
  @Post('redemptions/:id/fulfil')
  fulfil(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: FulfilRedemptionDto,
  ) {
    return this.adminService.fulfilRedemption(id, dto.note);
  }

  @HttpCode(200)
  @Post('redemptions/:id/reject')
  reject(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminService.rejectRedemption(id);
  }

  @Get('rewards')
  listRewards() {
    return this.adminService.listRewards();
  }

  @Post('rewards')
  createReward(@Body() dto: CreateRewardDto) {
    return this.adminService.createReward(dto);
  }

  // Reward ids are uuids, or slugs for the rewards carried over from code.
  @Patch('rewards/:id')
  updateReward(@Param('id') id: string, @Body() dto: UpdateRewardDto) {
    return this.adminService.updateReward(id, dto);
  }
}
