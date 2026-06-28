# Backend Documentation

## Overview

This backend is built using **NestJS** and provides a secure authentication system with email/password login, JWT-based authorization, and email verification via SMTP.

The system is designed to be production-ready and follows modern security best practices, including hashed passwords, token expiration, and strict access control rules.

---

## Tech Stack

- **NestJS** (backend framework)
- **Prisma 5** (ORM)
- **PostgreSQL** (database)
- **JWT (JSON Web Tokens)** for authentication
- **Passport.js** (authentication strategies)
- **Argon2id** (password hashing algorithm)
- **Nodemailer** (SMTP email delivery)
- **class-validator / class-transformer** (DTO validation)
- **@nestjs/config** (environment configuration)

---

## Core Features

### 1. User Registration (Sign Up)

- Users can register using:
  - Email address
  - Password

#### Requirements:
- Email is **trimmed and normalized to lowercase**
- Email must be **unique**
- Password must:
  - Be at least **8 characters long**
  - Never be stored in plain text
  - Be hashed using **Argon2id**

#### After registration:
- A user account is created with `isEmailVerified = false`
- A **verification email** is sent via SMTP
- User cannot access the application until email verification is completed

---

### 2. Email Verification

- After sign-up, a verification email is sent to the user
- The email contains a **single-use verification token**

#### Requirements:
- Verification token expires after **24 hours**
- Token is **single-use only**
- Once used, token becomes invalid
- Once verified:
  - User account is marked as `isEmailVerified = true`
  - User is redirected to login page (no auto-login)

#### Security rules:
- Tokens must be stored securely (hashed in database recommended)
- Old unused tokens must be invalidated when a new one is issued

---

### 3. Resend Verification Email

Users can request a new verification email from:
- Login screen
- Verification result screen

#### Requirements:
- Generating a new token invalidates all previous unused tokens
- New email is sent via SMTP
- Token has a new 24-hour expiration window

---

### 4. Authentication (Login)

- Users log in using:
  - Email
  - Password

#### Requirements:
- Email comparison is case-insensitive
- Password is validated using **Argon2id verification**
- Only verified users (`isEmailVerified = true`) can log in
- On success:
  - JWT access token is issued

---

### 5. Authorization

- All application endpoints require authentication via **JWT**
- Public endpoints include only:
  - Sign-up
  - Login
  - Email verification
  - Resend verification email
  - Health / readiness endpoints (optional)

#### Protected routes:
- All business logic APIs require valid JWT token
- Access is enforced using `JwtAuthGuard`

---

## Security Requirements

### Password Security
- Must use **Argon2id hashing algorithm**
- Passwords must never be stored or logged in plaintext
- Minimum password length: **8 characters**

---

### Email Security
- Emails must be:
  - Trimmed
  - Lowercased
- Email uniqueness must be enforced at database level

---

### Token Security
- Email verification tokens:
  - Expire after 24 hours
  - Are single-use
  - Must be invalidated after use or regeneration
- Tokens should not be stored in plaintext

---

### JWT Security
- JWT tokens must:
  - Be signed with a strong secret
  - Have expiration time configured
- Should be validated on every protected request

---

## SMTP Configuration

Email delivery is handled via SMTP.

### Supported configuration:
- Relay server: `relay1.dataart.com`
- Configurable via environment variables

### Example variables:
```env
SMTP_HOST=relay1.dataart.com
SMTP_PORT=587
SMTP_USER=your_user
SMTP_PASSWORD=your_password
SMTP_FROM=no-reply@your-domain.com