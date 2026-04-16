# SDR CRM — Workspace

## Overview

Full-stack SDR CRM application built as a pnpm monorepo. Features multi-tenant workspaces, Kanban lead management, AI-powered outreach campaigns (OpenAI), custom funnel stages, custom fields, and a metrics dashboard.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5 + Clerk Auth (`@clerk/express`)
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec in `lib/api-spec/openapi.yaml`)
- **Frontend**: React + Vite + Tailwind CSS v4 + shadcn/ui
- **Auth**: Clerk (ClerkProvider + requireAuth middleware)
- **AI**: OpenAI via `@workspace/integrations-openai-ai-server`
- **Build**: esbuild (ESM bundle for API server)

## Architecture

### Packages

| Package | Path | Purpose |
|---------|------|---------|
| `@workspace/api-server` | `artifacts/api-server` | Express API server |
| `@workspace/sdr-crm` | `artifacts/sdr-crm` | React frontend (Vite) |
| `@workspace/db` | `lib/db` | Drizzle schema + DB client |
| `@workspace/api-spec` | `lib/api-spec` | OpenAPI spec + Orval codegen |
| `@workspace/api-client-react` | `lib/api-client-react` | Generated React Query hooks |
| `@workspace/api-zod` | `lib/api-zod` | Generated Zod validators |

### Database Schema

Tables: `workspaces`, `funnelStages`, `customFields`, `leads`, `campaigns`, `generatedMessages`, `activityEvents`

Default funnel stages seeded on workspace creation:
- `base`, `lead-mapeado`, `tentando-contato`, `conexao-iniciada`, `desqualificado`, `qualificado`, `reuniao-agendada`

### Key Business Logic

- **Send message flow**: marks message as sent, moves lead to `tentando-contato` stage
- **Trigger stages**: campaigns with `triggerStage` auto-generate messages when leads enter that stage
- **Stage validation**: some stages may require fields; 422 + `{ error, missingFields }` returned on violation
- **AI generation**: uses `gpt-4o-mini` with `response_format: json_object`

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)

## Important Notes

- After any Orval codegen run, check `lib/api-zod/src/index.ts` — it may be overwritten. It must only contain: `export * from "./generated/api";`
- The API server uses Clerk JWT auth on all `/api/workspaces/*` routes via `requireAuth` middleware
- Frontend uses `VITE_CLERK_PUBLISHABLE_KEY` and `VITE_CLERK_PROXY_URL` env vars
- Workspace ID stored in `localStorage` key `sdr_workspace_id`

## Supabase Integration

- **Project URL**: `https://gwbqtuxpvuvvqxdizhpq.supabase.co`
- **Anon key**: stored in `SUPABASE_ANON_KEY` secret + `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` env vars
- **Service role key**: stored in `SUPABASE_SERVICE_ROLE_KEY` secret
- **Database**: `SUPABASE_DATABASE_URL` env var (Supabase Postgres pooler, port 6543)
- **Client helpers**:
  - Server-side (service role): `artifacts/api-server/src/lib/supabase.ts`
  - Frontend (anon key): `artifacts/sdr-crm/src/lib/supabase.ts`
- **Schema**: `supabase/schema.sql` — run in Supabase Dashboard → SQL Editor to create all tables
- **Edge Functions** (deploy via Supabase CLI: `supabase functions deploy`):
  - `supabase/functions/generate-message/` — AI message generation
  - `supabase/functions/send-message/` — mark message sent + move lead stage

### Applying the Schema
Because Replit's sandbox cannot reach Supabase's direct Postgres host, run `supabase/schema.sql` manually in your Supabase Dashboard → SQL Editor. After that, set `SUPABASE_DATABASE_URL` to the session pooler URL and the API server will connect via `lib/db`.

## Workflows

- `artifacts/api-server: API Server` — runs Express API on port from `PORT` env
- `artifacts/sdr-crm: web` — runs Vite dev server for React frontend
