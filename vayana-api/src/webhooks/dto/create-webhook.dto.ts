import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { WebhookEventType } from '@prisma/client';
import { IsArray, IsEnum, IsOptional, IsString, IsUrl, MaxLength, MinLength } from 'class-validator';

export class CreateWebhookDto {
  @ApiProperty({ example: 'Slack Sync' })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name: string;

  @ApiProperty({ example: 'https://example.com/webhooks/vayana' })
  @IsUrl()
  targetUrl: string;

  @ApiPropertyOptional({ example: 'super-secret' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  secret?: string;

  @ApiProperty({ enum: WebhookEventType, isArray: true })
  @IsArray()
  @IsEnum(WebhookEventType, { each: true })
  eventTypes: WebhookEventType[];
}

