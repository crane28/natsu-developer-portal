import { Injectable } from '@nestjs/common';
import { Environment } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EnvironmentCreateInput, EnvironmentUpdateInput } from '../generated/prisma/models';
import moment from 'moment';

@Injectable()
export class EnvironmentsService {
  private readonly _prismaService: PrismaService;

  constructor(prismaService: PrismaService) {
    this._prismaService = prismaService;
  }

  async create(data: EnvironmentCreateInput): Promise<Environment> {
    return this._prismaService.environment.create({ data });
  }

  async list(): Promise<Environment[]> {
    return this._prismaService.environment.findMany();
  }

  async getById(id: number): Promise<Environment | null> {
    return this._prismaService.environment.findUnique({ where: { id } });
  }

  async getByPublicId(publicId: string): Promise<Environment | null> {
    return this._prismaService.environment.findUnique({ where: { publicId } });
  }

  async updateById(id: number, data: EnvironmentUpdateInput) {
    return this._prismaService.environment.update({ where: { id }, data });
  }

  async updateByPublicId(publicId: string, data: EnvironmentUpdateInput) {
    return this._prismaService.environment.update({ where: { publicId }, data });
  }

  async deleteById(id: number) {
    return this._prismaService.environment.update({
      where: { id },
      data: { deletedAt: moment().toDate() }
    });
  }

  async deleteByPublicId(publicId: string) {
    return this._prismaService.environment.update({
      where: { publicId },
      data: { deletedAt: moment().toDate() }
    });
  }
}
