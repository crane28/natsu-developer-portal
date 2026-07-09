import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';

import { hash } from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import moment from 'moment';

import { PrismaService } from '../prisma/prisma.service.js';
import { RefreshToken, User } from '../generated/prisma/client.js';
import { AccessTokenPayload } from './dtos/access-token.payload.js';
import { RefreshTokenPayload } from './dtos/refresh-token.payload.js';
import { RefreshTokenResponse } from './dtos/refresh-token.response.js';
import { Request } from 'express';
import { RefreshTokenCreateInput } from '../generated/prisma/models.js';

@Injectable()
export class TokenService {
    private readonly _prismaService: PrismaService;
    private readonly _jwtService: JwtService;
    private readonly _configService: ConfigService;

    constructor(prismaService: PrismaService, configService: ConfigService, jwtService: JwtService) {
        this._prismaService = prismaService;
        this._jwtService = jwtService;
        this._configService = configService;
    }

    // #region -- Business Logic Methods
    async mintAccessToken(user: User): Promise<string> {
        const payload: AccessTokenPayload = {
            publicId: user.publicId,
            email: user.email
        };


        // Sign new access token
        const option: JwtSignOptions = {
            secret: this._configService.getOrThrow<string>("JWT_ACCESS_TOKEN_SECRET"),

            subject: user.publicId,
            issuer: this._configService.getOrThrow<string>("JWT_ACCESS_TOKEN_ISSUER"),
            audience: this._configService.getOrThrow<string>("JWT_ACCESS_TOKEN_AUDIENCE"),
            expiresIn: this._configService.getOrThrow<number>("JWT_ACCESS_TOKEN_EXPIRES_IN")
        };

        return this._jwtService.signAsync<AccessTokenPayload>(payload, option);
    }

    async mintRefreshToken(user: User, request: Request): Promise<RefreshTokenResponse> {
        const option: JwtSignOptions = {
            secret: this._configService.getOrThrow<string>("JWT_REFRESH_TOKEN_SECRET"),

            subject: user.publicId,
            issuer: this._configService.getOrThrow<string>("JWT_REFRESH_TOKEN_ISSUER"),
            audience: this._configService.getOrThrow<string>("JWT_REFRESH_TOKEN_AUDIENCE"),
            expiresIn: this._configService.getOrThrow<number>("JWT_REFRESH_TOKEN_EXPIRES_IN")
        };

        // Sign new refresh token
        const refreshToken: string = await this._jwtService.signAsync(option);

        // Records refresh token to DB
        const row: RefreshToken = await this._prismaService.refreshToken.create({
            data: {
                userId: user.id,
                familyId: uuidv4(),
                tokenHash: hash('sha256', refreshToken, 'hex'),
                ipAddress: request.ip ?? "",
                userAgent: request.headers['user-agent']
            }
        });

        return { refreshToken, row };
    }
    // #endregion
}
