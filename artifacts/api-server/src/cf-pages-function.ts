/**
 * Cloudflare Pages Function entry point
 *
 * Wraps the existing Express app with serverless-http so it runs inside a
 * Cloudflare Pages Function (Workers runtime with nodejs_compat).
 *
 * Environment variables are read from the Cloudflare Pages dashboard:
 *   Settings → Environment variables
 *
 * Required vars:
 *   DATABASE_URL   — Neon connection string (postgresql://...)
 *   SESSION_SECRET — Random 64-char hex string (openssl rand -hex 64)
 *
 * Optional vars:
 *   ALLOWED_ORIGIN — Your Pages domain (e.g. https://vjetstar.pages.dev)
 *   RESEND_API_KEY — For email features
 */
import serverless from "serverless-http";
import app from "./app";
import { initDb } from "./lib/init-db";

// Initialise the DB once per Worker isolate lifetime
const initPromise = initDb();
// Create the handler once — reused across all requests in this isolate
const handler = serverless(app);

export async function onRequest(context: {
  request: Request;
  env: Record<string, string>;
  waitUntil: (p: Promise<unknown>) => void;
}): Promise<Response> {
  await initPromise;
  // serverless-http detects the Fetch API request and returns a Response
  return handler(context.request, context.env, context) as Promise<Response>;
}
