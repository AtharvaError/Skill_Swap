import { IsBoolean, IsNotEmpty, IsString } from 'class-validator';

export class TypingDto {
  @IsString()
  @IsNotEmpty()
  matchId!: string;

  @IsBoolean()
  isTyping!: boolean;
}
