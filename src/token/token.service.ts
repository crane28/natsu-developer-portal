import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { RefreshToken, User } from '../generated/prisma/client.js';

import { hash } from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import moment from 'moment';

@Injectable()
export class RefreshTokenService {
    private readonly _prismaService: PrismaService;
    private readonly _jwtService: JwtService;

    private readonly _expDurationInSec: number;
    private readonly _refreshTokenSecret: string;

    constructor(prismaService: PrismaService, configService: ConfigService, jwtService: JwtService) {
        this._prismaService = prismaService;
        this._jwtService = jwtService;

        this._expDurationInSec = configService.get<number>("JWT_REFRESH_TOKEN_EXPIRATION") || 2_592_000;
        this._refreshTokenSecret = configService.get<string>("JWT_REFRESH_TOKEN_SECRET")!;
    }

    // #region -- Business Logic Methods
    async mintRefreshToken(
        user: User,
        userAgent: string,
        ipAddress: string
    ): Promise<{ token: string, row: RefreshToken }> {
        const newRefreshToken: string = await this._jwtService.signAsync(
            { sub: user.publicId },
            {
                secret: this._refreshTokenSecret,
                expiresIn: this._expDurationInSec,
                jwtid: uuidv4()
            }
        );

        const newRow: RefreshToken = await this._prismaService.refreshToken.create({
            data: {
                userId: user.id,
                familyId: uuidv4(),
                tokenHash: hash('sha256', newRefreshToken, 'hex'),
                userAgent: userAgent,
                ipAddress: ipAddress,
                expiresAt: moment().add(this._expDurationInSec, 's').toDate(),
            }
        });

        return {
            token: newRefreshToken,
            row: newRow
        };
    }

    async rotateRefreshToken(refreshToken: string) {
        const newRefreshToken: string = await this._jwtService.signAsync(
            { sub: "" },
            {
                expiresIn: this._expDurationInSec,
                secret: this._refreshTokenSecret,
                jwtid: uuidv4()
            }
        );

        // Revoke all previousToken
    }
    // #endregion
}
