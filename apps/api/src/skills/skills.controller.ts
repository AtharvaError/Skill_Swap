import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
  HttpCode,
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { Throttle } from '@nestjs/throttler';
import { SkillsService } from './skills.service';
import { CreateOfferedSkillDto } from './dto/create-offered-skill.dto';
import { CreateWantedSkillDto } from './dto/create-wanted-skill.dto';
import type { Request } from 'express';

@Controller('skills')
export class SkillsController {
  constructor(private skillsService: SkillsService) {}

  @Get('catalog')
  getCatalog() {
    return this.skillsService.getCatalog();
  }

  @UseGuards(AuthGuard)
  @Get('offered')
  async getOffered(@Req() req: Request & { user?: any }) {
    const userId = req.user.sub;
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
  addOffered(@Req() req: Request & { user?: any }, @Body() dto: CreateOfferedSkillDto) {
    return this.skillsService.addOffered(req.user.sub, dto);
  }

  @UseGuards(AuthGuard)
  @Delete('offered/:skillId')
  @HttpCode(204)
  async removeOffered(@Req() req: Request & { user?: any }, @Param('skillId') skillId: string) {
    await this.skillsService.removeOffered(req.user.sub, skillId);
  }

  @UseGuards(AuthGuard)
  @Get('wanted')
  async getWanted(@Req() req: Request & { user?: any }) {
    const userId = req.user.sub;
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
  addWanted(@Req() req: Request & { user?: any }, @Body() dto: CreateWantedSkillDto) {
    return this.skillsService.addWanted(req.user.sub, dto);
  }

  @UseGuards(AuthGuard)
  @Delete('wanted/:skillId')
  @HttpCode(204)
  async removeWanted(@Req() req: Request & { user?: any }, @Param('skillId') skillId: string) {
    await this.skillsService.removeWanted(req.user.sub, skillId);
  }
}
