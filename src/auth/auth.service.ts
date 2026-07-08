import { BadRequestException, ConflictException, ForbiddenException, Injectable, UnauthorizedException } from "@nestjs/common";
import { hash, verify } from "argon2";

import { UserService } from "../user/user.service.js";
import { Prisma, User } from "../generated/prisma/client.js";
import { RegisterRequest } from "./dtos/register/register.request.js";
import { LoginRequest } from "./dtos/login/login.request.js";
import { RegisterResponse } from "./dtos/register/register.response.js";
import { LoginResponse } from "./dtos/login/login.response.js";
import moment from "moment";
import { JwtModule, JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { RefreshTokenService } from "../refresh-token/refresh-token.service.js";

@Injectable()
export class AuthService {
    private readonly _userService: UserService;
    private readonly _jwtService: JwtService;
    private readonly _configService: ConfigService;
    private readonly _refreshTokenService: RefreshTokenService;

    constructor(userService: UserService, jwtService: JwtService, configService: ConfigService, refreshTokenService: RefreshTokenService) {
        this._userService = userService;
        this._jwtService = jwtService;
        this._configService = configService;
        this._refreshTokenService = refreshTokenService;
    }

    // #region -- Business Logic Methods
    async register(data: RegisterRequest): Promise<RegisterResponse> {
        if (data.password !== data.confirmPassword) {
            throw new BadRequestException("Password do not match.");
        }

        return await this._userService.createUser(data.email, data.password, data.displayName);
    }

    async login(
        data: LoginRequest,
        userAgent: string,
        ipAddress: string
    ): Promise<LoginResponse> {
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

        await this._userService.logSuccessLoginAttempt(user.publicId);

        const accessToken: string = await this.mintAccessToken(user);
        const { token, row } = await this._refreshTokenService.mintRefreshToken(user, userAgent, ipAddress);

        return { accessToken, refreshToken };
    }
    // #endregion

    // #region -- Helper Methods
    async mintAccessToken(user: User): Promise<string> {
        const expDurationInSec: number = this._configService.get<number>('JWT_ACCESS_TOKEN_EXPIRATION') ?? 900;
        const accessTokenSecret: string = this._configService.get<string>('JWT_ACCESS_TOKEN_SECRET')!;

        return this._jwtService.signAsync({
            sub: user.publicId,
            email: user.email,
            displayName: user.displayName
        }, {
            expiresIn: expDurationInSec,
            secret: accessTokenSecret
        });
    }
    // #endregion
}