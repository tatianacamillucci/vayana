import { IsOptional, IsString } from 'class-validator';

export class UpdateOnboardingDto {
  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsString()
  orgName?: string;

  @IsOptional()
  @IsString()
  orgStructure?: string;
}
