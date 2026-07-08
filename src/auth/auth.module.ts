import { Module } from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { UserModule } from '../user/user.module.js';
import { AuthController } from './auth.controller.js';
import { JwtModule } from '@nestjs/jwt';
import { JwtAuthGuard } from './jwt-auth.guard.js';
import { JwtAuthStrategy } from './jwt-auth.strategy.js';
import { ConfigModule } from '@nestjs/config';

@Module({
    imports: [
        UserModule,
        JwtModule,
        ConfigModule
    ],
    controllers: [AuthController],
    providers: [
        AuthService,
        JwtAuthStrategy,
        JwtAuthGuard
    ],
    exports: [JwtAuthGuard]
})
export class AuthModule { }
