import { IsString, IsNumber, IsOptional, Min, Max, IsIn } from 'class-validator';

export class StartPenaltyRoundDto {
  @IsString()
  userId: string;

  @IsNumber()
  @Min(1)
  @Max(100000)
  betAmount: number;

  @IsOptional()
  @IsString()
  @IsIn(['EASY', 'MEDIUM', 'HARD', 'HARDCORE'])
  difficulty?: string = 'MEDIUM';

  @IsOptional()
  @IsString()
  homeTeam?: string = 'South Africa';

  @IsOptional()
  @IsString()
  awayTeam?: string = 'Japan';

  @IsOptional()
  @IsString()
  clientSeed?: string;
}
