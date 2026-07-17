<!-- To keep track of what mistakes did the AI coding assistant made throughout the project and what prompts I provided everytime -->

# First Prompt :

- Read CLAUDE.md and PRE_BUILD_PLAN.md before doing anything else. We are building this application incrementally. Do not generate the entire application.1. Read and understand the project requirements.2. Review the architecture described in PRE_BUILD_PLAN.md. 3. Point out any inconsistencies, missing requirements, or architectural concerns. 4. Suggest improvements, but do not implement anything yet. 5. Once the architecture is finalized, propose a development roadmap divided into small phases, where each phase is independently testable and deployable. Do not write code in this step. Yes, don't build everything at once, start with a MVP foundation, don't create MCP tools in the first build, only make the AI answer from the knowledge base, create a recommended schema with timestamps, treat widget and the dashboard as separate surfaces, the lead capture form must appear wherethe widget is visible i.e, at the organization's webpage. Proceed with recommended & suggested setup.

# Base Prompt :

- Before making any changes:

0. Check PROGRESS.md.
1. Read CLAUDE.md.
2. Read docs/PRE_BUILD_PLAN.md.
3. Follow those documents throughout this session unless I explicitly tell you otherwise.

Acknowledge once you've finished reading them, check PROGRESS.md and continue building. Implement 3 phases at a time.

# Wrong assumption caught during pre-build review :

- The First Prompt above mentions "widget and dashboard as separate surfaces" and "a lead capture form on the organization's webpage" — those describe a public embeddable support-widget/lead-gen product, not this app (an internal Notion-style CRUD tool with an in-app AI assistant). Flagged the mismatch and asked the user to confirm scope instead of assuming; confirmed answer: AI widget stays an in-app assistant only, no public embed or lead capture.
- PRE_BUILD_PLAN.md's original schema was missing: Workspace<->Employee membership (no way to know who's assigned to which workspace), an Invitation model (invite state before the employee record exists), soft-delete fields on Workspace/Page despite "trash" being a stated requirement, a payload field on Content (had type/ordering but nothing storing the actual block value), and Favorite/RecentlyVisited models despite both being listed features. Fixed directly in PRE_BUILD_PLAN.md after user confirmed.
- Original roadmap bundled MCP tools into the same phase as the RAG assistant, conflicting with the "don't build MCP tools in the first AI build" instruction — split into two phases.

# Phase 0 implementation — corrections caught while building :

- Wrote `src/middleware.ts` following the long-standing Next.js convention (from training data). The dev server itself flagged it as deprecated: Next.js 16 renamed the convention to `src/proxy.ts`, exporting a function named `proxy` instead of `middleware` (the `config`/`matcher` export is unchanged). Caught by actually running the dev server and reading its warning, not by memory — consistent with CLAUDE.md's "always fetch the latest documentation" rule. Fixed by renaming the file and the exported function.
- Split `src/lib/auth.ts` into an Edge-safe `src/lib/session.ts` (jose + cookies only) and `src/lib/auth.ts` (adds the Mongoose-dependent `getCurrentManager()`). The proxy/middleware file runs on the Edge runtime, which can't load Mongoose — importing the combined file from `proxy.ts` would have broken at runtime even though it type-checked fine.
- `@getbrevo/brevo` v6 is a fully rewritten SDK (different from the older `SendinBlue`/v2-style `TransactionalEmailsApi` API remembered from training) — read the package's own `.d.ts` files under `node_modules` to get the real `BrevoClient`/`sendTransacEmail` shape instead of guessing.
- Mongoose model typing: `models.Manager ?? model("Manager", schema)` combined with `InferSchemaType` produced a `never`/malformed union type on reads (e.g. `Manager.findById().select()` typed as possibly an array). Fixed by declaring an explicit `IManager` interface and casting the `models.X` branch to `Model<IManager>`, which is the standard pattern for Mongoose + Next.js + TypeScript.
- No local MongoDB/Redis/Docker/chromium-cli/Playwright available in this sandbox, so Phase 0's DB-backed flows (actual register/login/OTP) could not be exercised end-to-end at first — only static rendering, the `/dashboard` redirect, lint, and typecheck were verified. Flagged explicitly in PROGRESS.md rather than claiming full verification.

