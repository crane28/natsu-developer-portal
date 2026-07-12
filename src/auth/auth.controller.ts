import { Body, Controller, HttpCode, HttpStatus, Post, Req } from '@nestjs/common';
import { RegisterRequest } from './dtos/register/register.request';
import { AuthService } from './auth.service';
import { LoginRequest } from './dtos/login/login.request';
import { LoginResponse } from './dtos/login/login.response';
import { RegisterResponse } from './dtos/register/register.response';
import { SkipThrottle } from '@nestjs/throttler';
import { Public } from './decorators/public.decorator';
import { type Request } from 'express';

@Controller('auth')
@Public()
export class AuthController {
    constructor(private readonly auth: AuthService) { }

    @Post('register')
    @SkipThrottle()
    @HttpCode(HttpStatus.CREATED)
    async register(@Body() body: RegisterRequest): Promise<RegisterResponse> {
        return this.auth.register(body);
    }

    @Post('login')
    @HttpCode(HttpStatus.OK)
    async login(@Req() req: Request, @Body() body: LoginRequest): Promise<LoginResponse> {
        return this.auth.login(body, req);
    }
}
