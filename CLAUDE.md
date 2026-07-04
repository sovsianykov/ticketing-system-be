# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **NestJS-based ticketing system backend** built with TypeScript. It provides REST APIs for managing tickets, teams, comments, and epics with JWT-based authentication and PostgreSQL persistence via Prisma ORM.

**Key Technologies:**
- **Framework:** NestJS 11 (TypeScript)
- **Database:** PostgreSQL (via Prisma ORM)
- **Authentication:** JWT (access + refresh tokens) with Passport strategies
- **Email:** Nodemailer (SMTP)
- **Password Hashing:** Argon2
- **Testing:** Jest
- **API Port:** 8080 (configurable via PORT env var)
- **API Prefix:** `/api/v1`

## Architecture

### Modular Structure

The project follows NestJS module-based architecture with feature modules:

- **`auth/`** — JWT authentication, login, register, token refresh, logout, delete user
- **`users/`** — User CRUD, email verification, password management
- **`tickets/`** — Ticket management (create, update, list by team/state)
- **`teams/`** — Team management and team membership
- **`comments/`** — Comments on tickets
- **`epics/`** — Epic (feature group) management
- **`email/`** — Email sending service (verification, notifications)
- **`prisma/`** — Database service and schema management
- **`common/`** — Shared types and utilities

### Key Patterns

**Repository Pattern:** Services use repository classes (e.g., `users.repository.ts`) to handle data access, not direct Prisma calls in service business logic.

**Guards & Strategies:** 
- `jwt-auth.guard` and `local-auth.guard` protect routes
- JWT split into `jwt.accessStrategy.ts` and `jwt.refreshStrategy.ts` for access + refresh token flows
- Old strategies (`jwt.strategy.ts`, `local.strategy.ts`) have been removed in favor of the split approach

**DTOs:** Input validation uses `class-validator` and `class-transformer` decorators on DTO classes.

**Type Safety:** Custom types in `common/types/user.types.ts` (e.g., `UserWithoutPassword`) exclude sensitive fields from API responses.

### Database Schema (Prisma)

Key models with relationships:
- **User** → owns created Tickets, TicketComments, TeamMemberships
- **Team** → owns Epics, Tickets, TeamMembers
- **Ticket** → belongs to Team, Epic (optional), Author (User); has Comments
- **TicketComment** → belongs to Ticket, Author (User)
- **Epic** → belongs to Team; has Tickets
- **RefreshToken** → tracks issued tokens (with expiry, revocation, usage tracking)
- **EmailVerificationToken** → one-time tokens for email verification

**Ticket State Flow:** `new` → `ready_for_implementation` → `in_progress` → `ready_for_acceptance` → `done`

**Ticket Types:** `bug`, `feature`, `fix`

## Commands

### Development

```bash
npm run start:dev      # Watch mode (kills port 8080 first via prestart hook)
npm run start          # Production-like run
npm run start:debug    # Debug mode with watch
```

### Build & Lint

```bash
npm run build          # Compile TypeScript to dist/
npm run lint           # Fix ESLint violations
npm run format         # Format code with Prettier
```

### Testing

```bash
npm test               # Run all unit tests (src/**/*.spec.ts)
npm run test:watch     # Watch mode for tests
npm run test:cov       # Coverage report (outputs to coverage/)
npm run test:e2e       # E2E tests (uses test/jest-e2e.json)
npm run test:debug     # Debug mode for Jest
```

## Environment Setup

Copy `.env.example` to `.env` and set values:

```bash
cp .env.example .env
```

**Required Variables:**
- `DATABASE_URL` — PostgreSQL connection string (Prisma)
- `JWT_SECRET` — Secret key for signing JWTs
- `JWT_EXPIRES_IN` — JWT expiry (e.g., `1d`, `24h`)
- `SMTP_*` — Email server credentials for verification and notifications
- `APP_URL` — Application URL for email links

## Database Migrations

```bash
npx prisma migrate dev --name <migration_name>  # Create and apply migration
npx prisma migrate deploy                        # Apply pending migrations
npx prisma studio                                # Open Prisma Studio (UI for DB)
npx prisma db push                               # Push schema changes (dev only)
```

## Common Patterns to Follow

**Service Business Logic:**
- Validate input in DTOs, not in service methods
- Use repositories for all data access
- Return clean types (e.g., `UserWithoutPassword`) from public methods
- Throw specific NestJS exceptions (`ConflictException`, `NotFoundException`, `UnauthorizedException`)

**Controllers:**
- Use `@UseGuards(JwtAuthGuard)` or `@UseGuards(LocalAuthGuard)` on protected routes
- DTOs automatically validate request bodies via `ValidationPipe`
- Extract user from request via `@Req() request` and `request.user`

**Error Handling:**
- NestJS exceptions are automatically converted to HTTP responses
- Use meaningful exception types and messages

## Current Development Status

- **In-progress branch:** `tickets-1` (visible in git status)
- Recent work: Comment management on team tickets, auth refactor (JWT strategies split), delete user method
- Email verification and refresh token tracking are implemented

## Notes for Future Work

- JWT strategy refactor is incomplete in `auth.module.ts` — references removed strategies. Update imports if strategy names change.
- Test coverage is minimal; expand with `npm run test:cov`
- CORS is hardcoded to `http://localhost:3000` — externalize to env var for staging/prod
