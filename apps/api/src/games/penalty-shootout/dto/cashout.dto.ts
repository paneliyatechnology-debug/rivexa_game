import { IsString } from 'class-validator';

export class PenaltyCashoutDto {
  @IsString()
  userId: string;

  @IsString()
  gameRoundId: string;
}
