import { Router } from "express";
import type { TraceabilityErrorResponse } from "../../types/traceability";
import { MilRefError } from "../milRef";
import { fetchTraceability } from "../services/traceabilityService";

const traceabilityRouter = Router();

traceabilityRouter.get("/dpp/traceability/:milRef", async (request, response) => {
  const milRef = request.params.milRef ?? "";

  try {
    const record = await fetchTraceability(milRef);

    if (!record.header) {
      const payload: TraceabilityErrorResponse = {
        error: `No DPP traceability record found for ${record.milRef}.`,
      };
      response.status(404).json(payload);
      return;
    }

    response.json(record);
  } catch (error) {
    if (error instanceof MilRefError) {
      const payload: TraceabilityErrorResponse = { error: error.message };
      response.status(400).json(payload);
      return;
    }

    console.error("[traceability] failed to load DPP traceability data", error);
    const payload: TraceabilityErrorResponse = { error: "Failed to load DPP traceability data." };
    response.status(502).json(payload);
  }
});

export default traceabilityRouter;
