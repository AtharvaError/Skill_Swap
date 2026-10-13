import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOfferedSkillDto } from './dto/create-offered-skill.dto';
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

  /**
   * Skills are matched by name, so "python" and "Python" must resolve to the
   * same row. Catalog skills keep their canonical spelling and category.
   */
  async getOrCreateSkill(name: string, category?: string) {
    const normalizedName = name.trim().replace(/\s+/g, ' ');
    if (!normalizedName) {
      throw new BadRequestException('Skill name is required');
    }

    const existing = await this.prisma.skill.findFirst({
      where: { name: { equals: normalizedName, mode: 'insensitive' } },
    });
    if (existing) return existing;

    const catalogGroup = SKILL_CATALOG.find((group) =>
      group.items.some(
        (item) => item.toLowerCase() === normalizedName.toLowerCase(),
      ),
    );
    const catalogName = catalogGroup?.items.find(
      (item) => item.toLowerCase() === normalizedName.toLowerCase(),
    );

    try {
      return await this.prisma.skill.create({
        data: {
          name: catalogName ?? normalizedName,
          category: catalogGroup?.category ?? (category?.trim() || 'Custom'),
        },
      });
    } catch (error) {
      // Two users adding the same new skill at once: the loser reads the row.
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        return this.prisma.skill.findFirstOrThrow({
          where: { name: { equals: normalizedName, mode: 'insensitive' } },
        });
      }
      throw error;
    }
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
