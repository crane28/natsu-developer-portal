import { TokenPayload } from "./token.payload";

export class AccessTokenPayload extends TokenPayload {
    publicId!: string;
    email!: string;
}
