import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { dppPages, traceabilityNodeMappings } from "@/db/schema";
import DppApp from "@/components/DppApp";
import { buildTraceabilityProduct } from "@/data/buildTraceabilityProduct";
import type { DppPage } from "@/types/dppPage";
import type { TraceabilityNodeMapping, TraceabilityRecord } from "@/types/traceability";

export const dynamic = "force-dynamic";

function Unavailable({ title, message }: { title: string; message: string }) {
  return (
    <main className="grid min-h-screen place-items-center bg-[#e8e8dd] px-4 py-10">
      <section className="w-full max-w-lg rounded-3xl border border-[#1731270f] bg-[#fffef9] p-8 text-center shadow-[0_24px_80px_rgba(30,47,39,0.12)]">
        <p className="text-[10px] font-extrabold tracking-[0.18em] text-[#7a8c80]">DIGITAL PRODUCT PASSPORT</p>
        <h1 className="mt-3 font-[family-name:var(--font-manrope)] text-2xl font-bold tracking-[-0.02em]">{title}</h1>
        <p className="mt-3 text-sm leading-6 text-[#6f7f77]">{message}</p>
      </section>
    </main>
  );
}

export default async function PublicDppPage({ params }: { params: Promise<{ milRef: string }> }) {
  const { milRef } = await params;
  const decodedMilRef = decodeURIComponent(milRef).trim();

  let page: DppPage | null = null;
  let record: TraceabilityRecord | null = null;
  let mappings: TraceabilityNodeMapping[] = [];
  let unavailableReason: "none" | "not-found" | "error" = "none";

  try {
    const db = getDb();
    const [found] = await db.select().from(dppPages).where(eq(dppPages.milRef, decodedMilRef)).limit(1);
    page = found ? (found as DppPage) : null;

    if (page && page.status === "published") {
      const apiBase = (process.env.DPP_API_BASE_URL ?? "http://localhost:4000").replace(/\/$/, "");
      const response = await fetch(`${apiBase}/api/dpp/traceability/${encodeURIComponent(decodedMilRef)}`, {
        cache: "no-store",
      });

      if (response.status === 404) {
        unavailableReason = "not-found";
      } else if (!response.ok) {
        throw new Error("Traceability data is unavailable.");
      } else {
        record = (await response.json()) as TraceabilityRecord;

        const rows = await db
          .select()
          .from(traceabilityNodeMappings)
          .where(
            and(
              eq(traceabilityNodeMappings.keDanHao, record.keDanHao),
              eq(traceabilityNodeMappings.keDanHang, record.keDanHang),
            ),
          );

        mappings = rows as TraceabilityNodeMapping[];
      }
    }
  } catch {
    unavailableReason = "error";
  }

  if (!page) {
    return <Unavailable title="Page not found" message="This DPP page has not been created yet." />;
  }

  if (page.status !== "published") {
    return <Unavailable title="Page not published" message="This DPP page is still in draft and is not publicly available." />;
  }

  if (unavailableReason === "not-found") {
    return (
      <Unavailable
        title="No traceability data"
        message={`No DPP traceability record exists for ${decodedMilRef} in the DPP database.`}
      />
    );
  }

  if (unavailableReason === "error" || !record) {
    return <Unavailable title="Data unavailable" message="The traceability data for this page could not be loaded. Please try again later." />;
  }

  const product = buildTraceabilityProduct(record, mappings, page);

  return <DppApp product={product} heading={page.title || undefined} intro={page.intro || undefined} />;
}
