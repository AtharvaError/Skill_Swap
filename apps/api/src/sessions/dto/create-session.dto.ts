import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsISO8601,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export enum SessionKind {
  /** Both people teach each other; no credits change hands. */
  SWAP = 'SWAP',
  /** The person booking learns from their partner and pays in credits. */
  LESSON = 'LESSON',
}

const trimOrUndefined = ({ value }: { value: unknown }) => {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
};

export class CreateSessionDto {
  @IsUUID()
  matchId!: string;

  @IsISO8601()
  scheduledAt!: string;

  @IsInt()
  @Min(15)
  @Max(240)
  durationMinutes!: number;

  @IsEnum(SessionKind)
  @IsOptional()
  kind?: SessionKind;

  @Transform(trimOrUndefined)
  @IsString()
  @MaxLength(120)
  @IsOptional()
  topic?: string;

  @Transform(trimOrUndefined)
  @IsString()
  @MaxLength(500)
  @IsOptional()
  notes?: string;
}
