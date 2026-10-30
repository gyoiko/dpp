import "dotenv/config";
import type { config as MssqlConfig } from "mssql";

const REQUIRED_DB_ENV = ["DB_USER", "DB_PASSWORD", "DB_SERVER", "DB_NAME"] as const;

export function getDbConfig(database?: string): MssqlConfig {
  const missing = REQUIRED_DB_ENV.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(`Missing SQL Server environment variables: ${missing.join(", ")}`);
  }

  return {
    user: process.env.DB_USER as string,
    password: process.env.DB_PASSWORD as string,
    server: process.env.DB_SERVER as string,
    database: (database ?? process.env.DB_NAME) as string,
    port: Number(process.env.DB_PORT ?? 1433),
    connectionTimeout: Number(process.env.DB_CONNECTION_TIMEOUT ?? 15000),
    requestTimeout: Number(process.env.DB_REQUEST_TIMEOUT ?? 30000),
    pool: {
      min: 0,
      max: 10,
      idleTimeoutMillis: 30000,
    },
    options: {
      encrypt: process.env.DB_ENCRYPT !== "false",
      trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE !== "false",
      readOnlyIntent: true,
      appName: "dpp-cms-readonly",
    },
  };
}
