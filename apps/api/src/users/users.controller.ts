import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthGuard } from '../auth/auth.guard';
import { UserId } from '../auth/current-user.decorator';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UsersService } from './users.service';

@Controller('users')
@UseGuards(AuthGuard)
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('me')
  getMe(@UserId() userId: string) {
    return this.usersService.getMe(userId);
  }

  @Get('me/overview')
  getOverview(@UserId() userId: string) {
    return this.usersService.getOverview(userId);
  }

  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Patch('me')
  updateProfile(@UserId() userId: string, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateProfile(userId, dto);
  }

  @Get(':id')
  getPublicProfile(
    @UserId() viewerId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.usersService.getPublicProfile(viewerId, id);
  }
}
