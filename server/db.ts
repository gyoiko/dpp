import sql from "mssql";
import { getDbConfig } from "./dbConfig";

let poolPromise: Promise<sql.ConnectionPool> | null = null;
let tracePoolPromise: Promise<sql.ConnectionPool> | null = null;
let gtiPoolPromise: Promise<sql.ConnectionPool> | null = null;

function createPool(database?: string): Promise<sql.ConnectionPool> {
  return new sql.ConnectionPool(getDbConfig(database)).connect();
}

export function getPool(): Promise<sql.ConnectionPool> {
  if (!poolPromise) {
    poolPromise = createPool().catch((error: unknown) => {
      poolPromise = null;
      throw error;
    });
  }

  return poolPromise;
}

export function getTracePool(): Promise<sql.ConnectionPool> {
  if (!tracePoolPromise) {
    const database = process.env.TRACE_DB_NAME ?? "tesdatt5";

    tracePoolPromise = createPool(database).catch((error: unknown) => {
      tracePoolPromise = null;
      throw error;
    });
  }

  return tracePoolPromise;
}

export function getGtiPool(): Promise<sql.ConnectionPool> {
  if (!gtiPoolPromise) {
    const database = process.env.GTI_DB_NAME ?? "LFSOFT_IDN";

    gtiPoolPromise = createPool(database).catch((error: unknown) => {
      gtiPoolPromise = null;
      throw error;
    });
  }

  return gtiPoolPromise;
}

export async function closePool(): Promise<void> {
  const pending = [poolPromise, tracePoolPromise, gtiPoolPromise];
  poolPromise = null;
  tracePoolPromise = null;
  gtiPoolPromise = null;

  for (const promise of pending) {
    if (!promise) {
      continue;
    }

    const pool = await promise.catch(() => null);

    if (pool) {
      await pool.close();
    }
  }
}
