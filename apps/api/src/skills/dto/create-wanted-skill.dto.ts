import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateWantedSkillDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  name!: string;

  @IsString()
  @MaxLength(60)
  @IsOptional()
  category?: string;
}
