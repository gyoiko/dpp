import type { SupplyChainNode } from "../../types/supplyChain";
import { serverConfig } from "../config";
import { fetchData } from "../dbService";
import { parseMilRef, type MilRefParts } from "../milRef";
import { mockSupplyChainRows } from "../mockSupplyChain";
import { toNumber, toText } from "../rowValues";

export interface SupplyChainResult {
  parts: MilRefParts;
  data: SupplyChainNode[];
}

const SUPPLY_CHAIN_QUERY = `SELECT TOP 200
  d.客单号, d.客单行, d.类别, d.纱支, d.数量, d.单位,
  m.合同号, m.批号, m.公司, m.国别, m.合同日期
FROM T_进口棉_配棉登记表 AS d
LEFT JOIN T_进口棉_配棉主表 AS m ON m.ID = d.MainID
WHERE d.客单号 = @KeDanHao
  AND d.客单行 = @KeDanHang
  AND d.删除标志 = 0
ORDER BY d.ID`;

export function mapSupplyChainRow(row: Record<string, unknown>): SupplyChainNode {
  return {
    customerOrderNo: toText(row["客单号"]),
    customerOrderLine: toText(row["客单行"]),
    contractNo: toText(row["合同号"]),
    lotNo: toText(row["批号"]),
    yarnSpec: toText(row["纱支"]),
    supplier: toText(row["公司"]),
    country: toText(row["国别"]),
    category: toText(row["类别"]),
    quantity: toNumber(row["数量"]),
    unit: toText(row["单位"]),
    contractDate: toText(row["合同日期"]),
  };
}

export async function fetchSupplyChain(milRef: string): Promise<SupplyChainResult> {
  const parts = parseMilRef(milRef);

  if (serverConfig.useMockData) {
    return { parts, data: mockSupplyChainRows.map(mapSupplyChainRow) };
  }

  const rows = await fetchData<Record<string, unknown>>(SUPPLY_CHAIN_QUERY, {
    KeDanHao: parts.keDanHao,
    KeDanHang: Number(parts.keDanHang),
  });

  return { parts, data: rows.map(mapSupplyChainRow) };
}
