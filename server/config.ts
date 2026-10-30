import "dotenv/config";

export const serverConfig = {
  port: Number(process.env.CMS_API_PORT ?? process.env.PORT ?? 4000),
  corsOrigin: process.env.CORS_ORIGIN ?? "*",
  useMockData: process.env.SUPPLY_CHAIN_MOCK === "true",
};
