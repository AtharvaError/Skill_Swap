import { Module } from '@nestjs/common';
import { RewardsModule } from '../rewards/rewards.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

@Module({
  imports: [RewardsModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
