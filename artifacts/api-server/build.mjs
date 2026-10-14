import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build as esbuild } from "esbuild";
import esbuildPluginPino from "esbuild-plugin-pino";
import { rm } from "node:fs/promises";

// Plugins (e.g. 'esbuild-plugin-pino') may use `require` to resolve dependencies
globalThis.require = createRequire(import.meta.url);

const artifactDir = path.dirname(fileURLToPath(import.meta.url));

const banner = {
  js: `import { createRequire as __bannerCrReq } from 'node:module';
import __bannerPath from 'node:path';
import __bannerUrl from 'node:url';

globalThis.require = __bannerCrReq(import.meta.url);
globalThis.__filename = __bannerUrl.fileURLToPath(import.meta.url);
globalThis.__dirname = __bannerPath.dirname(globalThis.__filename);
  `,
};

const commonExternals = [
  "*.node",
  "sharp",
  "better-sqlite3",
  "sqlite3",
  "canvas",
  "bcrypt",
  "argon2",
  "fsevents",
  "re2",
  "farmhash",
  "xxhash-addon",
  "bufferutil",
  "utf-8-validate",
  "ssh2",
  "cpu-features",
  "dtrace-provider",
  "isolated-vm",
  "lightningcss",
  "pg-native",
  "oracledb",
  "mongodb-client-encryption",
  "handlebars",
  "knex",
  "typeorm",
  "protobufjs",
  "onnxruntime-node",
  "@tensorflow/*",
  "@prisma/client",
  "@mikro-orm/*",
  "@grpc/*",
  "@swc/*",
  "@aws-sdk/*",
  "@azure/*",
  "@opentelemetry/*",
  "@google-cloud/*",
  "@google/*",
  "googleapis",
  "firebase-admin",
  "@parcel/watcher",
  "@sentry/profiling-node",
  "@tree-sitter/*",
  "aws-sdk",
  "classic-level",
  "dd-trace",
  "ffi-napi",
  "grpc",
  "hiredis",
  "kerberos",
  "leveldown",
  "miniflare",
  "mysql2",
  "newrelic",
  "odbc",
  "piscina",
  "realm",
  "ref-napi",
  "rocksdb",
  "sass-embedded",
  "sequelize",
  "serialport",
  "snappy",
  "tinypool",
  "usb",
  "workerd",
  "wrangler",
  "zeromq",
  "zeromq-prebuilt",
  "playwright",
  "puppeteer",
  "puppeteer-core",
  "electron",
];

async function buildAll() {
  const distDir = path.resolve(artifactDir, "dist");
  await rm(distDir, { recursive: true, force: true });

  // Regular server build (Replit / any long-running process)
  await esbuild({
    entryPoints: [path.resolve(artifactDir, "src/index.ts")],
    platform: "node",
    bundle: true,
    format: "esm",
    outdir: distDir,
    outExtension: { ".js": ".mjs" },
    logLevel: "info",
    external: [...commonExternals, "nodemailer"],
    sourcemap: "linked",
    plugins: [esbuildPluginPino({ transports: ["pino-pretty"] })],
    banner,
  });

  // Vercel serverless function bundle
  // Outputs to /api/index.mjs — Vercel auto-discovers functions in the /api directory.
  // outdir is required (not outfile) because the pino plugin emits worker side-files.
  const vercelApiDir = path.resolve(artifactDir, "../../api");
  await esbuild({
    entryPoints: { index: path.resolve(artifactDir, "src/api.ts") },
    platform: "node",
    bundle: true,
    format: "esm",
    outdir: vercelApiDir,
    outExtension: { ".js": ".mjs" },
    logLevel: "info",
    // nodemailer is intentionally bundled (pure JS, needed in serverless)
    external: commonExternals,
    sourcemap: false,
    // No pino-pretty transport in serverless — plain JSON to stdout
    plugins: [esbuildPluginPino({ transports: [] })],
    banner,
  });

  // ─── Cloudflare Pages Function bundle ────────────────────────────────────
  // Outputs to functions/api/[[path]].js (Cloudflare Pages Function).
  // This file is used as-is by Cloudflare Pages — no re-bundling needed.
  //
  // Requires: nodejs_compat compatibility flag (set in wrangler.toml).
  // Node.js built-ins (http, crypto, etc.) are left as external — CF Workers
  // provides them via nodejs_compat.
  const cfFunctionDir = path.resolve(artifactDir, "../../functions/api");
  await esbuild({
    entryPoints: { "[[path]]": path.resolve(artifactDir, "src/cf-pages-function.ts") },
    platform: "node",
    bundle: true,
    format: "esm",
    outdir: cfFunctionDir,
    outExtension: { ".js": ".js" },
    logLevel: "info",
    // nodemailer is bundled (pure JS); pg is excluded (replaced by @neondatabase/serverless)
    external: [...commonExternals, "pg", "pg-native"],
    sourcemap: false,
    plugins: [esbuildPluginPino({ transports: [] })],
    banner,
    // Ensure we don't accidentally bundle native addons
    conditions: ["worker", "browser", "module"],
  });
}

buildAll().catch((err) => {
  console.error(err);
  process.exit(1);
});
