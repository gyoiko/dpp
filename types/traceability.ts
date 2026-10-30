export interface TraceabilityHeader {
  millNo: string | null;
  buyer: string | null;
  buyerPo: string | null;
  style: string | null;
  scope: string | null;
  status: string | null;
  gtiOrderNo: string | null;
  materialReference: string | null;
  productForm: string | null;
}

export interface TraceabilityFibre {
  seqNo: number | null;
  fibreType: string | null;
  percentage: number | null;
  sourceLot: string | null;
}

export interface TraceabilityNode {
  id: number;
  seqNo: number | null;
  role: string | null;
  roleDescription: string | null;
  supplier: string | null;
  country: string | null;
  branchLabel: string | null;
  processDescription: string | null;
  certificationNote: string | null;
  inputLot: string | null;
  outputLot: string | null;
  quantity: number | null;
  unit: string | null;
  directSupplier: boolean | null;
  upstreamSeqNo: string | null;
  upstreamSeqNos: number[];
}

export interface TraceabilityDocument {
  id: number;
  nodeId: number | null;
  nodeSeqNo: number | null;
  documentType: string | null;
  typeDescription: string | null;
  documentNo: string | null;
  reference: string | null;
  issueDate: string | null;
  validUntil: string | null;
  issuer: string | null;
  fileName: string | null;
  reviewStatus: string | null;
  reviewNote: string | null;
  reviewedBy: string | null;
  reviewTime: string | null;
}

export const DPP_STAGES = ["farm", "ginner", "trader", "spinner", "fabric", "garment"] as const;

export type DppStage = (typeof DPP_STAGES)[number];

export const DPP_STAGE_LABELS: Record<DppStage, string> = {
  farm: "Farm",
  ginner: "Ginner",
  trader: "Cotton trader",
  spinner: "Spinner",
  fabric: "Knitter / weaver",
  garment: "Garment manufacturer",
};

export type TraceabilityMappingStatus = "draft" | "reviewed";

export interface TraceabilityNodeMapping {
  id: number;
  mappingKey: string;
  keDanHao: string;
  keDanHang: string;
  nodeId: number;
  nodeSeqNo: number | null;
  stage: DppStage;
  process: string;
  notes: string;
  status: TraceabilityMappingStatus;
  reviewedBy: string;
  createdAt: string;
  updatedAt: string;
}

export function traceabilityNodeMappingKey(keDanHao: string, keDanHang: string, nodeId: number): string {
  return [keDanHao, keDanHang, String(nodeId)].join("|");
}

export interface TraceabilityRecord {
  milRef: string;
  keDanHao: string;
  keDanHang: string;
  header: TraceabilityHeader | null;
  fibres: TraceabilityFibre[];
  nodes: TraceabilityNode[];
  documents: TraceabilityDocument[];
}

export interface TraceabilityErrorResponse {
  error: string;
}
