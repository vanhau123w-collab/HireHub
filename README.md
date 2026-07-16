# HireHub

### A production-minded, multi-company recruitment platform

HireHub connects candidates, hiring teams, and platform operators in one end-to-end recruitment workflow. It is a full-stack portfolio project designed to demonstrate product thinking, frontend engineering, backend architecture, security, background processing, and deployment readiness—not just a collection of dashboard screens.

> Discover a role → apply with a resume → move through the ATS pipeline → schedule an interview → submit a scorecard → receive and accept an offer.

## Highlights

- Three complete portals: Candidate, Recruiter, and Platform Admin.
- Multi-company data model with tenant-scoped access control.
- Versioned ATS pipeline with audited stage transitions and bulk actions.
- Resume upload and PDF extraction through S3-compatible storage and workers.
- Explainable candidate matching with deterministic fallback.
- Realtime messages and query updates through Socket.IO.
- Vietnamese and English interfaces, light/dark themes, and responsive layouts.
- PostgreSQL, Redis/BullMQ, MinIO, Mailpit, and Stripe test-mode integrations.
- Automated unit, integration, accessibility, and Playwright E2E tests.

## Demo accounts

| Portal                    | Email                  | Password    |
| ------------------------- | ---------------------- | ----------- |
| Candidate                 | `candidate@hirehub.vn` | `Demo1234!` |
| Recruiter / Company Admin | `recruiter@hirehub.vn` | `Demo1234!` |
| Platform Admin            | `admin@hirehub.vn`     | `Demo1234!` |

The demo buttons use the API when local infrastructure is available. If it is offline, HireHub switches to an explicitly labeled browser demo adapter so reviewers can still explore the interface.

## Product experience

### Candidate portal

- Search, filter, sort, and save published jobs.
- Review job and company details.
- Maintain personal information, skills, work experience, and education.
- Upload and manage multiple PDF resumes.
- Apply with a selected resume, cover letter, and screening answers.
- Follow application stage history and notifications.
- Confirm interviews or request a new schedule.
- Accept or decline offers.
- Export personal data or soft-delete the account.

### Recruiter workspace

- Monitor active jobs, applicants, interviews, funnel conversion, and time-to-hire.
- Create, preview, publish, pause, close, and duplicate jobs.
- Configure screening questions and pipeline stages.
- Manage candidates through a versioned drag-and-drop ATS Kanban.
- Perform bulk move, reject, tag, and recruiter assignment actions.
- Review resumes, application history, notes, tags, and structured profiles.
- Schedule interviews and complete structured scorecards.
- Send offers and communicate through application conversations.
- Inspect explainable match scores, evidence, matched skills, and missing skills.
- Manage members, permissions, company settings, templates, and billing.

### Platform administration

- Inspect users, companies, active jobs, applications, subscriptions, and failed worker jobs.
- Verify, suspend, and restore companies.
- Suspend and restore users while revoking their active sessions.
- Moderate job posts.
- Review an immutable audit trail of administrative actions.

## Architecture

```text
┌──────────────────────────────────────────────────────────────────┐
│                        React web application                     │
│  Candidate portal  │  Recruiter workspace  │  Platform admin    │
└───────────────────────────────┬──────────────────────────────────┘
                                │ REST + Socket.IO
┌───────────────────────────────▼──────────────────────────────────┐
│                           NestJS API                             │
│ Auth │ RBAC │ Tenant scope │ Jobs │ Applications │ Billing      │
└───────────────┬──────────────────────────┬───────────────────────┘
                │                          │
       ┌────────▼────────┐        ┌────────▼────────┐
       │ PostgreSQL      │        │ Redis / BullMQ  │
       │ Prisma ORM      │        │ background jobs│
       └─────────────────┘        └────────┬────────┘
                                          │
                                 ┌────────▼────────┐
                                 │ Worker service │
                                 │ CV │ AI │ Email│
                                 └───────┬─────────┘
                                         │
                              MinIO / S3 │ Mailpit / SMTP
```

### Monorepo structure

```text
apps/
  web/       React 19, Vite, Mantine, TanStack Query, Zustand, i18next
  api/       NestJS REST API, Swagger, Prisma, PostgreSQL, Socket.IO
  worker/    BullMQ workers for resumes, matching, email, and reports
packages/
  shared/    Zod schemas, permissions, contracts, constants, utilities
```

## Technology stack

| Area                  | Technology                                                        |
| --------------------- | ----------------------------------------------------------------- |
| Frontend              | React, TypeScript, Vite, React Router, Mantine, Framer Motion     |
| Client state          | TanStack Query, Zustand, React Hook Form, Zod                     |
| Backend               | NestJS, TypeScript, Swagger, Socket.IO                            |
| Data                  | PostgreSQL, Prisma                                                |
| Background processing | Redis, BullMQ                                                     |
| File storage          | MinIO locally, S3-compatible storage in production                |
| Authentication        | JWT access tokens, rotating refresh cookies, Argon2, Google OAuth |
| Billing               | Stripe test mode                                                  |
| Testing               | Vitest, Playwright, Axe accessibility checks                      |
| Delivery              | Docker, Nginx, GitHub Actions, Railway configuration              |

