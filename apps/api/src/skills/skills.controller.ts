import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthGuard } from '../auth/auth.guard';
import { UserId } from '../auth/current-user.decorator';
import { SkillsService } from './skills.service';
import { CreateOfferedSkillDto } from './dto/create-offered-skill.dto';
import { CreateWantedSkillDto } from './dto/create-wanted-skill.dto';

@Controller('skills')
export class SkillsController {
  constructor(private skillsService: SkillsService) {}

  @Get('catalog')
  getCatalog() {
    return this.skillsService.getCatalog();
  }

  @UseGuards(AuthGuard)
  @Get('offered')
  async getOffered(@UserId() userId: string) {
    const offered = await this.skillsService.listOffered(userId);
    return offered.map((item) => ({
      skillId: item.skillId,
      name: item.skill.name,
      category: item.skill.category,
      proficiency: item.proficiency,
    }));
  }

  @UseGuards(AuthGuard)
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @Post('offered')
  addOffered(@UserId() userId: string, @Body() dto: CreateOfferedSkillDto) {
    return this.skillsService.addOffered(userId, dto);
  }

  @UseGuards(AuthGuard)
  @Delete('offered/:skillId')
  @HttpCode(204)
  async removeOffered(
    @UserId() userId: string,
    @Param('skillId') skillId: string,
  ) {
    await this.skillsService.removeOffered(userId, skillId);
  }

  @UseGuards(AuthGuard)
  @Get('wanted')
  async getWanted(@UserId() userId: string) {
    const wanted = await this.skillsService.listWanted(userId);
    return wanted.map((item) => ({
      skillId: item.skillId,
      name: item.skill.name,
      category: item.skill.category,
    }));
  }

  @UseGuards(AuthGuard)
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @Post('wanted')
  addWanted(@UserId() userId: string, @Body() dto: CreateWantedSkillDto) {
    return this.skillsService.addWanted(userId, dto);
  }

  @UseGuards(AuthGuard)
  @Delete('wanted/:skillId')
  @HttpCode(204)
  async removeWanted(
    @UserId() userId: string,
    @Param('skillId') skillId: string,
  ) {
    await this.skillsService.removeWanted(userId, skillId);
  }
}
