import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { AVAILABILITY_SLOTS } from '../availability';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

/** Optional text fields: an empty string clears the value. */
const trimOrNull = ({ value }: { value: unknown }) => {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
};

export class UpdateProfileDto {
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @IsOptional()
  name?: string;

  @Transform(trimOrNull)
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString()
  @MaxLength(500)
  bio?: string | null;

  @Transform(trimOrNull)
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString()
  @MaxLength(200)
  college?: string | null;

  @Transform(trimOrNull)
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsUrl({ require_tld: false, protocols: ['http', 'https'] })
  @MaxLength(2048)
  avatarUrl?: string | null;

  @IsArray()
  @ArrayMaxSize(AVAILABILITY_SLOTS.length)
  @ArrayUnique()
  @IsIn(AVAILABILITY_SLOTS, { each: true })
  @IsOptional()
  availability?: string[];
}
