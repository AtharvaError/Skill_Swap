import { IsISO8601, IsInt, IsNotEmpty, IsString, Min, Max } from 'class-validator';

export class CreateSessionDto {
  @IsString()
  @IsNotEmpty()
  matchId!: string;

  @IsISO8601()
  scheduledAt!: string;

  @IsInt()
  @Min(15)
  @Max(240)
  durationMinutes!: number;
}
