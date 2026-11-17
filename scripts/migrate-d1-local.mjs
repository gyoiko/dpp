import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";

const drizzleDir = path.join(process.cwd(), "drizzle");
const stateDir = path.join(process.cwd(), ".wrangler", "state", "v3", "d1", "miniflare-D1DatabaseObject");

if (!existsSync(stateDir)) {
  console.log("[d1-local] No local D1 state found at .wrangler; nothing to migrate.");
  process.exit(0);
}

const targets = readdirSync(stateDir)
  .filter((file) => file.endsWith(".sqlite") && !file.startsWith("metadata"))
  .map((file) => path.join(stateDir, file));

if (targets.length === 0) {
  console.log("[d1-local] No local D1 database file found; nothing to migrate.");
  process.exit(0);
}

const migrations = readdirSync(drizzleDir)
  .filter((file) => file.endsWith(".sql"))
  .sort()
  .map((file) => ({
    tag: file,
    statements: readFileSync(path.join(drizzleDir, file), "utf8")
      .split("--> statement-breakpoint")
      .map((statement) => statement.trim())
      .filter(Boolean),
  }));

const IGNORABLE = /already exists|duplicate column name/i;

for (const file of targets) {
  const sqlite = new Database(file);

  try {
    sqlite.pragma("busy_timeout = 5000");
    sqlite.exec(
      "CREATE TABLE IF NOT EXISTS `__dpp_migrations` (`tag` text PRIMARY KEY NOT NULL, `applied_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL)",
    );

    const applied = new Set(sqlite.prepare("SELECT tag FROM `__dpp_migrations`").all().map((row) => row.tag));
    let count = 0;

    for (const migration of migrations) {
      if (applied.has(migration.tag)) {
        continue;
      }

      for (const statement of migration.statements) {
        try {
          sqlite.exec(statement);
        } catch (error) {
          if (!IGNORABLE.test(error.message)) {
            throw error;
          }
        }
      }

      sqlite.prepare("INSERT OR IGNORE INTO `__dpp_migrations` (tag) VALUES (?)").run(migration.tag);
      count += 1;
    }

    console.log(`[d1-local] ${path.basename(file)}: ${count} migration(s) applied.`);
  } finally {
    sqlite.close();
  }
}
