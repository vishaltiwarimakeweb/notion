# Progress

## Done

**Pre-build architecture review** (see NOTES.md for the mismatch/assumption caught during this step):

- Reviewed docs/PRE_BUILD_PLAN.md against CLAUDE.md rules, fixed schema gaps (`WorkspaceMember`, `Invitation`, `Favorite`, `RecentlyVisited` models; trash fields on Workspace/Page; `data` payload on Content; `workspaceId`/`createdBy` on Page; Message supports Manager or Employee senders).
- Rewrote the Building Plan into 10 phases (0–9), each independently testable/deployable. Split "AI assistant + MCP tools" into two phases per the MVP instruction to defer tool-calling.

**Phase 0 — Foundation & Manager Auth (implemented, on branch `feature/manager-auth`):**

- Project scaffolding: `mongoose`, `bcrypt`, `jose`, `ioredis`, `react-toastify`, `@getbrevo/brevo`, `lucide-react` installed. `.gitignore` fixed (it previously blanket-ignored `.env*`, which would have excluded `.env.example` too). `.env.example` added with `MONGODB_URI`, `JWT_SECRET`, Redis Cloud vars (`REDIS_HOST`/`REDIS_PORT`/`REDIS_USERNAME`/`REDIS_PASSWORD`), `BREVO_API_KEY`, `BREVO_SENDER_EMAIL`, `BREVO_SENDER_NAME`.
- `Organization` and `Manager` models (`src/models/`).
- Manager register/login/logout, session cookie via JWT (`jose`), `GET /api/auth/me` (`src/app/api/auth/`).
- Forgot-password via Redis-backed rate-limited OTP + Brevo email (`src/lib/otp.ts`, `src/lib/email.ts`).
- Route protection for `/dashboard` via `src/proxy.ts` — **note:** Next.js 16 deprecated the `middleware.ts` file convention in favor of `proxy.ts` (function must be named `proxy`, not `middleware`); this was caught live from the dev server's own deprecation warning, not assumed from training data.
- Landing page, login/register/forgot-password pages, placeholder dashboard, hand-rolled dark/light theme (no added theme library), Navbar.
- `npm run lint` and `npx tsc --noEmit` both clean.

## Testing status

Full end-to-end verification completed against real MongoDB Atlas + Redis Cloud + Brevo (after you moved `.env.local` into the project root — it had initially landed in `docs/`, where Next.js doesn't auto-load it):

- Register → org + manager created in real Mongo, session cookie set (201).
- `GET /api/auth/me` and `GET /dashboard` both succeed with the cookie; `/dashboard` renders "Welcome, {name}" correctly.
- Logout clears the cookie; `/dashboard` afterward correctly 307-redirects to `/login`.
- OTP request: succeeds (200), writes the bcrypt-hashed OTP to Redis Cloud; immediate resend correctly blocked with 429 + `retryAfterSeconds`.
- OTP reset-password: wrong OTP → 400; correct OTP → 200 and the password is actually updated (confirmed old password now fails login, new password succeeds).
- Lockout: 5 wrong OTP submissions return 400 each; the 6th returns 429 with `retryAfterSeconds: 180`; the correct OTP is also rejected while locked.
- Test manager/organization and Redis keys created during this verification were deleted afterward — no test data left behind.

Not covered: actual email deliverability/formatting of the Brevo OTP email (the test used a non-inboxed address; the API call itself succeeded), and click-driven UI testing (theme toggle, form validation feedback) — no headless browser tooling was available in this sandbox, so that was verified by code review only.

## Next

- Push branch `feature/manager-auth` (still blocked — no GitHub credentials in this sandbox) and open a PR.
- Design Phase 1: Workspace CRUD (manager-only) + `WorkspaceMember` schema + plan member-limit enforcement.
- Design Phase 2: Employee invitation (`Invitation` schema + Brevo) + Google/GitHub OAuth + auto-assign to workspace on accept.
