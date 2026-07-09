import { BadRequestException, ConflictException, ForbiddenException, Injectable, UnauthorizedException } from "@nestjs/common";
import { hash, verify } from "argon2";

import { UserService } from "../user/user.service.js";
import { Prisma, RefreshToken, User } from "../generated/prisma/client.js";
import { RegisterRequest } from "./dtos/register/register.request.js";
import { LoginRequest } from "./dtos/login/login.request.js";
import { RegisterResponse } from "./dtos/register/register.response.js";
import { LoginResponse } from "./dtos/login/login.response.js";
import moment from "moment";
import { JwtModule, JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { TokenService } from "../token/token.service.js";
import { request } from "http";
import { Request } from "express";
import { RefreshTokenResponse } from "../token/dtos/refresh-token.response.js";

@Injectable()
export class AuthService {
    private readonly _userService: UserService;
    private readonly _jwtService: JwtService;
    private readonly _configService: ConfigService;
    private readonly _tokenService: TokenService;

    constructor(userService: UserService, jwtService: JwtService, configService: ConfigService, tokenService: TokenService) {
        this._userService = userService;
        this._jwtService = jwtService;
        this._configService = configService;
        this._tokenService = tokenService;
    }

    // #region -- Business Logic Methods
    async register(data: RegisterRequest): Promise<RegisterResponse> {
        if (data.password !== data.confirmPassword) {
            throw new BadRequestException("Password do not match.");
        }

        return await this._userService.createUser(data.email, data.password, data.displayName);
    }

    async login(data: LoginRequest, request: Request): Promise<LoginResponse> {
        const user: User | null = await this._userService.findByEmail(data.email);
        if (user === null) {
            throw new UnauthorizedException("Email or Password is invalid.");
        }

        const isPasswordMatched: boolean = await verify(user!.passwordHash, data.password);
        if (!isPasswordMatched) {
            await this._userService.logFailedLoginAttempt(user!.publicId);
            throw new UnauthorizedException("Email or Password is invalid.");
        }

        if (!user.isEmailVerified) {
            throw new UnauthorizedException("Email is not verified. Please complete verification first.");
        }

        if (user.lockedUntil && moment().isSameOrBefore(user.lockedUntil)) {
            throw new ForbiddenException("Your account is currently locked, please contact Administrator.");
        }

        const accessToken: string = await this._tokenService.mintAccessToken(user)
        const { refreshToken, row }: RefreshTokenResponse = await this._tokenService.mintRefreshToken(user, request);

        await this._userService.logSuccessLoginAttempt(user.publicId);

        return { accessToken, refreshToken };
    }
    // #endregion

    // #region -- Helper Methods
    // #endregion
}