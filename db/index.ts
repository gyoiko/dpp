import { mkdirSync } from "node:fs";
import path from "node:path";
import { drizzle as drizzleD1 } from "drizzle-orm/d1";
import type { BaseSQLiteDatabase } from "drizzle-orm/sqlite-core";
import * as schema from "./schema";

export type AppDb = BaseSQLiteDatabase<"async", unknown, typeof schema>;

type D1Binding = Parameters<typeof drizzleD1>[0];

type SqliteHandle = {
  pragma(statement: string): unknown;
};

let cachedDb: Promise<AppDb> | null = null;

export function getDb(): Promise<AppDb> {
  if (!cachedDb) {
    cachedDb = resolveDb().catch((error: unknown) => {
      cachedDb = null;
      throw error;
    });
  }

  return cachedDb;
}

async function resolveDb(): Promise<AppDb> {
  const binding = await getD1Binding();

  if (binding) {
    return drizzleD1(binding, { schema }) as unknown as AppDb;
  }

  return createNodeDb();
}

async function getD1Binding(): Promise<D1Binding | null> {
  try {
    const workers = await import("cloudflare:workers");
    const binding = workers.env?.DB;
    return (binding as D1Binding | undefined) ?? null;
  } catch {
    return null;
  }
}

async function createNodeDb(): Promise<AppDb> {
  const { createRequire } = await import("node:module");
  const nodeRequire = createRequire(import.meta.url);

  const Database = nodeRequire("better-sqlite3") as new (file: string) => SqliteHandle;
  const { drizzle: drizzleSqlite } = nodeRequire("drizzle-orm/better-sqlite3") as {
    drizzle: (client: SqliteHandle, config: { schema: typeof schema }) => unknown;
  };

  const file =
    process.env.DPP_SQLITE_PATH?.trim() || path.join(process.cwd(), "data", "dpp.sqlite");
  mkdirSync(path.dirname(file), { recursive: true });

  const sqlite = new Database(file);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");

  return drizzleSqlite(sqlite, { schema }) as AppDb;
}
