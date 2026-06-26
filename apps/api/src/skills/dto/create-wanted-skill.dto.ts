import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateWantedSkillDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  category?: string;
}
