import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export enum SkillProficiency {
  BEGINNER = 'BEGINNER',
  INTERMEDIATE = 'INTERMEDIATE',
  EXPERT = 'EXPERT',
}

export class CreateOfferedSkillDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  name!: string;

  @IsString()
  @MaxLength(60)
  @IsOptional()
  category?: string;

  @IsEnum(SkillProficiency)
  proficiency!: SkillProficiency;
}
