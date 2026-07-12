import { RefreshToken } from "../../generated/prisma/client";

export class RefreshTokenResponse {
    refreshToken!: string;
    row!: RefreshToken;
}