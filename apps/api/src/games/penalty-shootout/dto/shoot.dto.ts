import { IsString, IsNumber, Min, Max, IsOptional } from 'class-validator';

export class PenaltyShootDto {
  @IsString()
  userId: string;

  @IsString()
  gameRoundId: string;

  @IsNumber()
  @Min(1)
  @Max(8) // 8 spots for HARD/HARDCORE difficulty
  targetSpot: number;

  @IsOptional()
  @IsString()
  presentationTarget?: string; // optional visual hint from client (non-authoritative)
}
