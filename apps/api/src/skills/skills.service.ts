import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOfferedSkillDto, SkillProficiency } from './dto/create-offered-skill.dto';
import { CreateWantedSkillDto } from './dto/create-wanted-skill.dto';

export const SKILL_CATALOG = [
  {
    category: 'Programming',
    items: ['Python', 'JavaScript', 'TypeScript', 'Go', 'SQL'],
  },
  {
    category: 'Design',
    items: ['UI Design', 'UX Research', 'Figma', 'Illustration'],
  },
  {
    category: 'Personal Growth',
    items: ['Public Speaking', 'Time Management', 'Leadership'],
  },
  {
    category: 'Music',
    items: ['Guitar', 'Piano', 'Singing', 'Music Theory'],
  },
  {
    category: 'Career',
    items: ['Resume Review', 'Interview Coaching', 'Networking'],
  },
];

@Injectable()
export class SkillsService {
  constructor(private prisma: PrismaService) {}

  getCatalog() {
    return SKILL_CATALOG.reduce<Record<string, string[]>>((groups, group) => {
      groups[group.category] = group.items;
      return groups;
    }, {});
  }

  async getOrCreateSkill(name: string, category?: string) {
    const normalizedName = name.trim();
    if (!normalizedName) {
      throw new Error('Skill name is required');
    }

    let skill = await this.prisma.skill.findUnique({
      where: { name: normalizedName },
    });

    if (!skill) {
      skill = await this.prisma.skill.create({
        data: {
          name: normalizedName,
          category: category?.trim() || 'Custom',
        },
      });
    }

    return skill;
  }

  async listOffered(userId: string) {
    return this.prisma.offeredSkill.findMany({
      where: { userId },
      include: { skill: true },
      orderBy: { skill: { name: 'asc' } },
    });
  }

  async listWanted(userId: string) {
    return this.prisma.wantedSkill.findMany({
      where: { userId },
      include: { skill: true },
      orderBy: { skill: { name: 'asc' } },
    });
  }

  async addOffered(userId: string, dto: CreateOfferedSkillDto) {
    const skill = await this.getOrCreateSkill(dto.name, dto.category);
    return this.prisma.offeredSkill.upsert({
      where: {
        userId_skillId: {
          userId,
          skillId: skill.id,
        },
      },
      update: {
        proficiency: dto.proficiency,
      },
      create: {
        userId,
        skillId: skill.id,
        proficiency: dto.proficiency,
      },
    });
  }

  async removeOffered(userId: string, skillId: string) {
    await this.prisma.offeredSkill.deleteMany({
      where: { userId, skillId },
    });
  }

  async addWanted(userId: string, dto: CreateWantedSkillDto) {
    const skill = await this.getOrCreateSkill(dto.name, dto.category);
    return this.prisma.wantedSkill.upsert({
      where: {
        userId_skillId: {
          userId,
          skillId: skill.id,
        },
      },
      update: {},
      create: {
        userId,
        skillId: skill.id,
      },
    });
  }

  async removeWanted(userId: string, skillId: string) {
    await this.prisma.wantedSkill.deleteMany({
      where: { userId, skillId },
    });
  }
}
