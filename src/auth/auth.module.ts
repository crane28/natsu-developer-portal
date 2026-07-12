import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { JwtModule } from '@nestjs/jwt';
import { JwtAuthGuard } from './jwt-auth.guard';
import { JwtAuthStrategy } from './jwt-auth.strategy';
import { ConfigModule } from '@nestjs/config';
import { TokenModule } from '../token/token.module';

@Module({
    imports: [
        UsersModule,
        JwtModule,
        ConfigModule,
        TokenModule
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
