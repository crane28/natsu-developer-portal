# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Internal Developer Portal — a NestJS 11 backend (Node.js, ESM, TypeScript) implementing user authentication and authorization (JWT access + refresh tokens), backed by PostgreSQL via Prisma 7. The portal is designed around an Identity & Access Management model (`User` → `Organization` → `OrganizationMember` → `OrganizationRole` → `Permission`) — see `prisma/schema.prisma` for the full data model and `Internal_Developer_Portal_PRD_v4_Technology_Neutral.md` for the product requirements.

## Commands

All scripts are npm-based (see `package.json`):

- **Dev**: `npm run start:dev` — `nest start --watch` (hot reload)
- **Build**: `npm run build` — `nest build` → `dist/` (configured to delete output first via `nest-cli.json`)
- **Run prod build**: `npm run start:prod` — `node dist/main`
- **Lint**: `npm run lint` — ESLint 9 flat config with `typescript-eslint` (type-checked) + Prettier, auto-fix on. Run before committing.
- **Format**: `npm run format` — Prettier write across `src/` and `test/`
- **Unit tests**: `npm run test` — Jest with `ts-jest`, `rootDir: src`, matches `*.spec.ts`
- **Single test**: `npx jest -t "<name or pattern>"` (e.g., `npx jest src/auth/auth.service.spec.ts`)
- **Watch tests**: `npm run test:watch`
- **Coverage**: `npm run test:cov` → `../coverage`
- **E2E tests**: `npm run test:e2e` — separate Jest config (`test/jest-e2e.json`), matches `*.e2e-spec.ts`
- **Prisma**:
  - Migrations: `npx prisma migrate dev` (uses `prisma.config.ts`, which loads `.env` via `dotenv/config`)
  - Generate client: `npx prisma generate`
- **Environment**: `.env` must define `DATABASE_URL`, `JWT_ACCESS_TOKEN_SECRET`, `JWT_REFRESH_TOKEN_SECRET` (and optionally `ARGON2_SALT` / `ARGON2_SECRET` for `UserService` hashing options). Server reads via `@nestjs/config` (`isGlobal: true`, so no need to re-import per module).

## Architecture

Modular NestJS layout under `src/`:

- **`main.ts`** — bootstraps `AppModule`, registers global `ValidationPipe` (`whitelist: true, forbidNonWhitelisted: true, transform: true`), and listens on `process.env.PORT ?? 3000`.
- **`app/app.module.ts`** — root module. Imports `ConfigModule` (global), `PrismaModule`, `UserModule`, `AuthModule`, and `ThrottlerModule` (60s / 30 requests default). Registers **two global `APP_GUARD`s**: `ThrottlerGuard` then `JwtAuthGuard` — order matters, throttler runs first.
- **`prisma/`** — `PrismaService` extends `PrismaClient` using `@prisma/adapter-pg` with `process.env.DATABASE_URL`. `PrismaModule` is `@Global()`, so any module that injects `PrismaService` does NOT need to import it. Generated Prisma client lives at `src/generated/prisma/` and is **gitignored** — regenerate after pulling.
- **`auth/`** — JWT authentication.
  - `jwt-auth.strategy.ts` — Passport JWT strategy reading `Bearer` token with `JWT_ACCESS_TOKEN_SECRET`. Returns the `Payload` DTO (publicId, email, displayName).
  - `jwt-auth.guard.ts` — extends `AuthGuard('jwt')`; checks `IS_PUBLIC_KEY` reflector metadata before delegating. Use the `@Public()` decorator (in `decorators/public.decorator.ts`) to skip auth on a route.
  - `auth.controller.ts` — `/auth/register` (`@SkipThrottle`, 201) and `/auth/login` (200). Controller-level `@Public()` exempts both routes; throttling is per-route unless skipped.
  - `auth.service.ts` — registration delegates to `UserService.createUser` after password-match check; login verifies Argon2 hash, enforces email-verified and locked-until gates, then signs both access (15m, `JWT_ACCESS_TOKEN_SECRET`) and refresh (30d, `JWT_REFRESH_TOKEN_SECRET`) tokens.
  - `dtos/` — `RegisterRequest`, `LoginRequest` request DTOs use `class-validator` + `class-transformer` (emails are lowercased/trimmed via `@Transform`).
