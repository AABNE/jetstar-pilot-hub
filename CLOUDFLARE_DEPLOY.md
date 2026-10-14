# vJetstar — Full Cloudflare Deploy (no VPS)

## Architecture

| Layer | Service | Cost |
|-------|---------|------|
| Frontend | Cloudflare Pages (static) | Free |
| API (`/api/*`) | Cloudflare Pages Functions (Workers) | Free |
| Database | **Neon** — serverless Postgres | Free tier |

---

## 1. Create a free Neon database

1. Sign up at **https://neon.tech** (free, no card needed)
2. Create a project → name it `vjetstar`
3. Copy the connection string — it looks like:
   ```
   postgresql://neondb_owner:xxx@ep-xxx.region.aws.neon.tech/neondb?sslmode=require
   ```

---

## 2. Connect repo to Cloudflare Pages

1. Push this project to GitHub
2. Go to **https://dash.cloudflare.com** → Workers & Pages → Create → Pages → Connect Git
3. Pick your repo, then set:

   | Setting | Value |
   |---------|-------|
   | Build command | `pnpm install && pnpm --filter @workspace/api-server run build && pnpm --filter @workspace/flight-timetable run build` |
   | Build output directory | `artifacts/flight-timetable/dist/public` |
   | Node.js version | `22` |

4. **Add environment variables** (before saving):

   | Variable | Value |
   |----------|-------|
   | `DATABASE_URL` | Your Neon connection string |
   | `SESSION_SECRET` | Output of `openssl rand -hex 64` (or any 64-char random string) |
   | `ALLOWED_ORIGIN` | Your Pages URL e.g. `https://vjetstar.pages.dev` |

   > Add these to **both Production and Preview** environments.

5. Click **Save and Deploy**

---

## 3. Deploy via Wrangler CLI (alternative)

```cmd
pnpm install
pnpm --filter @workspace/api-server run build
pnpm --filter @workspace/flight-timetable run build
wrangler pages deploy artifacts/flight-timetable/dist/public --project-name vjetstar --branch main
wrangler pages secret put DATABASE_URL --project-name vjetstar
wrangler pages secret put SESSION_SECRET --project-name vjetstar
wrangler pages secret put ALLOWED_ORIGIN --project-name vjetstar
```

---

## How it works

```
Browser → Cloudflare Pages CDN
  /api/* → functions/api/[[path]].js (Pages Function / Workers runtime)
             └── Express app (serverless-http)
                 └── Neon Postgres (WebSocket/HTTPS)
  /*     → Static files (index.html for SPA)
```

The build step compiles the Express API to `functions/api/[[path]].js` using esbuild.  
Cloudflare deploys it as a Workers-runtime function alongside the static frontend.

---

## Default login

- Username: `admin`
- Password: `admin1234`
- **Change this immediately** in Admin → pilot management

The admin account is created automatically on the first request if the database is empty.
