import { IsInt, IsOptional, IsString, Min, Max, MaxLength } from 'class-validator';

export class CreateReviewDto {
  @IsInt()
  @Min(1)
  @Max(5)
  rating!: number;

  @IsString()
  @MaxLength(1000)
  @IsOptional()
  comment?: string;
}
