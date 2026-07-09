import { RefreshToken } from "../../generated/prisma/client.js";

export class RefreshTokenResponse {
    refreshToken!: string;
    row!: RefreshToken;
}