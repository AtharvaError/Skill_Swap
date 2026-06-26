import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class SendMessageDto {
  @IsString()
  @IsNotEmpty()
  matchId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  content!: string;
}
