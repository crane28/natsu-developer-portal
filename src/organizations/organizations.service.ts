import { Injectable } from '@nestjs/common';
import { Organization } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { OrganizationCreateInput, OrganizationUpdateInput } from '../generated/prisma/models';
import moment from 'moment';

@Injectable()
export class OrganizationsService {
  private readonly _prismaService: PrismaService;

  constructor(prismaService: PrismaService) {
    this._prismaService = prismaService;
  }

  async create(data: OrganizationCreateInput): Promise<Organization> {
    return this._prismaService.organization.create({ data });
  }

  async list(): Promise<Organization[]> {
    return this._prismaService.organization.findMany();
  }

  async getById(id: number): Promise<Organization | null> {
    return this._prismaService.organization.findUnique({ where: { id } });
  }

  async getByPublicId(publicId: string): Promise<Organization | null> {
    return this._prismaService.organization.findUnique({ where: { publicId } });
  }

  async updateById(id: number, data: OrganizationUpdateInput) {
    return this._prismaService.organization.update({ where: { id }, data });
  }

  async updateByPublicId(publicId: string, data: OrganizationUpdateInput) {
    return this._prismaService.organization.update({ where: { publicId }, data });
  }

  async deleteById(id: number) {
    return this._prismaService.organization.update({
      where: { id },
      data: { deletedAt: moment().toDate() }
    });
  }

  async deleteByPublicId(publicId: string) {
    return this._prismaService.organization.update({
      where: { publicId },
      data: { deletedAt: moment().toDate() }
    });
  }
}
