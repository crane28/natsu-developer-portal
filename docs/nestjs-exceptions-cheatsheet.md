# NestJS HTTP Exceptions Cheatsheet

> When to throw what — a quick reference for picking the right `HttpException` subclass.

---

## Quick Lookup Table

| Status | Exception | When to use | Example message |
|---|---|---|---|
| 400 | `BadRequestException` | Malformed request, validation failed at the boundary | `"Invalid request body"` |
| 401 | `UnauthorizedException` | Not authenticated, or credentials are wrong | `"Invalid email or password"` |
| 403 | `ForbiddenException` | Authenticated but not allowed to do this | `"You do not own this resource"` |
| 404 | `NotFoundException` | Resource doesn't exist | `"User not found"` |
| 409 | `ConflictException` | Request collides with existing state | `"Email is already used"` |
| 410 | `GoneException` | Resource existed but is permanently gone | `"Account has been deleted"` |
| 422 | `UnprocessableEntityException` | Valid syntax but business rules reject it | `"Email domain not allowed"` |
| 429 | `ThrottlerException` | Rate limit hit (from `@nestjs/throttler`) | `"Too many requests"` |
| 500 | `InternalServerErrorException` | Server fault, not client's fault | `"Unexpected error"` |
| 503 | `ServiceUnavailableException` | Downstream service or DB is down | `"Database is temporarily unavailable"` |

All exceptions live in `@nestjs/common`:

```typescript
import { BadRequestException, ConflictException } from '@nestjs/common';
```

---

## Decision Tree

```
Is the request well-formed and authenticated?
├── No, malformed/invalid input
│   └── 400 BadRequestException
│       (or let ValidationPipe handle it — don't manually throw)
│
├── No, not authenticated
│   └── 401 UnauthorizedException
│
├── Yes, but caller isn't allowed
│   └── 403 ForbiddenException
│
└── Yes, allowed
    │
    Does the resource exist?
    ├── No
    │   └── 404 NotFoundException
    │       (use 410 GoneException if permanently deleted)
    │
    └── Yes
        │
        Does the action conflict with current state?
        ├── Yes — duplicate / version mismatch / already-applied
        │   └── 409 ConflictException
        │
        └── No
            │
            Is it valid syntax but semantically wrong?
            ├── Yes — business rule rejection
            │   └── 422 UnprocessableEntityException
            │
            └── No, success → return result
```

---

## Detailed Guidance

### 400 — `BadRequestException`

For things `ValidationPipe` can't catch: missing required query params, malformed JSON that passed parsing, wrong content type. **In practice, let `ValidationPipe` handle validation** — don't throw this manually for DTO failures.

```typescript
throw new BadRequestException('Page must be a positive integer');
```

Use only when you can't express the check via `class-validator` decorators.

### 401 — `UnauthorizedException`

"Not logged in" or "credentials are wrong." Returns the standard `WWW-Authenticate` header.

```typescript
throw new UnauthorizedException('Email or password is wrong');
```

