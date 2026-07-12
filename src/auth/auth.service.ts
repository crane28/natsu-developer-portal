import { BadRequestException, ConflictException, ForbiddenException, Injectable, UnauthorizedException } from "@nestjs/common";
import { verify } from "argon2";

import { UsersService } from "../users/users.service";
import { User } from "../generated/prisma/client";
import { RegisterRequest } from "./dtos/register/register.request";
import { LoginRequest } from "./dtos/login/login.request";
import { RegisterResponse } from "./dtos/register/register.response";
import { LoginResponse } from "./dtos/login/login.response";
import moment from "moment";
import { TokenService } from "../token/token.service";
import { Request } from "express";
import { RefreshTokenResponse } from "../token/dtos/refresh-token.response";

@Injectable()
export class AuthService {
    private readonly _userService: UsersService;
    private readonly _tokenService: TokenService;

    constructor(userService: UsersService, tokenService: TokenService) {
        this._userService = userService;
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
}