## Run locally

### Requirements

- Node.js 20 or newer
- npm 10 or newer
- Docker Desktop

### Setup

```bash
git clone <your-repository-url>
cd hirehub
cp .env.example .env
npm install
docker compose up -d
npm run db:generate
npm run db:deploy
npm run db:seed
npm run dev
```

Open the services at:

| Service         | URL                              |
| --------------- | -------------------------------- |
| Web application | `http://localhost:5173`          |
| REST API        | `http://localhost:4000/api`      |
| Swagger         | `http://localhost:4000/api/docs` |
| Mailpit         | `http://localhost:8025`          |
| MinIO console   | `http://localhost:9001`          |

To review only the interface without Docker:

```bash
npm run dev -w @hirehub/web
```

The browser demo adapter remains available, while API-backed actions indicate that infrastructure is required.

## Useful commands

```bash
npm run dev                 # Start web, API, and worker
npm run lint                # Check formatting
npm run typecheck           # Type-check every workspace
npm test                    # Run unit and available integration tests
npm run build               # Create all production builds
npm run test:e2e            # Run desktop and mobile Playwright tests
npm run test:e2e:desktop    # Run the desktop E2E project
npm run db:generate         # Generate the Prisma client
npm run db:deploy           # Apply committed migrations
npm run db:seed             # Seed the demo workspace
```

## API conventions

- REST base path: `/api`.
- Swagger documentation: `/api/docs`.
- Cursor-paginated responses use `{ data, pageInfo }`.
- Errors use `{ code, message, fieldErrors, requestId }`.
- Timestamps are stored in UTC and displayed using the user or company timezone.
- Candidate uploads use scoped presigned URLs and server-side object verification.
- Application stages can only change through domain services.

Main resource groups:

```text
/auth                 /users/me              /candidate-profile
/resumes              /companies             /members
/jobs                 /saved-jobs            /applications
/pipeline-stages      /candidate-notes       /tags
/interviews           /scorecards            /offers
/conversations        /notifications         /analytics
/billing              /admin                 /webhooks
```

## Security decisions

- Short-lived access tokens and rotating refresh tokens stored in HTTP-only cookies.
- Refresh tokens are hashed before database storage.
- Public registration can only create Candidate accounts.
- Every recruiter query is scoped by `companyId`.
- Platform administration is protected by a dedicated role guard and audit logging.
- Pipeline updates require an expected version to prevent lost writes.
- Auth, upload, and public-apply endpoints use Redis-backed rate limiting with an in-process fallback.
- Uploads validate MIME type, size, ownership, and object existence.
- OAuth state and Stripe webhook signatures are verified.
- Stripe webhook processing is idempotent.
- Suspending or deleting users revokes their active sessions.
- AI matching is advisory and never automatically rejects a candidate.

## Testing and quality

The repository includes:

- Unit tests for validation, matching, state stores, token refresh, adapters, and rate limiting.
- PostgreSQL integration tests for role protection, refresh-token reuse, tenant isolation, stale pipeline writes, bulk assignment, and Stripe webhook idempotency.
- Playwright scenarios for Candidate, Recruiter, and Admin workflows.
- Desktop and mobile viewport projects.
- Light/dark theme and language-switch tests.
- Automated WCAG A/AA checks using Axe.
- Production builds with route-level lazy loading and vendor chunk splitting.

GitHub Actions starts PostgreSQL, installs dependencies, generates Prisma, deploys the migration, seeds demo data, and runs lint, typecheck, tests, production builds, and desktop E2E checks.

## Local infrastructure

`docker-compose.yml` provides:

- PostgreSQL for business data.
- Redis for queues, caching, and rate limits.
- MinIO for local S3-compatible object storage.
- Mailpit for inspecting development email.

Provider adapters allow local development without production credentials. Configure real S3, SMTP, Google OAuth, Stripe, and AI provider values through environment variables when deploying.

## Deployment

Dockerfiles are included for the web, API, and worker services. Railway configuration is provided through:

```text
railway-web.json
railway.json
railway-worker.json
```

A production deployment requires managed PostgreSQL and Redis services plus the environment variables documented in `.env.example`. Stripe must remain in test mode for portfolio deployments unless billing has been formally reviewed.

## Design principles

1. **Human decision first** — matching supports recruiters but does not replace them.
2. **Every transition is traceable** — stage history, notifications, and audit records are created together.
3. **Tenant isolation by default** — company ownership is enforced in backend queries, not trusted from the client.
4. **Useful without credentials** — adapters and deterministic fallbacks keep local development practical.
5. **Accessible across devices** — semantic HTML, keyboard navigation, visible focus, responsive layouts, and reduced-motion support.

## Current scope

The portfolio release intentionally excludes real-money billing, payroll, biometric attendance, SMS delivery, and automated AI rejection. Realtime collaboration, Stripe billing, storage, email, and AI are implemented behind adapters so production providers can be connected without rewriting domain flows.

## License

This project is currently provided as a portfolio and educational project. Add an explicit license before accepting external contributions or commercial reuse.