# Phase 0 — live testing with real credentials :

- I had built `src/lib/redis.ts` around a single `REDIS_URL`. The user's actual Redis is Redis Cloud, provided as four separate vars (`REDIS_HOST`/`REDIS_PORT`/`REDIS_USERNAME`/`REDIS_PASSWORD`) — updated `redis.ts` to build an `ioredis` client from an options object instead of a URL, and updated `.env.example` to match. Also picked up an unrequested-but-present `BREVO_SENDER_NAME` var and wired it into `src/lib/email.ts` (was previously hardcoded to `"Notion Clone"`).
- The user's `.env.local` initially landed at `docs/.env.local` instead of the project root, so Next.js silently never loaded it (Next only auto-reads `.env.local` at the project root) — this is why credentials "didn't take effect" on the first attempt. It was still correctly gitignored either way (the `.gitignore` `.env.local` pattern matches at any depth), so no leak risk, just a wrong location. Asked before moving it since it holds live secrets; the user moved it themselves.
- With real credentials in place, did a full live test (register → login → /dashboard → logout → forgot-password → OTP request/cooldown/wrong-OTP/lockout → password actually changed, confirmed via old-password-fails/new-password-succeeds login) directly against MongoDB Atlas + Redis Cloud + Brevo, using temporary `*.tmp.mjs` scripts placed inside the project root (so they could resolve `node_modules`) to seed/read Redis state that only the (unreadable) OTP email would otherwise reveal. Deleted the test Manager/Organization and Redis keys afterward, and removed the temp scripts — didn't leave test data or scratch files behind.

# Phase 2 — Employee invitation & OAuth :

- Employee sign-in required generalizing the session system Phase 0 built manager-only (`SessionPayload.managerId` → `{userId, userType}`). Grepped for every construction/consumption site before touching it (4 files) rather than assuming — the alternative of running a second, parallel session system just for Employees would have been more code and two cookies to reason about instead of one.
- Deliberately did **not** use Auth.js/NextAuth for the Google/GitHub OAuth handshake, even though it's the conventional choice for Next.js. Retrofitting it alongside Phase 0's already-tested hand-rolled JWT/cookie system would mean either two auth systems running in parallel, or redoing already-verified Manager auth. Hand-rolled the authorization-code exchange instead (small, well-understood, exactly 2 providers) so it plugs into the existing `createSessionToken`/`setSessionCookie`.
- Added an email-match check (OAuth-returned email must equal the invitation's email) that PRE_BUILD_PLAN.md doesn't explicitly call for. Without it, anyone with a Google/GitHub account could redeem any invite link regardless of who it was sent to — flagged as a necessary security addition rather than silently assumed.
- **Scope trimmed** vs. the full "Workspaces" feature list in PRE_BUILD_PLAN.md: manager-unassign, employee self-unassign, and a workspace member-list view are *not* built in this phase. My own roadmap phrased Phase 2 as "invitation + OAuth + auto-assign on accept" only — expanding it to the full membership-management surface would have doubled the phase's size. Called out explicitly as deferred rather than silently dropped.
- Found while implementing: the Phase 1 workspace detail page hard-required a Manager session (`getCurrentManager()` → redirect `/login`), which would have locked out a newly-signed-in Employee from viewing their own assigned workspace. Not a new feature — a correctness fix so Phase 2's own output wasn't immediately broken by Phase 1 code — but worth recording since it's an example of why "session type" needs to be threaded through existing routes, not just new ones.
- Live-tested everything up to the OAuth provider boundary (invite creation/validation, existing-employee shortcut, member-limit enforcement including seeding to the Free plan's cap, cross-org protection, full Phase 0/1 regression) against real Mongo/Redis/Brevo. The actual `/api/oauth/[provider]/start` → provider → `/callback` exchange needs real `GOOGLE_CLIENT_ID/SECRET` and `GITHUB_CLIENT_ID/SECRET`, not yet in `.env.local` — confirmed the code path fails with a clear, expected error (`GOOGLE_CLIENT_ID is not set`) rather than a silent or confusing one.
