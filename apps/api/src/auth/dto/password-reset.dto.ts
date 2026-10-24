import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsHexadecimal,
  IsString,
  Length,
  MaxLength,
  MinLength,
} from 'class-validator';

export class ForgotPasswordDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  @MaxLength(254)
  email!: string;
}

export class ResetPasswordDto {
  @IsHexadecimal()
  @Length(64, 64)
  token!: string;

  // Same rules as SignupDto.
  @IsString()
  @MinLength(6)
  @MaxLength(128)
  password!: string;
}
