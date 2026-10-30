export interface SupplyChainNode {
  customerOrderNo: string | null;
  customerOrderLine: string | null;
  contractNo: string | null;
  lotNo: string | null;
  yarnSpec: string | null;
  supplier: string | null;
  country: string | null;
  category: string | null;
  quantity: number | null;
  unit: string | null;
  contractDate: string | null;
}

export interface SupplyChainResponse {
  milRef: string;
  keDanHao: string;
  keDanHang: string;
  count: number;
  data: SupplyChainNode[];
}

export interface SupplyChainErrorResponse {
  error: string;
}
