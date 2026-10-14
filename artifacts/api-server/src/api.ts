import app from "./app";
import { initDb } from "./lib/init-db";
import type { IncomingMessage, ServerResponse } from "node:http";

// Initialize the database once (the promise is reused across warm invocations)
const initPromise = initDb();

export default function handler(req: IncomingMessage, res: ServerResponse): void {
  // Ensure DB is ready, then hand off to Express
  initPromise.then(() => app(req as never, res as never)).catch(() => app(req as never, res as never));
}
