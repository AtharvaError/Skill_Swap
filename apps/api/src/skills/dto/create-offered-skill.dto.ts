import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export enum SkillProficiency {
  BEGINNER = 'BEGINNER',
  INTERMEDIATE = 'INTERMEDIATE',
  EXPERT = 'EXPERT',
}

export class CreateOfferedSkillDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  category?: string;

  @IsEnum(SkillProficiency)
  proficiency: SkillProficiency;
}
