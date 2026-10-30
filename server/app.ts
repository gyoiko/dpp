import cors from "cors";
import express from "express";
import { serverConfig } from "./config";
import supplyChainRouter from "./routes/supplyChainRoute";
import traceabilityRouter from "./routes/traceabilityRoute";

const app = express();

app.use(cors({ origin: serverConfig.corsOrigin }));
app.use(express.json());

app.get("/api/health", (_request, response) => {
  response.json({ status: "ok", mode: serverConfig.useMockData ? "mock" : "erp" });
});

app.use("/api", supplyChainRouter);
app.use("/api", traceabilityRouter);

app.use((_request, response) => {
  response.status(404).json({ error: "Not found" });
});

export default app;
