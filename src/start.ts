import { createStart, createMiddleware } from "@tanstack/react-start";

import { renderErrorPage } from "./lib/error-page";
import { attachSupabaseAuth } from "@/integrations/supabase/auth-attacher";

// Node.js < 22 ships without a global WebSocket. supabase-js eagerly
// instantiates a Realtime client inside createClient(), which throws when no
// WebSocket implementation is present. The SSR/server-function runtime here is
// Node 20, so we polyfill globalThis.WebSocket with the `ws` package before any
// Supabase client is created. Browsers and Node 22+ already have it natively.
async function ensureServerWebSocket() {
  const g = globalThis as { WebSocket?: unknown };
  if (typeof g.WebSocket === "undefined") {
    const ws = await import("ws");
    g.WebSocket = (ws as { WebSocket?: unknown; default?: unknown }).WebSocket ?? ws.default;
  }
}

// Runs server-side for every server function (the authenticated DB path) before
// per-function middleware such as requireSupabaseAuth creates a Supabase client.
const ensureWebSocketFnMiddleware = createMiddleware({ type: "function" }).server(
  async ({ next }) => {
    await ensureServerWebSocket();
    return next();
  },
);

// Runs server-side for every request so SSR that touches a Supabase client is
// also covered.
const ensureWebSocketRequestMiddleware = createMiddleware().server(async ({ next }) => {
  await ensureServerWebSocket();
  return next();
});

const errorMiddleware = createMiddleware().server(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    if (error != null && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    console.error(error);
    return new Response(renderErrorPage(), {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
});

export const startInstance = createStart(() => ({
  functionMiddleware: [ensureWebSocketFnMiddleware, attachSupabaseAuth],
  requestMiddleware: [ensureWebSocketRequestMiddleware, errorMiddleware],
}));
