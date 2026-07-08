import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

import { PrismaModule } from '../prisma/prisma.module.js';
import { RefreshTokenService } from './refresh-token.service.js';

@Module({
  imports: [
    PrismaModule,
    JwtModule
  ],
  providers: [RefreshTokenService],
  exports: [RefreshTokenService]
})
export class RefreshTokenModule { }
