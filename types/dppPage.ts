export type DppPageStatus = "draft" | "published";

export interface DppPage {
  id: number;
  milRef: string;
  keDanHao: string;
  keDanHang: string;
  title: string;
  intro: string;
  photoData: string | null;
  compositionNotes: string | null;
  status: DppPageStatus;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}
