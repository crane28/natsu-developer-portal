import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { Project } from '../generated/prisma/client';
import { ProjectCreateInput, ProjectUpdateInput } from '../generated/prisma/models';

@Controller('projects')
export class ProjectsController {
  private readonly _projectsService: ProjectsService;

  constructor(projectsService: ProjectsService) {
    this._projectsService = projectsService;
  }

  @Post()
  create(@Body() project: ProjectCreateInput): Promise<Project> {
    return this._projectsService.create(project);
  }

  @Get()
  findAll(): Promise<Project[]> {
    return this._projectsService.list();
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<Project | null> {
    return this._projectsService.getByPublicId(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() project: ProjectUpdateInput) {
    return this._projectsService.updateByPublicId(id, project);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this._projectsService.deleteByPublicId(id);
  }
}
