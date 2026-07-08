import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { hash, Options } from 'argon2';

import { Prisma, User } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { ConfigService } from '@nestjs/config';
import moment from 'moment';

@Injectable()
export class UserService {
  private readonly _argon2Options: Options;
  private readonly _prismaService: PrismaService;

  constructor(configService: ConfigService, prismaService: PrismaService) {
    this._prismaService = prismaService;
    this._argon2Options = {
      salt: configService.get("ARGON2_SALT"),
      secret: configService.get("ARGON2_SECRET")
    };
  }

  // #region -- Business Logic Methods
  async createUser(email: string, password: string, displayName: string): Promise<{ publicId, email, displayName }> {
    try {
      const passwordHash: string = await hash(password, this._argon2Options);

      return this._prismaService.user.create({
        data: { email, passwordHash, displayName },
        select: {
          publicId: true,
          email: true,
          displayName: true
        }
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException("Email is already used");
      }

      throw error;
    }
  }

  async logFailedLoginAttempt(publicId: string): Promise<void> {
    this._prismaService.user.update({
      where: { publicId },
      data: { failedLoginAttempt: { increment: 1 } }
    });
  }

  async logSuccessLoginAttempt(publicId: string): Promise<void> {
    this._prismaService.user.update({
      where: { publicId },
      data: {
        lastLoggedIn: moment().toDate(),
        failedLoginAttempt: 0,
        lockedUntil: null
      }
    });
  }
  // #endregion

  // #region -- Data Retrieval Methods
  async findByEmail(email: string): Promise<User | null> {
    return this._prismaService.user.findUnique({ where: { email } })
  }
  // #endregion
}
