import { IsString, IsNotEmpty, IsOptional, IsObject } from 'class-validator';

export class LaunchGameDto {
  @IsString()
  @IsNotEmpty()
  gameId!: string;

  @IsString()
  @IsOptional()
  mode?: string = 'REAL';

  @IsString()
  @IsOptional()
  currency?: string = 'INR';

  @IsString()
  @IsOptional()
  providerId?: string;

  @IsString()
  @IsOptional()
  idempotencyKey?: string;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}
