import { IsString, IsNumber, IsOptional, IsEnum, Min, Max } from 'class-validator';

export class CreateRoundDto {
  @IsNumber()
  @Min(0.01)
  betAmount: number;

  @IsString()
  @IsOptional()
  currency?: string = 'INR';

  @IsString()
  difficulty: 'easy' | 'medium' | 'hard' | 'hardcore' | string;

  @IsString()
  @IsOptional()
  clientSeed?: string;
}

export class MoveDto {
  @IsString()
  @IsOptional()
  requestId?: string;
}

export class CashoutDto {
  @IsString()
  @IsOptional()
  requestId?: string;
}

export class VerifyFairnessDto {
  @IsString()
  serverSeed: string;

  @IsString()
  clientSeed: string;

  @IsNumber()
  nonce: number;

  @IsNumber()
  checkpoint: number;

  @IsString()
  difficulty: string;
}
