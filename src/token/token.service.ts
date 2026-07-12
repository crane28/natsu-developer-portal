import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

import { hash } from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import moment from 'moment';

import { PrismaService } from '../prisma/prisma.service';
import { RefreshToken, User } from '../generated/prisma/client';
import { AccessTokenPayload } from './dtos/access-token.payload';
import { RefreshTokenPayload } from './dtos/refresh-token.payload';
import { RefreshTokenResponse } from './dtos/refresh-token.response';
import { Request } from 'express';

import { BatchPayload } from '../generated/prisma/internal/prismaNamespace';

@Injectable()
export class TokenService {
    private readonly _prismaService: PrismaService;
    private readonly _jwtService: JwtService;
    private readonly _accessTokenConfig: {
        secret: string,
        issuer: string,
        audience: string,
        expiresIn: number
    };
    private readonly _refreshTokenConfig: {
        secret: string,
        issuer: string,
        audience: string,
        expiresIn: number
    };

    constructor(prismaService: PrismaService, configService: ConfigService, jwtService: JwtService) {
        this._prismaService = prismaService;
        this._jwtService = jwtService;
        this._accessTokenConfig = {
            secret: configService.getOrThrow<string>("JWT_ACCESS_TOKEN_SECRET"),
            issuer: configService.getOrThrow<string>("JWT_ACCESS_TOKEN_ISSUER"),
            audience: configService.getOrThrow<string>("JWT_ACCESS_TOKEN_AUDIENCE"),
            expiresIn: configService.getOrThrow<number>("JWT_ACCESS_TOKEN_EXPIRES_IN")
        };
        this._refreshTokenConfig = {
            secret: configService.getOrThrow<string>("JWT_REFRESH_TOKEN_SECRET"),
            issuer: configService.getOrThrow<string>("JWT_REFRESH_TOKEN_ISSUER"),
            audience: configService.getOrThrow<string>("JWT_REFRESH_TOKEN_AUDIENCE"),
            expiresIn: configService.getOrThrow<number>("JWT_REFRESH_TOKEN_EXPIRES_IN")
        }
    }

    // #region -- Business Logic Methods
    async mintAccessToken(user: User): Promise<string> {
        const payload: AccessTokenPayload = {
            publicId: user.publicId,
            email: user.email
        };

        // Sign new access token
        return this._jwtService.signAsync<AccessTokenPayload>(payload, {
            ...this._accessTokenConfig,
            subject: user.publicId
        });
    }

    async mintRefreshToken(user: User, request: Request, familyId?: string): Promise<RefreshTokenResponse> {
        // Sign new refresh token
        const refreshToken: string = await this._jwtService.signAsync({
            ...this._refreshTokenConfig,
            subject: user.publicId
        });

        // Records refresh token to DB
        const row: RefreshToken = await this._prismaService.refreshToken.create({
            data: {
                userId: user.id,
                familyId: familyId ?? uuidv4(),
                tokenHash: hash('sha256', refreshToken, 'hex'),
                ipAddress: request.ip ?? "",
                userAgent: request.headers['user-agent'] ?? ""
            }
        });

        return { refreshToken, row };
    }

    async rotateRefreshToken(token: string, request: Request): Promise<RefreshTokenResponse> {
        // Verify JWT signature, expiry, issuer, audience
        await this._jwtService.verifyAsync<RefreshTokenPayload>(token, { ...this._refreshTokenConfig });

        // Look up the token row by hash
        const tokenHash = hash('sha256', token, 'hex');
        const tokenRow: RefreshToken | null = await this._prismaService.refreshToken.findUnique({
            where: { tokenHash }
        });

        // Case 5: Token not found
        if (!tokenRow) {
            throw new NotFoundException();
        }

        // Cases 3-4: Token revoked (reuse detected) → revoke entire family
        if (tokenRow.revokedAt !== null) {
            await this.revokeFamily(tokenRow.familyId);
            throw new UnauthorizedException();
        }

        // Case 2: Token active but IP/UA mismatch (possible theft) → revoke entire family
        const ipMatch = tokenRow.ipAddress === (request.ip ?? "");
        const uaMatch = tokenRow.userAgent === (request.headers['user-agent'] ?? "");

        if (!ipMatch || !uaMatch) {
            await this.revokeFamily(tokenRow.familyId);
            throw new UnauthorizedException();
        }

        // Case 1: Normal rotation → revoke old, mint new in same family
        await this._prismaService.refreshToken.update({
            data: { revokedAt: moment().toDate() },
            where: { id: tokenRow.id }
        });

        const user: User = await this._prismaService.user.findUniqueOrThrow({
            where: { id: tokenRow.userId }
        });

        return this.mintRefreshToken(user, request, tokenRow.familyId);
    }
    // #endregion

    // #region -- Helper Methods
    private async revokeFamily(familyId: string): Promise<BatchPayload> {
        return this._prismaService.refreshToken.updateMany({
            data: { revokedAt: moment().toDate() },
            where: { familyId, revokedAt: null }
        });
    }
    // #endregion
}
