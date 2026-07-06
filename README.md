/# Ticketing System — Backend

NestJS REST API for managing tickets, teams, epics, and comments. PostgreSQL via Prisma, JWT auth with HTTP-only cookie refresh tokens, Argon2 password hashing, and Nodemailer for email verification.

## Stack

| Layer | Technology |
|---|---|
| Framework | NestJS 11 + TypeScript |
| Database | PostgreSQL (Prisma ORM 5) |
| Auth | Passport.js — JWT (access + refresh) + Local strategy |
| Email | Nodemailer (SMTP) |
| Hashing | Argon2 |
| Validation | class-validator + class-transformer |
| Testing | Jest + Supertest |

---

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL instance

### Setup

```bash
npm install
cp .env.example .env   # fill in values (see Environment Variables)
npx prisma migrate dev --name init
npm run start:dev
```

API is available at `http://localhost:8080/api/v1`.

> The `prestart` hooks automatically kill any process on port 8080 before starting.

---

## Environment Variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_ACCESS_SECRET` | Secret for signing short-lived access tokens |
| `JWT_REFRESH_SECRET` | Secret for signing long-lived refresh tokens |
| `SMTP_HOST` | SMTP server hostname |
| `SMTP_PORT` | SMTP server port (typically `587`) |
| `SMTP_USER` | SMTP authentication username |
| `SMTP_PASSWORD` | SMTP authentication password |
| `SMTP_FROM` | Sender address for outgoing emails |
| `APP_URL` | Public base URL used in email links |

---

## Authentication Flow

Access tokens are returned in the response body. Refresh tokens are set as an HTTP-only cookie scoped to `/api/v1/auth`.

```
POST   /api/v1/auth/register                      — create account, triggers verification email
GET    /api/v1/auth/verify-email?token=<hex>      — activate account
POST   /api/v1/auth/resend-verification           — resend verification email
POST   /api/v1/auth/login                         — returns { accessToken }, sets refreshToken cookie
POST   /api/v1/auth/refresh                       — rotates both tokens (requires refreshToken cookie)
POST   /api/v1/auth/logout                        — revokes refresh token, clears cookie
DELETE /api/v1/auth/delete                        — permanently deletes account
GET    /api/v1/auth/profile                       — returns authenticated user (JWT required)
```

**Email verification is enforced at the strategy level** — a valid JWT for an unverified account returns `401`.

Refresh tokens are hashed before storage and tracked with expiry, revocation, last-used, user-agent, and IP metadata in the `RefreshToken` table.

---

## API Reference

All routes are prefixed with `/api/v1`. Routes marked 🔒 require `Authorization: Bearer <accessToken>`.

### Users

```
GET    /users          — list all users
POST   /users          — create user (direct, bypasses email verification)
GET    /users/me    🔒 — current authenticated user
GET    /users/:id   🔒 — get user by ID
PATCH  /users/:id   🔒 — update user
```

### Teams

```
POST   /teams       — create team
GET    /teams       — list all teams
GET    /teams/:id   — get team by ID
PATCH  /teams/:id   — update team
DELETE /teams/:id   — delete team
```

### Tickets

```
POST   /tickets                        🔒 — create ticket
GET    /tickets?teamId=&state=&type=   — list tickets (filterable)
GET    /tickets/:id                    — get ticket
PATCH  /tickets/:id                    — update ticket
DELETE /tickets/:id                    — delete ticket
```

**Ticket state flow:** `new` → `ready_for_implementation` → `in_progress` → `ready_for_acceptance` → `done`

**Ticket types:** `bug` | `feature` | `fix`

### Epics

```
POST   /epics          🔒 — create epic
GET    /epics?teamId=     — list epics (optional team filter)
GET    /epics/:id         — get epic
PATCH  /epics/:id      🔒 — update epic
DELETE /epics/:id      🔒 — delete epic
```

### Comments

```
POST   /comments                   🔒 — create comment
GET    /comments/ticket/:ticketId     — get all comments for a ticket
GET    /comments/:id                  — get comment
PATCH  /comments/:id               🔒 — update comment body
DELETE /comments/:id               🔒 — delete comment
```

---

## Data Model

```
User ──< TeamMember >── Team ──< Epic
                          │
                          └──< Ticket ──< TicketComment
                                │
                              (optional epicId → Epic)

User ──< RefreshToken
User ──< EmailVerificationToken
```

All primary keys are UUIDs. Cascading deletes propagate from `Team` and `User` downward.

---

## Project Structure

```
src/
├── auth/
│   ├── strategies/        # jwt.accessStrategy, jwt.refreshStrategy, local.strategy
│   ├── guards/            # JwtAuthGuard, LocalAuthGuard, JwtRefreshAuthGuard
│   └── dto/
├── users/
│   ├── users.repository.ts   # only module using the repository pattern
│   └── dto/
├── tickets/
├── teams/
├── epics/
├── comments/
├── email/                 # EmailService — wraps Nodemailer
├── prisma/                # PrismaService (global module)
└── common/
    └── types/user.types.ts  # UserWithoutPassword, RequestWithUser
```

---

## Development Commands

```bash
npm run start:dev      # watch mode
npm run start:debug    # watch + Node inspector

npm run build          # compile to dist/
npm run lint           # ESLint --fix
npm run format         # Prettier

npm test               # unit tests
npm run test:watch     # unit tests in watch mode
npm run test:cov       # coverage report → coverage/
npm run test:e2e       # end-to-end tests

npx prisma migrate dev --name <name>   # create + apply migration
npx prisma studio                      # database GUI
```

Run a single test file:

```bash
npx jest src/auth/auth.service.spec.ts
```

---

## Known Limitations

- CORS origin is hardcoded to `http://localhost:3000` in `main.ts` — externalize to an env var before deploying to staging/production.
- The repository pattern is only applied in `users/`; other modules call Prisma directly from the service layer.
- Test coverage is sparse — run `npm run test:cov` to measure current state.
