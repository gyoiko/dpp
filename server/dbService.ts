import sql from "mssql";
import { getPool, getTracePool } from "./db";

const FORBIDDEN_KEYWORDS = [
  "insert",
  "update",
  "delete",
  "drop",
  "truncate",
  "alter",
  "exec",
  "execute",
  "merge",
  "create",
  "grant",
  "revoke",
  "deny",
  "backup",
  "restore",
  "dbcc",
  "shutdown",
  "kill",
  "waitfor",
  "openrowset",
  "openquery",
  "opendatasource",
  "reconfigure",
  "bulk",
  "into",
  "set",
  "use",
  "sp_executesql",
  "xp_cmdshell",
];

const FORBIDDEN_KEYWORD_PATTERN = new RegExp(`\\b(?:${FORBIDDEN_KEYWORDS.join("|")})\\b`, "i");

function sanitizeSql(input: string): { sanitized: string; clean: boolean } {
  let sanitized = "";
  let clean = true;
  let index = 0;

  while (index < input.length) {
    const char = input[index];
    const next = input[index + 1];

    if (char === "'" || char === '"') {
      const quote = char;
      let closed = false;
      index += 1;

      while (index < input.length) {
        if (input[index] === quote) {
          if (input[index + 1] === quote) {
            index += 2;
            continue;
          }

          index += 1;
          closed = true;
          break;
        }

        index += 1;
      }

      clean = clean && closed;
      sanitized += " ";
      continue;
    }

    if (char === "[") {
      let closed = false;
      index += 1;

      while (index < input.length) {
        if (input[index] === "]") {
          if (input[index + 1] === "]") {
            index += 2;
            continue;
          }

          index += 1;
          closed = true;
          break;
        }

        index += 1;
      }

      clean = clean && closed;
      sanitized += " ";
      continue;
    }

    if (char === "-" && next === "-") {
      index += 2;

      while (index < input.length && input[index] !== "\n" && input[index] !== "\r") {
        index += 1;
      }

      sanitized += " ";
      continue;
    }

    if (char === "/" && next === "*") {
      let closed = false;
      index += 2;

      while (index < input.length) {
        if (input[index] === "*" && input[index + 1] === "/") {
          index += 2;
          closed = true;
          break;
        }

        index += 1;
      }

      clean = clean && closed;
      sanitized += " ";
      continue;
    }

    sanitized += char;
    index += 1;
  }

  return { sanitized, clean };
}

export function assertReadOnlySelect(query: string): void {
  if (typeof query !== "string" || query.trim() === "") {
    throw new Error("SQL query must be a non-empty string.");
  }

  if (query.includes("\u0000")) {
    throw new Error("SQL query contains a null byte.");
  }

  const { sanitized, clean } = sanitizeSql(query);

  if (!clean) {
    throw new Error("SQL query contains an unterminated string literal, identifier, or comment.");
  }

  const statement = sanitized.trim().replace(/;\s*$/, "").trim();

  if (!statement) {
    throw new Error("SQL query is empty after removing comments.");
  }

  if (!/^(select|with)\b/i.test(statement)) {
    throw new Error("Only read-only SELECT queries are allowed. Query must start with SELECT or WITH.");
  }

  if (statement.includes(";")) {
    throw new Error("Multiple SQL statements are not allowed.");
  }

  const forbidden = statement.match(FORBIDDEN_KEYWORD_PATTERN);

  if (forbidden) {
    throw new Error(`Forbidden SQL keyword detected: ${forbidden[0].toUpperCase()}. This module is strictly read-only.`);
  }
}

function normalizeParamName(name: string): string {
  const bare = name.startsWith("@") ? name.slice(1) : name;

  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(bare)) {
    throw new Error(`Invalid SQL parameter name: ${name}`);
  }

  return bare;
}

async function runSelect<T extends object>(
  poolProvider: () => Promise<sql.ConnectionPool>,
  query: string,
  params: Record<string, unknown> = {},
): Promise<T[]> {
  assertReadOnlySelect(query);

  const pool = await poolProvider();
  const request = pool.request();

  for (const [rawName, value] of Object.entries(params)) {
    const name = normalizeParamName(rawName);

    if (value === null || value === undefined) {
      request.input(name, sql.NVarChar, null);
    } else {
      request.input(name, value);
    }
  }

  const result = await request.query<T>(query);

  return result.recordset ?? [];
}

export function fetchData<T extends object = Record<string, unknown>>(
  query: string,
  params: Record<string, unknown> = {},
): Promise<T[]> {
  return runSelect<T>(getPool, query, params);
}

export function fetchTraceData<T extends object = Record<string, unknown>>(
  query: string,
  params: Record<string, unknown> = {},
): Promise<T[]> {
  return runSelect<T>(getTracePool, query, params);
}
