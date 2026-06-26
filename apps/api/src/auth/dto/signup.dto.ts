import { IsEmail, IsNotEmpty, MinLength, MaxLength } from 'class-validator';

export class SignupDto {
  @IsEmail()
  email!: string;

  @IsNotEmpty()
  @MinLength(6)
  @MaxLength(128)
  password!: string;

  @IsNotEmpty()
  @MaxLength(100)
  name!: string;
}