**Always use the same message for login failures** (whether the email doesn't exist or the password is wrong) — never leak which emails are registered.

### 403 — `ForbiddenException`

"You're logged in, but you can't do this." Common cases:
- Trying to access another user's resource
- Role/permission check failed
- Feature gated behind a plan

```typescript
throw new ForbiddenException('You can only edit your own posts');
```

### 404 — `NotFoundException`

Resource doesn't exist. Note: returning 404 vs. 403 can leak existence. If existence itself is sensitive, return 403 for both cases.

```typescript
throw new NotFoundException('User not found');
```

### 409 — `ConflictException`

The request is valid but collides with existing data. RFC 9110 calls this out specifically for:
- Unique constraint violations
- Optimistic locking failures (version mismatch)
- Idempotency conflicts
- State transitions that aren't allowed (e.g. "can't cancel a shipped order")

```typescript
throw new ConflictException('Email is already used');
throw new ConflictException({
    code: 'EMAIL_TAKEN',
    message: 'Email is already used',
});
```

### 410 — `GoneException`

Resource existed but is permanently gone. Use sparingly. Common cases:
- Soft-deleted records where you don't want them resurrected
- Expired invite links
- Permanently deprecated endpoints

```typescript
throw new GoneException('This account has been permanently deleted');
```

### 422 — `UnprocessableEntityException`

The request is well-formed but the business logic rejects it. Use this when:
- DTO validation passes but a deeper rule fails
- The semantic content is the problem, not the format

```typescript
throw new UnprocessableEntityException('Email domain is not allowed');
throw new UnprocessableEntityException('Cannot transfer to a deleted account');
```

### 429 — `ThrottlerException`

Rate limiting. Provided by `@nestjs/throttler`. You typically don't throw this manually — let the guard handle it.

```typescript
@Throttle({ default: { limit: 10, ttl: 60000 } })
@Get('limited')
handler() { ... }
```

### 500 — `InternalServerErrorException`

Server fault, not the client's fault. Default for unhandled errors. **Use only when you genuinely know it's a server-side problem.**

```typescript
throw new InternalServerErrorException('Something went wrong');
```

Pair with logging — don't expose stack traces in production responses.

### 503 — `ServiceUnavailableException`

Downstream is unavailable or overloaded. Use for:
- Database connection lost
- External API timeout
- Maintenance windows

```typescript
throw new ServiceUnavailableException('Service temporarily unavailable, please retry');
```

---

## Prisma Error Translation

If you use Prisma, translate its error codes into HTTP exceptions via an exception filter. The most common:

| Prisma code | HTTP status | When |
|---|---|---|
| `P2000` | 400 | Value too long for column |
| `P2001` | 404 | Record in `where` not found |
| `P2002` | 409 | Unique constraint violation |
| `P2003` | 400 | Foreign key constraint failed |
| `P2011` / `P2012` / `P2013` | 400 | Required field/relation missing |
| `P2014` | 400 | Required relation violation |
| `P2024` | 503 | Connection pool timeout |
| `P2025` | 404 | Operation failed because record doesn't found |

Reference: https://www.prisma.io/docs/orm/reference/error-reference

---

## Patterns

### Don't Leak Existence on Login

```typescript
// ✅ same message for both cases — doesn't reveal which emails are registered
if (!user) throw new UnauthorizedException('Email or password is wrong');
if (!verifyPassword(user, input)) throw new UnauthorizedException('Email or password is wrong');
```

### Use a `code` Field for Machine-Readable Errors

```typescript
throw new ConflictException({
    code: 'EMAIL_TAKEN',
    message: 'Email is already used',
});
// → 409 { "statusCode": 409, "code": "EMAIL_TAKEN", "message": "...", "error": "Conflict" }
```

### Default Response Shape

NestJS auto-formats thrown exceptions as:

```json
{
    "statusCode": 404,
    "message": "User not found",
    "error": "Not Found"
}
```

Override globally with an `AllExceptionsFilter` if you need a different shape (e.g. `{ success: false, error: { code, message } }`).

---

## Anti-Patterns

| ❌ Don't | ✅ Do |
|---|---|
| Manually throw for DTO validation | Let `ValidationPipe` do it via decorators |
| Return `{ ok: false, code }` from controllers | Throw an HTTP exception |
| Throw `InternalServerErrorException` for known business cases | Throw the specific exception (404, 409, etc.) |
| Leak stack traces in 500 responses | Log server-side, return generic message |
| Differentiate "email not found" vs "wrong password" | Use the same 401 message for both |
| Throw `BadRequestException` for everything | Pick the most specific status code |

---

## Layering: Service vs Filter

| Where | Use for |
|---|---|
| **Service try/catch** | Specific Prisma errors that need a business-flavored message |
| **Prisma filter** | Generic Prisma error translation (catches what services miss) |
| **All-exceptions filter** | Sanitize unknown errors, log them, return 500 |
| **Throw directly in service** | Non-DB business logic violations |

Example layered setup:

```typescript
async register(data: RegisterRequest) {
    try {
        return await this.user.insert({
            email: data.email,
            passwordHash: await hash(data.password),
            displayName: data.displayName,
        });
    } catch (e) {
        if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
            throw new ConflictException('Email is already used');   // specific message
        }
        throw e;                                                    // filter handles the rest
    }
}
```

---

## Reference

- [Built-in HTTP exceptions](https://docs.nestjs.com/exception-filters#built-in-http-exceptions)
- [Custom exceptions](https://docs.nestjs.com/exception-filters#custom-exceptions)
- [Exception filters](https://docs.nestjs.com/exception-filters)
- [RFC 9110 — HTTP Semantics](https://www.rfc-editor.org/rfc/rfc9110)
