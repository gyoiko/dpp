import app from "./app";
import { serverConfig } from "./config";
import { closePool } from "./db";

const server = app.listen(serverConfig.port, () => {
  console.log(`[supply-chain] CMS API listening on http://localhost:${serverConfig.port} (${serverConfig.useMockData ? "mock data" : "ERP mode"})`);
});

async function shutdown(signal: string) {
  console.log(`[supply-chain] ${signal} received, shutting down`);

  server.close(async () => {
    await closePool();
    process.exit(0);
  });
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
