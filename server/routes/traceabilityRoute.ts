import { Router } from "express";
import type { TraceabilityErrorResponse } from "../../types/traceability";
import { getRequestSession } from "../auth";
import { MilRefError } from "../milRef";
import { checkProjectAccess } from "../services/projectAccess";
import { fetchTraceability, fetchTraceabilityOptions } from "../services/traceabilityService";

const traceabilityRouter = Router();

traceabilityRouter.get("/dpp/traceability-options", async (request, response) => {
  const millNo = String(request.query.millNo ?? "").trim();

  try {
    const options = await fetchTraceabilityOptions(millNo);
    const session = await getRequestSession(request);

    if (session && !session.canViewAll) {
      const access = await checkProjectAccess(session, millNo);

      if (!access.allowed) {
        const payload: TraceabilityErrorResponse = { error: "You do not have access to this project." };
        response.status(403).json(payload);
        return;
      }
    }

    response.json({ options });
  } catch (error) {
    if (error instanceof MilRefError) {
      const payload: TraceabilityErrorResponse = { error: error.message };
      response.status(400).json(payload);
      return;
    }

    console.error("[traceability] failed to load DPP traceability options", error);
    const payload: TraceabilityErrorResponse = { error: "Failed to load traceability options." };
    response.status(502).json(payload);
  }
});

traceabilityRouter.get("/dpp/traceability/:milRef", async (request, response) => {
  const milRef = request.params.milRef ?? "";

  try {
    const record = await fetchTraceability(milRef);
    const session = await getRequestSession(request);

    if (session && !session.canViewAll) {
      const access = await checkProjectAccess(session, record.keDanHao);

      if (!access.allowed) {
        const payload: TraceabilityErrorResponse = { error: "You do not have access to this project." };
        response.status(403).json(payload);
        return;
      }
    }

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
