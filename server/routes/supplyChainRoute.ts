import { Router } from "express";
import type { SupplyChainErrorResponse, SupplyChainResponse } from "../../types/supplyChain";
import { MilRefError } from "../milRef";
import { fetchSupplyChain } from "../services/supplyChainService";

const supplyChainRouter = Router();

supplyChainRouter.get("/dpp/supply-chain/:milRef", async (request, response) => {
  const milRef = request.params.milRef ?? "";

  try {
    const { parts, data } = await fetchSupplyChain(milRef);

    const payload: SupplyChainResponse = {
      milRef: `${parts.keDanHao}-${parts.keDanHang}`,
      keDanHao: parts.keDanHao,
      keDanHang: parts.keDanHang,
      count: data.length,
      data,
    };

    response.json(payload);
  } catch (error) {
    if (error instanceof MilRefError) {
      const payload: SupplyChainErrorResponse = { error: error.message };
      response.status(400).json(payload);
      return;
    }

    console.error("[supply-chain] failed to load ERP data", error);
    const payload: SupplyChainErrorResponse = { error: "Failed to load supply chain data from ERP." };
    response.status(502).json(payload);
  }
});

export default supplyChainRouter;
