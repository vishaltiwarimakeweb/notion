# Progress

## Done

**Pre-build architecture review** (see NOTES.md for the mismatch/assumption caught during this step):

- Reviewed docs/PRE_BUILD_PLAN.md against CLAUDE.md rules, fixed schema gaps (`WorkspaceMember`, `Invitation`, `Favorite`, `RecentlyVisited` models; trash fields on Workspace/Page; `data` payload on Content; `workspaceId`/`createdBy` on Page; Message supports Manager or Employee senders).
- Rewrote the Building Plan into 10 phases (0–9), each independently testable/deployable. Split "AI assistant + MCP tools" into two phases per the MVP instruction to defer tool-calling.

**Phase 0 — Foundation & Manager Auth (implemented, on branch `feature/manager-auth`):**

- Project scaffolding: `mongoose`, `bcrypt`, `jose`, `ioredis`, `react-toastify`, `@getbrevo/brevo`, `lucide-react` installed. `.gitignore` fixed (it previously blanket-ignored `.env*`, which would have excluded `.env.example` too). `.env.example` added with `MONGODB_URI`, `JWT_SECRET`, `REDIS_URL`, `BREVO_API_KEY`, `BREVO_SENDER_EMAIL`.
- `Organization` and `Manager` models (`src/models/`).
- Manager register/login/logout, session cookie via JWT (`jose`), `GET /api/auth/me` (`src/app/api/auth/`).
- Forgot-password via Redis-backed rate-limited OTP + Brevo email (`src/lib/otp.ts`, `src/lib/email.ts`).
- Route protection for `/dashboard` via `src/proxy.ts` — **note:** Next.js 16 deprecated the `middleware.ts` file convention in favor of `proxy.ts` (function must be named `proxy`, not `middleware`); this was caught live from the dev server's own deprecation warning, not assumed from training data.
- Landing page, login/register/forgot-password pages, placeholder dashboard, hand-rolled dark/light theme (no added theme library), Navbar.
- `npm run lint` and `npx tsc --noEmit` both clean.

## Testing status (important caveat)

- Verified via `curl` against the dev server: landing/login/register/forgot-password pages render with the expected form fields; unauthenticated `GET /dashboard` returns a 307 to `/login`; no server errors in the dev log.
- **Not verified end-to-end**: actual register/login/OTP submissions against a real database. This sandbox has no local MongoDB or Redis (checked — neither is installed, no ports open), and per CLAUDE.md I should not create `.env.local` with placeholder secrets myself; you're providing real credentials. No headless browser tooling (chromium-cli/Playwright) was available either, so the theme toggle's click behavior and full form-submit flows are untested beyond code review and the static/redirect checks above.
- **Once you provide a real `.env.local`** (Mongo URI, Redis URL, Brevo key), the full flow (register → auto-login → dashboard → logout; forgot-password → OTP email → reset; resend cooldown; lockout after 5 wrong OTPs) should be smoke-tested before merging.

## Next

- Get Phase 0 reviewed/merged (branch `feature/manager-auth` pushed, PR pending).
- Design Phase 1: Workspace CRUD (manager-only) + `WorkspaceMember` schema + plan member-limit enforcement.
- Design Phase 2: Employee invitation (`Invitation` schema + Brevo) + Google/GitHub OAuth + auto-assign to workspace on accept.
