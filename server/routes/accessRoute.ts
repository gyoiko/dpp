import { Router } from "express";
import { requireApiAuth } from "../auth";
import { checkProjectAccess, filterAllowedKeDanHao } from "../services/projectAccess";

const accessRouter = Router();

accessRouter.get("/dpp/access/:keDanHao", requireApiAuth, async (request, response) => {
  const keDanHao = String(request.params.keDanHao ?? "").trim();

  if (!keDanHao) {
    response.status(400).json({ error: "keDanHao is required." });
    return;
  }

  try {
    const access = await checkProjectAccess(request.user!, keDanHao);
    response.json({
      found: access.found,
      allowed: access.allowed,
      ownerCode: access.allowed ? access.ownerCode : null,
      ownerName: access.allowed ? access.ownerName : null,
    });
  } catch (error) {
    console.error("[access] failed to check project access", error);
    response.status(502).json({ error: "Cannot verify project access." });
  }
});

accessRouter.post("/dpp/access/check", requireApiAuth, async (request, response) => {
  const raw: unknown[] = Array.isArray(request.body?.keDanHaos) ? request.body.keDanHaos : [];
  const keDanHaos = raw.filter((value): value is string => typeof value === "string");

  try {
    const allowed = await filterAllowedKeDanHao(request.user!, keDanHaos);
    response.json({ allowed: Array.from(allowed) });
  } catch (error) {
    console.error("[access] failed to filter project access", error);
    response.status(502).json({ error: "Cannot verify project access." });
  }
});

export default accessRouter;
