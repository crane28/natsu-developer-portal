import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { OrganizationsService } from './organizations.service';
import { Organization } from '../generated/prisma/client';
import { OrganizationCreateInput, OrganizationUpdateInput } from '../generated/prisma/models';

@Controller('organizations')
export class OrganizationsController {
  private readonly _organizationsService: OrganizationsService

  constructor(organizationsService: OrganizationsService) {
    this._organizationsService = organizationsService;
  }

  @Post()
  create(@Body() organization: OrganizationCreateInput) {
    return this._organizationsService.create(organization);
  }

  @Get()
  findAll() {
    return this._organizationsService.list();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this._organizationsService.getByPublicId(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() organization: OrganizationUpdateInput) {
    return this._organizationsService.updateByPublicId(id, organization);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this._organizationsService.deleteByPublicId(id);
  }
}
