import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';

export class ResolveReportDto {
  @IsIn(['RESOLVED', 'DISMISSED'])
  status!: 'RESOLVED' | 'DISMISSED';
}

export class FulfilRedemptionDto {
  // Shown to the member, e.g. the gift code or how to collect the reward.
  @Transform(({ value }: { value: unknown }) => {
    if (typeof value !== 'string') return value;
    const trimmed = value.trim();
    return trimmed === '' ? undefined : trimmed;
  })
  @IsString()
  @MaxLength(500)
  @IsOptional()
  note?: string;
}

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class CreateRewardDto {
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  title!: string;

  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  description!: string;

  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  category!: string;

  @IsInt()
  @Min(1)
  @Max(100000)
  cost!: number;

  /** Omit or send null for unlimited. */
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsInt()
  @Min(0)
  @Max(1000000)
  stock?: number | null;
}

export class UpdateRewardDto {
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  @IsOptional()
  title?: string;

  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  @IsOptional()
  description?: string;

  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  @IsOptional()
  category?: string;

  @IsInt()
  @Min(1)
  @Max(100000)
  @IsOptional()
  cost?: number;

  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsInt()
  @Min(0)
  @Max(1000000)
  stock?: number | null;

  @IsBoolean()
  @IsOptional()
  active?: boolean;
}
