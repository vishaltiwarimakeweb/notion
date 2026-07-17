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

**Phase 1 — Workspace CRUD (implemented, on branch `feature/workspace-crud`, branched off `feature/manager-auth`):**

- `Workspace` model (`organizationId`, `title` minlength 6, `isDeleted`/`deletedAt` for trash) and `WorkspaceMember` model (schema only for now — stays empty until Phase 2 adds Employees; `employeeId` refs an `Employee` model that doesn't exist yet, which is fine, `ref` is just a string).
- Manager-only, org-scoped CRUD: `POST/GET /api/workspaces`, `GET /api/workspaces/trash`, `GET/PATCH/DELETE /api/workspaces/[id]`. `DELETE` soft-deletes; restore is `PATCH { isDeleted: false }` rather than a separate route.
- Cross-org access returns 404 (not 403) to avoid confirming another org's resource exists.
- Dashboard now lists real workspaces + a create form; new workspace detail page (`/dashboard/workspaces/[id]`) handles rename/delete; new trash page (`/dashboard/trash`) handles restore. Member counts are intentionally not shown yet (see NOTES.md — no real data to display until Phase 2).
- `npm run lint` and `npx tsc --noEmit` both clean.
- Live-tested end-to-end against real Mongo: validation (short title → 400), full CRUD + trash/restore cycle, two-manager cross-org isolation (404 on both the API and the page route), invalid-ObjectId handling (404 not 500), unauthenticated access (401). Test data cleaned up afterward.

**Phase 2 — Employee Invitation & OAuth (implemented, on branch `feature/employee-invitation`, branched off `feature/workspace-crud`):**

- `Employee` and `Invitation` models; `src/lib/billing.ts` (`getMemberLimit`) — the member-limit check deferred from Phase 1 now has a real caller.
- **Session system generalized**: `SessionPayload` changed from `{managerId,...}` to `{userId, userType: "manager"|"employee", ...}`. `getCurrentManager()` behaves identically to before; added `getCurrentEmployee()`. Only 4 files needed the rename (`session.ts`, `auth.ts`, register/login routes) — confirmed by grep before touching anything.
- **OAuth implemented manually** (no Auth.js/NextAuth) — reuses the existing `jose`-based session system instead of running two parallel auth systems. Authorization-code flow for Google + GitHub; CSRF `state` is a short-lived signed JWT carrying `{provider, inviteToken}`, so no extra cookie/Redis entry is needed for it.
- Manager invite flow: `POST /api/workspaces/[id]/invite` — checks the plan's member limit, skips straight to a `WorkspaceMember` if the email is already an Employee in the org (per spec, no re-invite needed), otherwise creates an `Invitation` and emails a link via Brevo (`sendInvitationEmail` in `src/lib/email.ts`).
- `/invite/[token]` public page + `GET /api/oauth/[provider]/start` and `GET /api/oauth/[provider]/callback` — callback verifies the OAuth-returned email matches the invitation's email before creating anything (closes an obvious "redeem someone else's invite" hole that wasn't explicit in the spec but is a clear security gap otherwise), re-checks the member limit defensively, finds-or-creates the `Employee`, creates the `WorkspaceMember`, marks the invitation accepted, and signs the employee in.
- Dashboard, workspace detail page, and Navbar are now session-type-aware: a Manager sees the full org view; an Employee sees only their assigned workspaces, read-only (no create/rename/delete controls), and the Navbar correctly shows "Dashboard/Log out" for either session type instead of only Managers.
- **Scope trim** (see NOTES.md): manager-initiated unassign, employee self-unassign, and a workspace member-list view are deferred to a fast-follow — this phase is invite-and-accept only, matching what the roadmap actually committed Phase 2 to.
- `npm run lint` and `npx tsc --noEmit` both clean.
- Live-tested against real Mongo/Redis/Brevo: invite validation, real invitation-email send, the existing-employee direct-assign shortcut, member-limit enforcement (seeded to the Free plan's 2-member cap and confirmed the 3rd invite is rejected, and that an already-a-member invite is rejected), cross-org protection on the invite endpoint (404), and a full regression pass of every Phase 0/1 endpoint to confirm the session field rename didn't break anything. Test data cleaned up afterward.
- **Not live-testable here**: the actual OAuth code exchange needs real `GOOGLE_CLIENT_ID/SECRET` and `GITHUB_CLIENT_ID/SECRET` (not yet in `.env.local`). Confirmed the code path is correct up to that boundary — hitting `/api/oauth/google/start` currently 500s with a clear `GOOGLE_CLIENT_ID is not set` error, which is the expected/documented state, not a bug.

**Phase 3 — Page CRUD, Blocknote Content, Trash, Favorites (implemented, on branch `feature/page-crud`, branched off `feature/employee-invitation`):**

- **Two schema corrections vs. what `docs/PRE_BUILD_PLAN.md` had before this phase** (both driven by actually checking Blocknote's current docs instead of assuming — see NOTES.md):
  - `Content`: one document per *page* holding the whole Blocknote `blocks` array (`editor.document`), not one document per *block* linked via `prevContent`/`nextContent`. Blocknote already gives independent block editing/deletion natively; the linked-list design would have fought the library for no benefit.
  - `Page`: `parentPageId` (general tree, any number of children) replaces `nextPage` (a singly-linked chain, one child per page) — matches the spec's "nested pages **in** a page" (plural) and the React.js → Hooks → useEffect example.
  - `Favorite` generalized from `employeeId`-only to `{userId, userType}`, same pattern as `Message`, so Managers can favorite pages too.
- `@blocknote/shadcn` chosen over `@blocknote/mantine` for the editor UI — peer-depends on Tailwind v4 directly and bundles Radix + the already-used `lucide-react`, instead of adding a whole second component framework.
- Page CRUD is manager-**and**-employee accessible (not employee-only as the spec's wording might suggest) — extended `src/lib/workspaces.ts`'s `getOwnedWorkspace` with `getAccessibleWorkspace(id, session)`, and added `src/lib/pages.ts`'s `getAccessiblePage`/`getPageForMutation` on top of it.
- Soft-delete **cascades** to all descendant pages (an un-cascaded delete would leave orphaned-but-accessible children under a trashed, inaccessible parent); restore does **not** cascade back — documented limitation, not solved now.
- Content autosave: `PUT /api/pages/[id]/content` replaces the whole `blocks` array, debounced ~1s client-side after the last edit (`src/components/PageEditor.tsx`).
- Page trash is per-workspace (`/dashboard/workspaces/[id]/trash`), reachable by manager or member employee — distinct from the existing manager-only global `/dashboard/trash` (workspaces only).
- **Real bug caught during live testing, not just code review**: `useCreateBlockNote` touches `window` during render and isn't SSR-safe — visiting the page editor route 500'd with `ReferenceError: window is not defined` even though lint/typecheck were clean. Fixed with `src/components/PageEditorClient.tsx`, a client-only wrapper using `next/dynamic(..., { ssr: false })` (can't use `ssr:false` directly in the Server Component page file — that's a Next.js App Router restriction — hence the separate wrapper).
- `npm run lint` and `npx tsc --noEmit` both clean.
- Live-tested against real Mongo: page CRUD + validation, 3-level nesting (recreated the spec's own React.js → Hooks → useEffect example), cascade soft-delete + trash listing + non-cascading restore, content save/read-back, favorite toggle, rename, manager cross-org denial (404), and employee access scoping — seeded a real `Employee` + `WorkspaceMember` and hand-signed a matching session JWT (same `jose` signing this app already uses) to verify an employee can access pages in their assigned workspace and gets 404 everywhere else, since OAuth credentials still aren't configured. After the SSR fix, also confirmed the page editor route itself renders (200, `Nested pages` section present) — full editor interaction (typing, toolbar) still isn't click-testable, no headless browser tooling in this sandbox. Test data cleaned up afterward.

## Next

- Push branches `feature/manager-auth`, `feature/workspace-crud`, `feature/employee-invitation`, and `feature/page-crud` (still blocked — no GitHub credentials in this sandbox) and open PRs.
- Once you have Google/GitHub OAuth app credentials (each needs `http://localhost:3000/api/oauth/<provider>/callback` allow-listed as a redirect URI), add them to `.env.local` so the full employee sign-in flow can be live-tested end-to-end.
- Design Phase 4: real-time collaboration via WebSockets — needs a Yjs document per page (Blocknote requires this for collab; plain JSON won't work) and a Yjs-compatible provider (`y-websocket` or Hocuspocus, self-hosted), bootstrapped from each page's existing `Content.blocks` the first time it's opened collaboratively.
