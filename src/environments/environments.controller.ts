import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { EnvironmentsService } from './environments.service';
import { Environment } from '../generated/prisma/client';
import { EnvironmentCreateInput, EnvironmentUpdateInput } from '../generated/prisma/models';

@Controller('environments')
export class EnvironmentsController {
  private readonly _environmentsService: EnvironmentsService;

  constructor(environmentsService: EnvironmentsService) {
    this._environmentsService = environmentsService;
  }

  @Post()
  create(@Body() environment: EnvironmentCreateInput): Promise<Environment> {
    return this._environmentsService.create(environment);
  }

  @Get()
  findAll(): Promise<Environment[]> {
    return this._environmentsService.list();
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<Environment | null> {
    return this._environmentsService.getByPublicId(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() environment: EnvironmentUpdateInput) {
    return this._environmentsService.updateByPublicId(id, environment);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this._environmentsService.deleteByPublicId(id);
  }
}
