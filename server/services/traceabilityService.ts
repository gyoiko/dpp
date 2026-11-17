import type {
  TraceabilityDocument,
  TraceabilityFibre,
  TraceabilityHeader,
  TraceabilityNode,
  TraceabilityOption,
  TraceabilityRecord,
} from "../../types/traceability";
import { fetchTraceData } from "../dbService";
import { formatMilRef, parseMilRef, MilRefError } from "../milRef";
import { toNumber, toText, toYesNoBoolean } from "../rowValues";

const HEADER_QUERY = `SELECT TOP 50
  ID, 客单号, 客单行, 产品范围, 买家, 采购订单, GTI订单号, 款式, 物料参考, 产品形态, 状态, 客花号, 出货流水号
FROM [T_溯源_主表]
WHERE 客单号 = @KeDanHao
  AND 客单行 = @KeDanHang
  AND 删除标志 = 0
ORDER BY ID DESC`;

const OPTIONS_QUERY = `SELECT TOP 100
  ID, 客单号, 客单行, 采购订单, 出货流水号, 客花号, 状态
FROM [T_溯源_主表]
WHERE 客单号 = @KeDanHao
  AND 删除标志 = 0
ORDER BY 客单行, ID DESC`;

const FIBRE_QUERY = `SELECT 序号, 纤维, 百分比, 物料批号
FROM [T_溯源_纤维成分表]
WHERE MainID = @MainID
  AND 删除标志 = 0
ORDER BY 序号`;

const NODE_QUERY = `SELECT
  N.ID, N.序号, N.角色, N.角色说明, N.供应商, N.国家, N.分支标签, N.流程描述, N.认证说明,
  N.输入批号, N.输出批号, N.数量, N.单位, N.是否直接供应商, N.上游序号,
  文件数 = (SELECT COUNT(*) FROM [T_溯源_节点文件表] F
            WHERE F.NodeID = N.ID AND F.删除标志 = 0),
  缺失数 = (SELECT COUNT(*) FROM [T_溯源_角色必填文件] R
            WHERE R.角色 = N.角色 AND R.删除标志 = 0
              AND NOT EXISTS (SELECT 1 FROM [T_溯源_节点文件表] F
                              WHERE F.NodeID = N.ID AND F.删除标志 = 0
                                AND F.审核状态 <> N'Rejected' AND F.文件类型 = R.文件类型))
FROM [T_溯源_流程节点表] N
WHERE N.MainID = @MainID
  AND N.删除标志 = 0
ORDER BY N.序号`;

const DOCUMENT_QUERY = `SELECT
  ID, NodeID, 文件类型, 类型说明, 文件编号, 关联参考, 发行日期, 有效期至,
  签发方, 文件名, 审核状态, 审核备注, 审核人, 审核时间
FROM [T_溯源_节点文件表]
WHERE MainID = @MainID
  AND 删除标志 = 0
ORDER BY ID`;

function parseSeqNumbers(value: unknown): number[] {
  const text = toText(value);

  if (!text) {
    return [];
  }

  return text
    .split(/[,\s]+/)
    .map((part) => Number(part))
    .filter((part) => Number.isInteger(part));
}

function mapHeader(row: Record<string, unknown>): TraceabilityHeader {
  return {
    millNo: toText(row["客单号"]),
    orderLine: toText(row["客单行"]),
    buyer: toText(row["买家"]),
    buyerPo: toText(row["采购订单"]),
    style: toText(row["款式"]),
    scope: toText(row["产品范围"]),
    status: toText(row["状态"]),
    gtiOrderNo: toText(row["GTI订单号"]),
    materialReference: toText(row["物料参考"]),
    productForm: toText(row["产品形态"]),
    customerArticle: toText(row["客花号"]),
    shipmentSerial: toText(row["出货流水号"]),
  };
}

function mapFibre(row: Record<string, unknown>): TraceabilityFibre {
  return {
    seqNo: toNumber(row["序号"]),
    fibreType: toText(row["纤维"]),
    percentage: toNumber(row["百分比"]),
    sourceLot: toText(row["物料批号"]),
  };
}

function mapNode(row: Record<string, unknown>): TraceabilityNode {
  return {
    id: toNumber(row["ID"]) ?? 0,
    seqNo: toNumber(row["序号"]),
    role: toText(row["角色"]),
    roleDescription: toText(row["角色说明"]),
    supplier: toText(row["供应商"]),
    country: toText(row["国家"]),
    branchLabel: toText(row["分支标签"]),
    processDescription: toText(row["流程描述"]),
    certificationNote: toText(row["认证说明"]),
    inputLot: toText(row["输入批号"]),
    outputLot: toText(row["输出批号"]),
    quantity: toNumber(row["数量"]),
    unit: toText(row["单位"]),
    directSupplier: toYesNoBoolean(row["是否直接供应商"]),
    upstreamSeqNo: toText(row["上游序号"]),
    upstreamSeqNos: parseSeqNumbers(row["上游序号"]),
    documentCount: toNumber(row["文件数"]),
    missingDocumentCount: toNumber(row["缺失数"]),
  };
}

