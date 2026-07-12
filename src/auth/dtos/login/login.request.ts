import { Transform } from "class-transformer";
import { IsDefined, IsEmail, IsString } from "class-validator";

export class LoginRequest {
    @IsDefined()
    @IsEmail()
    @Transform(o => typeof o.value === "string" ? o.value.trim().toLowerCase() : o.value)
    email!: string;

    @IsDefined()
    @IsString()
    password!: string;
}