- **`user/`** — User creation, login-attempt tracking, lookup by email. Password hashing uses `argon2` with options pulled from `ConfigService`.
- **`refresh-token/`** — Placeholder module (`RefreshTokenService` is empty). Schema already models `RefreshToken` rows (family id, hash, userAgent, ipAddress, expiry, revocation) — implementation pending.
- **`generated/prisma/`** — Prisma client output. Re-generated on schema change; do not edit.

## Conventions

- **ESM TypeScript**: package has `"type": "module"`, `tsconfig.json` uses `"module": "nodenext"` / `"moduleResolution": "nodenext"`. All local imports must use the `.js` extension (e.g., `import { Foo } from './foo.js'`), even for `.ts` source files — TypeScript resolves these to `.ts` at compile time.
- **Strict null checking is on** (`strictNullChecks: true`), but `noImplicitAny` and `strictBindCallApply` are intentionally off. See non-null assertions like `user!.passwordHash` in `auth.service.ts` — they survive lint because the preceding null-check is not type-narrowed.
- **Decorator imports**: use `applyDecorators` semantics — `@Public()` (custom) skips JWT auth; `@SkipThrottle()` from `@nestjs/throttler` skips rate limiting.
- **Two-column identifiers** (per `decision-tree.md`): every domain entity uses a numeric `id` (PK, autoincrement, used in foreign keys) plus a `publicId` UUID (exposed to clients/URLs). Prisma columns for `publicId` are mapped `@map("public_id") @db.Uuid`. When exposing an entity externally, always use `publicId` — never the raw `id`.
- **Audit columns**: tables that users can mutate carry `createdAt`/`updatedAt`/`createdBy`/`updatedBy` (FK back to `User`). Updates should always populate `updatedBy = req.user.id`. Soft-delete via `status` enums (`UserStatus`, `OrganizationStatus`, `MemberStatus`) rather than row deletion.
- **Argon2 password hashing**: `argon2` package, called as `hash(password, options)` / `verify(hash, password)`. Hash config comes from `ConfigService` (`ARGON2_SALT`, `ARGON2_SECRET`).
- **JWT secrets**: access and refresh tokens use **different secrets** (`JWT_ACCESS_TOKEN_SECRET`, `JWT_REFRESH_TOKEN_SECRET`). Do not conflate them.

## Auth flow notes (so changes stay consistent)

- The global guard stack is `ThrottlerGuard` → `JwtAuthGuard`. Anything new behind auth is implicitly protected; auth-free endpoints (login, register, public health routes) need `@Public()`.
- `RegisterRequest.displayName` is trimmed; email is trimmed + lowercased before persistence.
- `RegisterResponse` / `LoginResponse` only echo public-safe fields (no `passwordHash`, no internal `id`).
- The `RefreshToken` model is wired to `User` but unused at runtime — when implementing rotation/revocation, populate `familyId`, `tokenHash` (hash the JWT, don't store the raw token), `userAgent`, `ipAddress`, and reuse `familyId` across rotations to allow reuse-detection revocation cascades.

## Things to watch out for

- Generated Prisma client is gitignored. After `git pull`, run `npm install && npx prisma generate` before building — otherwise `src/prisma/prisma.service.ts` and any model imports fail.
- `src/generated/prisma/` is excluded from `tsconfig.build.json`? No — but `.gitignore` excludes it, and `nest build` deletes the entire `dist/` per `nest-cli.json`. Importing from `../generated/prisma/client.js` is the intentional pattern.
- ESLint runs with `--fix` on lint script, so lingering issues only show up if prettier/eslint disagree — `npm run format` first if formatting fights lint.
- E2E config `test/jest-e2e.json` has its own `rootDir: "."` (whole repo), unlike unit tests rooted at `src/`. Place e2e specs anywhere; the regex is `*.e2e-spec.ts`.