function mapDocument(
  row: Record<string, unknown>,
  nodeSeqById: Map<number, number | null>,
): TraceabilityDocument {
  const nodeId = toNumber(row["NodeID"]);

  return {
    id: toNumber(row["ID"]) ?? 0,
    nodeId,
    nodeSeqNo: nodeId === null ? null : (nodeSeqById.get(nodeId) ?? null),
    documentType: toText(row["文件类型"]),
    typeDescription: toText(row["类型说明"]),
    documentNo: toText(row["文件编号"]),
    reference: toText(row["关联参考"]),
    issueDate: toText(row["发行日期"]),
    validUntil: toText(row["有效期至"]),
    issuer: toText(row["签发方"]),
    fileName: toText(row["文件名"]),
    reviewStatus: toText(row["审核状态"]),
    reviewNote: toText(row["审核备注"]),
    reviewedBy: toText(row["审核人"]),
    reviewTime: toText(row["审核时间"]),
  };
}

function normaliseSerial(value: string | null): string {
  return (value ?? "").trim().toLowerCase();
}

function selectHeaderRow(
  rows: Record<string, unknown>[],
  parts: ReturnType<typeof parseMilRef>,
): Record<string, unknown> | null {
  if (rows.length === 0) {
    return null;
  }

  if (parts.shipmentSerial) {
    const match = rows.find(
      (row) => normaliseSerial(toText(row["出货流水号"])) === normaliseSerial(parts.shipmentSerial),
    );

    if (!match) {
      throw new MilRefError(
        `No traceability record found for shipment ${parts.shipmentSerial} on ${parts.keDanHao}-${parts.keDanHang}.`,
      );
    }

    return match;
  }

  if (rows.length === 1) {
    return rows[0];
  }

  const shipments = [
    ...new Set(rows.map((row) => toText(row["出货流水号"])).filter((value): value is string => Boolean(value))),
  ];
  const example = formatMilRef({ ...parts, shipmentSerial: shipments[0] ?? null });

  throw new MilRefError(
    shipments.length > 0
      ? `Multiple shipments exist for ${parts.keDanHao}-${parts.keDanHang}: ${shipments.join(", ")}. Choose one, e.g. ${example}.`
      : `Multiple records exist for ${parts.keDanHao}-${parts.keDanHang}. Add the shipment serial to the MilRef.`,
  );
}

export async function fetchTraceabilityOptions(millNo: string): Promise<TraceabilityOption[]> {
  const keDanHao = (millNo ?? "").trim();

  if (!keDanHao) {
    throw new MilRefError("Mil No is required.");
  }

  if (!/^[A-Za-z0-9_]+$/.test(keDanHao)) {
    throw new MilRefError("Mil No may only contain letters, numbers, and underscores.");
  }

  const rows = await fetchTraceData<Record<string, unknown>>(OPTIONS_QUERY, { KeDanHao: keDanHao });

  return rows.map((row) => ({
    mainId: toNumber(row["ID"]) ?? 0,
    keDanHao: toText(row["客单号"]) ?? keDanHao,
    keDanHang: toText(row["客单行"]) ?? "1",
    buyerPo: toText(row["采购订单"]),
    shipmentSerial: toText(row["出货流水号"]),
    customerArticle: toText(row["客花号"]),
    status: toText(row["状态"]),
  }));
}

export async function fetchTraceability(milRef: string): Promise<TraceabilityRecord> {
  const parts = parseMilRef(milRef);
  const base = {
    milRef: formatMilRef(parts),
    keDanHao: parts.keDanHao,
    keDanHang: parts.keDanHang,
  };

  const headerRows = await fetchTraceData<Record<string, unknown>>(HEADER_QUERY, {
    KeDanHao: parts.keDanHao,
    KeDanHang: parts.keDanHang,
  });
  const headerRow = selectHeaderRow(headerRows, parts);

  if (!headerRow) {
    return { ...base, header: null, fibres: [], nodes: [], documents: [] };
  }

  const mainId = toNumber(headerRow["ID"]);

  if (mainId === null) {
    return { ...base, header: null, fibres: [], nodes: [], documents: [] };
  }

  const [fibreRows, nodeRows, documentRows] = await Promise.all([
    fetchTraceData<Record<string, unknown>>(FIBRE_QUERY, { MainID: mainId }),
    fetchTraceData<Record<string, unknown>>(NODE_QUERY, { MainID: mainId }),
    fetchTraceData<Record<string, unknown>>(DOCUMENT_QUERY, { MainID: mainId }),
  ]);

  const nodes = nodeRows.map(mapNode);
  const nodeSeqById = new Map<number, number | null>(nodes.map((node) => [node.id, node.seqNo]));

  return {
    ...base,
    header: mapHeader(headerRow),
    fibres: fibreRows.map(mapFibre),
    nodes,
    documents: documentRows.map((row) => mapDocument(row, nodeSeqById)),
  };
}
