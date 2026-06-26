import { IsOptional, IsString, MaxLength, IsUrl } from 'class-validator';

export class UpdateProfileDto {
  @IsString()
  @MaxLength(100)
  @IsOptional()
  name?: string;

  @IsString()
  @MaxLength(500)
  @IsOptional()
  bio?: string;

  @IsString()
  @MaxLength(200)
  @IsOptional()
  college?: string;

  @IsUrl({ require_tld: false })
  @IsOptional()
  avatarUrl?: string;
}
