// Default URL for the deployed Replit API server.
// Override by setting REPLIT_API_URL in Netlify → Site settings → Environment variables.
const DEFAULT_API_URL = "https://workspace--aussieaviationb.replit.app";

export default async (request) => {
  const replitApiUrl =
    (Netlify.env.get("REPLIT_API_URL") || DEFAULT_API_URL).replace(/\/$/, "");

  const url = new URL(request.url);
  const targetUrl = replitApiUrl + url.pathname + url.search;

  const headers = new Headers(request.headers);
  headers.set("host", new URL(replitApiUrl).host);
  headers.delete("connection");

  const hasBody = !["GET", "HEAD"].includes(request.method);

  const upstream = await fetch(targetUrl, {
    method: request.method,
    headers,
    body: hasBody ? await request.arrayBuffer() : undefined,
  });

  return upstream;
};

export const config = { path: "/api/*" };
