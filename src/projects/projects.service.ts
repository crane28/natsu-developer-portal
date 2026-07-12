import { Injectable } from '@nestjs/common';
import { Project } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ProjectCreateInput, ProjectUpdateInput } from '../generated/prisma/models';
import moment from 'moment';

@Injectable()
export class ProjectsService {
  private readonly _prismaService: PrismaService;

  constructor(prismaService: PrismaService) {
    this._prismaService = prismaService;
  }

  async create(data: ProjectCreateInput): Promise<Project> {
    return this._prismaService.project.create({ data });
  }

  async list(): Promise<Project[]> {
    return this._prismaService.project.findMany();
  }

  async getById(id: number): Promise<Project | null> {
    return this._prismaService.project.findUnique({ where: { id } });
  }

  async getByPublicId(publicId: string): Promise<Project | null> {
    return this._prismaService.project.findUnique({ where: { publicId } });
  }

  async updateById(id: number, data: ProjectUpdateInput) {
    return this._prismaService.project.update({ where: { id }, data });
  }

  async updateByPublicId(publicId: string, data: ProjectUpdateInput) {
    return this._prismaService.project.update({ where: { publicId }, data });
  }

  async deleteById(id: number) {
    return this._prismaService.project.update({
      where: { id },
      data: { deletedAt: moment().toDate() }
    });
  }

  async deleteByPublicId(publicId: string) {
    return this._prismaService.project.update({
      where: { publicId },
      data: { deletedAt: moment().toDate() }
    });
  }
}
