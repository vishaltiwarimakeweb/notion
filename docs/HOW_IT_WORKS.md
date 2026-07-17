# How It Works

## Manager registration & login

A manager registers with an organization name, their own name, email, and password (`POST /api/auth/register`). This creates an `Organization` and `Manager` document together inside a MongoDB transaction (`src/models/Organization.ts`, `src/models/Manager.ts`) — if either insert fails, both roll back. The password is hashed with bcrypt before storage. On success (and on subsequent logins via `POST /api/auth/login`), a JWT is signed with `jose` (`src/lib/session.ts`) containing `userId`, `userType` (`"manager"` or `"employee"` — see Employee invitation below), `organizationId`, and `email`, and stored in an `httpOnly`, `secure`, `sameSite=lax` cookie valid for 7 days.

`POST /api/auth/logout` clears the cookie. `GET /api/auth/me` returns the current manager (used by server components via `getCurrentManager()` in `src/lib/auth.ts`).

## Route protection

`src/proxy.ts` (Next.js 16's replacement for the older `middleware.ts` convention) intercepts requests to `/dashboard/*`, verifies the session cookie, and redirects to `/login` if it's missing or invalid. It only imports from `src/lib/session.ts` (not `src/lib/auth.ts`), because that file avoids Mongoose — proxy/middleware runs on the Edge runtime, which can't use Node-only modules.

## Forgot password (OTP)

A manager requests an OTP with their registered email (`POST /api/auth/otp/request`). The OTP is a 5-digit code, bcrypt-hashed and stored in Redis under `otp:{email}` with a 90-second TTL (`src/lib/otp.ts`) — that single TTL is both the resend cooldown and the OTP's validity window. The response never reveals whether the email is actually registered.

To complete the reset, the manager submits email + OTP + new password together (`POST /api/auth/otp/reset-password`) rather than verifying the OTP in a separate step. Five wrong attempts locks the email out for 3 minutes (`otp:lock:{email}`).

Emails are sent via Brevo's transactional email API (`src/lib/email.ts`).

## Workspaces

Managers create/rename/trash/restore workspaces scoped to their own organization (`src/models/Workspace.ts`, `src/app/api/workspaces/`). Every id-scoped route (`GET/PATCH/DELETE /api/workspaces/[id]`) checks that the workspace's `organizationId` matches the requesting manager's before doing anything — a workspace belonging to a different organization returns 404 (not 403), so a request can't distinguish "doesn't exist" from "exists but isn't yours."

Deleting a workspace sets `isDeleted`/`deletedAt` rather than removing the document (`DELETE /api/workspaces/[id]`); restoring is a `PATCH { isDeleted: false }` rather than a separate endpoint, since both rename and restore are partial updates to the same resource. `GET /api/workspaces/trash` lists only the soft-deleted ones, powering the `/dashboard/trash` page.

`WorkspaceMember` (`src/models/WorkspaceMember.ts`) exists as a schema already but has no code path that writes to it yet — it stays empty until Phase 2 adds Employees and something can actually be assigned to a workspace. Workspace member counts aren't shown in the UI for the same reason.

## Employee invitation & OAuth sign-in

A manager invites someone to a workspace with `POST /api/workspaces/[id]/invite` (`{email}`). This first checks the org's plan member limit (`src/lib/billing.ts`) against the workspace's current `WorkspaceMember` count. If the email already belongs to an `Employee` in the org, it's assigned directly — no new invite needed, per spec. Otherwise a `src/models/Invitation.ts` record is created (random 32-byte token, 7-day expiry — not specified upstream, a chosen default) and an email goes out via Brevo with a link to `/invite/[token]`.

That page (`src/app/invite/[token]/page.tsx`) is public — no session required — and shows the org/workspace name with "Continue with Google/GitHub" buttons. Those hit `GET /api/oauth/[provider]/start`, which validates the invitation is still pending, signs a short-lived (5 min) `jose` JWT as the OAuth `state` param (carrying `{provider, inviteToken}` — this is the CSRF protection, no cookie or Redis entry needed for it), and redirects to the provider's authorize URL. OAuth itself is hand-rolled (`src/lib/oauth.ts`) rather than a library like Auth.js, specifically so it can plug into the same `createSessionToken`/`setSessionCookie` Manager auth already uses, instead of running two parallel session systems.

`GET /api/oauth/[provider]/callback` verifies the `state`, exchanges the `code` for the provider's profile, and — importantly — checks the OAuth-returned email matches the invitation's email before doing anything else (this isn't explicitly required by the spec, but skipping it would let any Google/GitHub account redeem someone else's invite link). It then re-checks the member limit (defensive, in case two invites were both accepted after the limit was hit), finds-or-creates the `Employee`, creates the `WorkspaceMember`, marks the invitation accepted, and signs the employee in with `userType: "employee"`.

The dashboard, workspace detail page, and Navbar all branch on `session.userType`: a Manager sees every workspace in the org plus create/rename/delete controls; an Employee sees only the workspaces they're an assigned `WorkspaceMember` of, read-only. Manager-initiated unassign, employee self-unassign, and a member-list view are deliberately not built yet (see NOTES.md).

## Pages & Blocknote content

Both Managers (any workspace in their org) and Employees (only workspaces they're a `WorkspaceMember` of) can create and edit pages — `src/lib/workspaces.ts`'s `getAccessibleWorkspace(id, session)` branches on `session.userType` to enforce that, and `src/lib/pages.ts`'s `getAccessiblePage`/`getPageForMutation` build on top of it for page-level routes.

Pages nest via `parentPageId` (`src/models/Page.ts`) — a general tree (any number of children per page), not a chain. A page's actual content lives in a separate `Content` document (`src/models/Content.ts`) holding the whole Blocknote `blocks` array as one JSON blob — that's `editor.document`'s native shape, fetched/replaced as a unit, not modeled as individual block rows in Mongo. `PUT /api/pages/[id]/content` (`src/app/api/pages/[id]/content/route.ts`) replaces the array wholesale; the editor (`src/components/PageEditor.tsx`) debounces ~1s after the last keystroke before calling it.

The editor itself (`@blocknote/core` + `@blocknote/react` + `@blocknote/shadcn`) touches `window` during render and can't be server-rendered — `src/components/PageEditorClient.tsx` wraps it in `next/dynamic(..., { ssr: false })` (a plain static import in the Server Component page would 500 with `window is not defined`; `next/dynamic`'s `ssr: false` option also can't be used directly inside a Server Component, hence the separate client-only wrapper file).

Soft-deleting a page cascades to every descendant (`cascadeSoftDelete` in `src/lib/pages.ts`) so a trashed parent never leaves orphaned-but-still-accessible children behind; restoring a page does not cascade back down — a known, documented limitation rather than something solved now. Page trash is scoped per-workspace (`/dashboard/workspaces/[id]/trash`), reachable by anyone with access to that workspace — unlike the global `/dashboard/trash`, which is manager-only and workspace-trash-only.

Favorites (`src/models/Favorite.ts`) use the same `{userId, userType}` pattern as `Message`, so either a Manager or an Employee can favorite a page.

## Theming

Dark/light mode is hand-rolled (no external theme library): `src/components/ThemeProvider.tsx` holds a React context that toggles a `.dark` class on `<html>` and persists the choice to `localStorage`. An inline script in `src/app/layout.tsx`'s `<head>` applies the stored (or OS-preferred) theme before hydration to avoid a flash of the wrong theme. Tailwind v4's `@custom-variant dark` (in `src/app/globals.css`) makes `dark:` utility classes respond to that class instead of only `prefers-color-scheme`.

## Not implemented yet

Real-time collaboration, inline AI, the AI assistant widget, search, and billing — see the phase-by-phase roadmap in [PRE_BUILD_PLAN.md](PRE_BUILD_PLAN.md). Also not yet built: manager-unassign / employee self-unassign from a workspace, a workspace member-list view (scope-trimmed out of Phase 2, see NOTES.md), and RecentlyVisited (Phase 6).
