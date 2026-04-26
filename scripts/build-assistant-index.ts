/**
 * Build the assistant RAG index from the command line.
 *
 *   pnpm dlx tsx scripts/build-assistant-index.ts
 *
 * Idempotent. Run after publishing new blogs / courses / episodes,
 * or after editing an existing one. The same logic runs server-side
 * via /api/admin/reindex-assistant (cron + Supabase webhook); this
 * script is the local dev / one-off path.
 *
 * Environment required (loaded from .env):
 *   • SUPABASE_URL + SUPABASE_SECRET_KEY  (or SUPABASE_SERVICE_ROLE_KEY)
 *   • GEMINI_API_KEY
 */
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { GoogleGenAI } from "@google/genai";

import { indexAll } from "../lib/assistant/index-builder";

const ROOT = process.cwd();

async function loadDotEnv() {
  try {
    const raw = await readFile(join(ROOT, ".env"), "utf8");
    for (const rawLine of raw.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) continue;
      const eq = line.indexOf("=");
      if (eq < 0) continue;
      const key = line.slice(0, eq).trim();
      let val = line.slice(eq + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      if (process.env[key] === undefined) process.env[key] = val;
    }
  } catch {
    // No .env — assume env is set externally (CI, prod).
  }
}

async function main() {
  await loadDotEnv();

  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error("[indexer] SUPABASE_URL + SUPABASE_SECRET_KEY required");
    process.exit(1);
  }
  if (!geminiKey) {
    console.error("[indexer] GEMINI_API_KEY required");
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const gemini = new GoogleGenAI({ apiKey: geminiKey });

  const result = await indexAll(supabase, gemini, (msg) => console.log(msg));

  console.log("");
  console.log("┌──────────────────────────────────────");
  console.log(`│ sources              : ${result.sources}`);
  console.log(`│ chunks indexed       : ${result.chunks}`);
  console.log(`│ stale sources dropped: ${result.staleSourcesDropped}`);
  console.log("└──────────────────────────────────────");
}

void main();
