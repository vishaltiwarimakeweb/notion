# How It Works

## Manager registration & login

A manager registers with an organization name, their own name, email, and password (`POST /api/auth/register`). This creates an `Organization` and `Manager` document together inside a MongoDB transaction (`src/models/Organization.ts`, `src/models/Manager.ts`) — if either insert fails, both roll back. The password is hashed with bcrypt before storage. On success (and on subsequent logins via `POST /api/auth/login`), a JWT is signed with `jose` (`src/lib/session.ts`) containing `managerId`, `organizationId`, and `email`, and stored in an `httpOnly`, `secure`, `sameSite=lax` cookie valid for 7 days.

`POST /api/auth/logout` clears the cookie. `GET /api/auth/me` returns the current manager (used by server components via `getCurrentManager()` in `src/lib/auth.ts`).

## Route protection

`src/proxy.ts` (Next.js 16's replacement for the older `middleware.ts` convention) intercepts requests to `/dashboard/*`, verifies the session cookie, and redirects to `/login` if it's missing or invalid. It only imports from `src/lib/session.ts` (not `src/lib/auth.ts`), because that file avoids Mongoose — proxy/middleware runs on the Edge runtime, which can't use Node-only modules.

## Forgot password (OTP)

A manager requests an OTP with their registered email (`POST /api/auth/otp/request`). The OTP is a 5-digit code, bcrypt-hashed and stored in Redis under `otp:{email}` with a 90-second TTL (`src/lib/otp.ts`) — that single TTL is both the resend cooldown and the OTP's validity window. The response never reveals whether the email is actually registered.

To complete the reset, the manager submits email + OTP + new password together (`POST /api/auth/otp/reset-password`) rather than verifying the OTP in a separate step. Five wrong attempts locks the email out for 3 minutes (`otp:lock:{email}`).

Emails are sent via Brevo's transactional email API (`src/lib/email.ts`).

## Theming

Dark/light mode is hand-rolled (no external theme library): `src/components/ThemeProvider.tsx` holds a React context that toggles a `.dark` class on `<html>` and persists the choice to `localStorage`. An inline script in `src/app/layout.tsx`'s `<head>` applies the stored (or OS-preferred) theme before hydration to avoid a flash of the wrong theme. Tailwind v4's `@custom-variant dark` (in `src/app/globals.css`) makes `dark:` utility classes respond to that class instead of only `prefers-color-scheme`.

## Not implemented yet

Workspaces, pages/blocks, real-time collaboration, inline AI, the AI assistant widget, search, and billing — see the phase-by-phase roadmap in [PRE_BUILD_PLAN.md](PRE_BUILD_PLAN.md).
