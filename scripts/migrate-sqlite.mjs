import { mkdirSync } from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";

const file =
  process.env.DPP_SQLITE_PATH?.trim() || path.join(process.cwd(), "data", "dpp.sqlite");
mkdirSync(path.dirname(file), { recursive: true });

const sqlite = new Database(file);
sqlite.pragma("journal_mode = WAL");
migrate(drizzle(sqlite), { migrationsFolder: path.join(process.cwd(), "drizzle") });
sqlite.close();

console.log(`[db] migrations applied to ${file}`);
