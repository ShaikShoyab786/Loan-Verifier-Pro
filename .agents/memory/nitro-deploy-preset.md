---
name: Nitro server build for non-Replit hosts (Render etc.)
description: Why vite build emits no server outside Replit, and the one-line fix to deploy on Node hosts.
---

# Deploying this TanStack Start app outside Replit (Render, etc.)

`@lovable.dev/vite-tanstack-config` wraps the Nitro deploy plugin and **only runs
the server build when it detects a Lovable/Replit sandbox**. Outside that context
`vite build` logs:

> [@lovable.dev/vite-tanstack-config] No Lovable context detected — skipping nitro deploy plugin.

…and emits **only the client** (`dist/client/...`) — no `.output/server/index.mjs`.
So a `NITRO_PRESET=node-server` env var alone does nothing; the whole server step
is switched off.

**Fix:** in `vite.config.ts` pass an explicit nitro option to force-enable it and
pin the Node preset:

```ts
nitro: { preset: "node-server" },
```

This produces `.output/server/index.mjs`; the host start command is
`node .output/server/index.mjs`.

**Why it's safe for Replit:** inside the sandbox the wrapper *ignores* the preset
override and hard-forces `cloudflare-module` with output to `dist/` (see the
`isSandbox` branch in the wrapper). The override only takes effect on external
builds. Dev (`vite dev`/serve) is unaffected — the nitro step is build-only.

**Render setup recap:** Build `bun install && bun run build`; Start
`node .output/server/index.mjs`; env vars must include the `VITE_*` Supabase pair
(baked in at build time), the server `SUPABASE_*` trio, a real Google
`GEMINI_API_KEY` (the Replit one is Replit-managed), plus `NODE_VERSION=22`.
