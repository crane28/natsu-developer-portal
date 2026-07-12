import { Transform } from "class-transformer";
import { IsDefined, IsEmail, IsString, IsStrongPassword, MaxLength, MinLength } from "class-validator";

export class RegisterRequest {
    @IsDefined()
    @IsEmail()
    @Transform(o => typeof o.value === "string" ? o.value.trim().toLowerCase() : o.value)
    email!: string;

    @IsDefined()
    @IsString()
    @MinLength(8)
    @MaxLength(72)
    @IsStrongPassword({
        minLowercase: 1,
        minNumbers: 1,
        minSymbols: 1,
        minUppercase: 1
    })
    password!: string;

    @IsDefined()
    @IsString()
    @MinLength(8)
    @MaxLength(72)
    confirmPassword!: string;

    @IsDefined()
    @IsString()
    @MaxLength(255)
    @Transform(o => typeof o.value === "string" ? o.value.trim() : o.value)
    displayName!: string;
}