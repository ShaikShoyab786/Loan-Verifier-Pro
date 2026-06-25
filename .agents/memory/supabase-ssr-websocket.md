---
name: Supabase server client needs WebSocket polyfill under Node <22
description: Why server functions/SSR using supabase-js fail with a WebSocket error, and how it's fixed here
---

# Supabase createClient throws under Node <22 in TanStack Start SSR/server-fns

**Symptom:** authenticated server functions (e.g. the cloud case sync) fail and the
UI shows a generic error like "Failed to sync your cases from the cloud", even though
the same Supabase code works when tested under bun.

**Root cause:** the dev/SSR server-function runtime here is **Node 20**, which has no
global `WebSocket`. `@supabase/supabase-js` `createClient()` eagerly constructs a
RealtimeClient in its constructor, which throws:
`"Node.js 20 detected without native WebSocket support"`. The auth middleware
(`src/integrations/supabase/auth-middleware.ts`) calls `createClient` per request, so
every authenticated server fn 500s. Bun has native WebSocket, so isolated bun tests
mislead you into thinking the backend is fine.

**Fix:** `ws` is installed and `src/start.ts` polyfills `globalThis.WebSocket` via a
dynamic `import("ws")` (so it never enters the client bundle), wired as BOTH a
server `functionMiddleware` (covers server functions) and a `requestMiddleware`
(covers SSR), running before any Supabase client is created.

**Why:** the polyfill must run server-side before `createClient`. Function middleware
covers the server-fn path; request middleware covers SSR that touches a Supabase client.

**How to apply:** if you upgrade the runtime to Node 22+ (native WebSocket) you can drop
the polyfill. Reproduce the real server-fn error by calling the live endpoint
`/_serverFn/<base64-id>` with header `x-tsr-serverFn: true` and a valid Bearer token —
NOT by running supabase-js under bash/bun, which hides the WebSocket failure.

# Google OAuth on this (ex-Lovable) project
The "Continue with Google" button used `@lovable.dev/cloud-auth-js`
(`lovable.auth.signInWithOAuth`) which hits `/~oauth/initiate` — a Lovable Cloud
endpoint that 404s off Lovable. Replaced with native
`supabase.auth.signInWithOAuth({ provider: "google", ... })` in `src/routes/auth.tsx`.
It only works once the Google provider is enabled in the Supabase dashboard
(client id/secret + redirect URLs); until then Supabase returns a clean
"Unsupported provider: missing OAuth secret" error instead of a 404.
