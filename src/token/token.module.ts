import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

import { PrismaModule } from '../prisma/prisma.module.js';
import { TokenService } from './token.service.js';

@Module({
  imports: [
    PrismaModule,
    JwtModule
  ],
  providers: [TokenService],
  exports: [TokenService]
})
export class TokenModule { }
