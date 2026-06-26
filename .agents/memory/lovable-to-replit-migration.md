---
name: Lovable → Replit migration (VerifyPro)
description: Where Lovable-managed services were replaced by Replit-native ones, and the non-obvious Supabase config that bites after migration.
---

# Lovable → Replit migration notes

This app (VerifyPro) was imported from Lovable.dev. The goal was to remove every
Lovable-managed dependency and run fully on Replit + the user's own Supabase.

## AI notes generation: Lovable AI gateway → Replit Gemini integration
- The "Generate Notes" feature originally called Lovable's AI gateway
  (`https://ai.gateway.lovable.dev/v1`) via an OpenAI-compatible provider, gated on
  a `LOVABLE_API_KEY` the user no longer has.
- Replaced with Replit's **managed Gemini AI integration** (blueprint
  `javascript_gemini_ai_integrations`). Uses `@google/genai` `GoogleGenAI` client
  with the auto-injected `AI_INTEGRATIONS_GEMINI_API_KEY` +
  `AI_INTEGRATIONS_GEMINI_BASE_URL` env vars (must pass `httpOptions.apiVersion: ""`).
  No user API key; billed to Replit credits.
- **Why:** Replit's `external_apis` skill has no general LLM/chat connector, and we
  wanted zero-friction (no user key). The managed Gemini integration is the closest
  drop-in for the Lovable gateway and keeps a Gemini model.
- **How to apply:** When you hit any remaining `LOVABLE_*` reference or lovable
  gateway/import, replace it with a Replit-native equivalent rather than asking the
  user for a Lovable credential.
- The blueprint stages Express/Drizzle chat+image scaffolding under
  `.replit_integration_files/`. This app is TanStack Start + Supabase, so that
  scaffolding is NOT used — only the Gemini env vars matter. Don't wire those files in.

## Supabase Site URL gotcha (email confirmation)
- New Supabase project has email confirmation ENABLED. Confirmation links use the
  project's **Site URL** (Auth → URL Configuration), which defaults to
  `http://localhost:3000` → users see "localhost refused to connect".
- Fix is user-side: set Site URL to the Replit dev (and later prod) URL.
- `@example.com` signups are rejected; use a real domain (gmail.com) for tests.
