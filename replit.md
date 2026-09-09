# VerifyPro on Replit

## Run

The **Start application** workflow runs:

```sh
bun run dev
```

The Vite/TanStack Start app listens on `0.0.0.0:5000` for Replit Preview.

## Required secrets

- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SESSION_SECRET`

## Optional features

- `GEMINI_API_KEY` enables the Gemini-powered notes feature. The rest of the app can start without it.

## Checks

```sh
bun run build
bun run lint
```