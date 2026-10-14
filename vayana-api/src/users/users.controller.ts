import {
  Controller,
  Get,
  Patch,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { SkipTenantCheck } from '../common/decorators/skip-tenant-check.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateOnboardingDto } from './dto/update-onboarding.dto';

@ApiTags('users')
@SkipTenantCheck()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get current authenticated user profile' })
  @ApiResponse({ status: 200, description: 'Current user profile' })
  async getMe(@CurrentUser('userId') userId: string) {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    // Strip passwordHash before returning
    const { passwordHash: _, ...profile } = user;
    return profile;
  }

  @Get('search')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Search users by name or email' })
  @ApiQuery({ name: 'q', required: false, description: 'Query (name or email)' })
  @ApiQuery({ name: 'email', required: false, description: 'Email (legacy)' })
  @ApiResponse({ status: 200, description: 'Matching users' })
  async search(@Query('q') q?: string, @Query('email') email?: string) {
    if (q) return this.usersService.searchByQuery(q);
    if (email) return this.usersService.searchByEmail(email);
    return [];
  }

  @Patch('me')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update current user profile (MVP)' })
  @ApiResponse({ status: 200, description: 'Profile updated' })
  async updateMe(
    @CurrentUser('userId') userId: string,
    @Body() dto: UpdateProfileDto,
  ) {
    const user = await this.usersService.updateProfile(userId, dto);
    const { passwordHash: _, ...profile } = user;
    return profile;
  }

  @Patch('me/onboarding')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Complete onboarding: update name and organization name' })
  @ApiResponse({ status: 200, description: 'Onboarding data saved' })
  async completeOnboarding(
    @CurrentUser('userId') userId: string,
    @Body() dto: UpdateOnboardingDto,
  ) {
    const user = await this.usersService.completeOnboarding(userId, dto);
    if (!user) throw new NotFoundException('User not found');
    const { passwordHash: _, ...profile } = user;
    return profile;
  }
}
