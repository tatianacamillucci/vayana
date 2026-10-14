import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { PortfoliosService } from './portfolios.service';
import { CreatePortfolioDto } from './dto/create-portfolio.dto';
import { UpdatePortfolioDto } from './dto/update-portfolio.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('portfolios')
@ApiBearerAuth()
@Controller()
export class PortfoliosController {
  constructor(private readonly portfoliosService: PortfoliosService) {}

  @Post('portfolios')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new portfolio' })
  @ApiResponse({ status: 201, description: 'Portfolio created' })
  create(
    @Body() dto: CreatePortfolioDto,
    @CurrentUser('userId') userId: string,
  ) {
    return this.portfoliosService.create(dto, userId);
  }

  @Get('portfolios')
  @ApiOperation({ summary: 'List all portfolios in the tenant' })
  @ApiResponse({ status: 200, description: 'List of portfolios with project counts' })
  findAll() {
    return this.portfoliosService.findAll();
  }

  @Get('portfolios/:portfolioId')
  @ApiOperation({ summary: 'Get a portfolio with its projects' })
  @ApiResponse({ status: 200, description: 'Portfolio detail' })
  findOne(@Param('portfolioId') portfolioId: string) {
    return this.portfoliosService.findOne(portfolioId);
  }

  @Patch('portfolios/:portfolioId')
  @ApiOperation({ summary: 'Update a portfolio' })
  @ApiResponse({ status: 200, description: 'Portfolio updated' })
  update(
    @Param('portfolioId') portfolioId: string,
    @Body() dto: UpdatePortfolioDto,
  ) {
    return this.portfoliosService.update(portfolioId, dto);
  }

  @Delete('portfolios/:portfolioId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a portfolio' })
  @ApiResponse({ status: 204, description: 'Portfolio deleted' })
  delete(@Param('portfolioId') portfolioId: string) {
    return this.portfoliosService.delete(portfolioId);
  }

  @Post('portfolios/:portfolioId/projects/:projectId')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add a project to a portfolio' })
  @ApiResponse({ status: 201, description: 'Project added to portfolio' })
  addProject(
    @Param('portfolioId') portfolioId: string,
    @Param('projectId') projectId: string,
  ) {
    return this.portfoliosService.addProject(portfolioId, projectId);
  }

  @Delete('portfolios/:portfolioId/projects/:projectId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a project from a portfolio' })
  @ApiResponse({ status: 204, description: 'Project removed from portfolio' })
  removeProject(
    @Param('portfolioId') portfolioId: string,
    @Param('projectId') projectId: string,
  ) {
    return this.portfoliosService.removeProject(portfolioId, projectId);
  }

  @Get('portfolios/:portfolioId/members')
  @ApiOperation({ summary: 'List portfolio members' })
  @ApiResponse({ status: 200, description: 'Portfolio members listed' })
  listMembers(@Param('portfolioId', ParseUUIDPipe) portfolioId: string) {
    return this.portfoliosService.listMembers(portfolioId);
  }

  @Post('portfolios/:portfolioId/members/:userId')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add a member to a portfolio' })
  @ApiResponse({ status: 201, description: 'Portfolio member added' })
  addMember(
    @Param('portfolioId', ParseUUIDPipe) portfolioId: string,
    @Param('userId', ParseUUIDPipe) userId: string,
  ) {
    return this.portfoliosService.addMember(portfolioId, userId);
  }

  @Delete('portfolios/:portfolioId/members/:userId')
  @ApiOperation({ summary: 'Remove a member from a portfolio' })
  @ApiResponse({ status: 200, description: 'Portfolio member removed' })
  removeMember(
    @Param('portfolioId', ParseUUIDPipe) portfolioId: string,
    @Param('userId', ParseUUIDPipe) userId: string,
  ) {
    return this.portfoliosService.removeMember(portfolioId, userId);
  }
}
