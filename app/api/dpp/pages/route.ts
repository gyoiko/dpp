import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { dppPages, traceabilityNodeMappings } from "@/db/schema";
import type { DppPage, DppPageStatus } from "@/types/dppPage";

const STATUSES: readonly DppPageStatus[] = ["draft", "published"];

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function parseMilRefValue(value: string) {
  const raw = value.trim();

  if (!raw) {
    return null;
  }

  const separator = raw.indexOf("-");
  const keDanHao = (separator === -1 ? raw : raw.slice(0, separator)).trim();
  const keDanHang = (separator === -1 ? "1" : raw.slice(separator + 1).split("-")[0] || "1").trim();

  if (!/^[A-Za-z0-9_]+$/.test(keDanHao) || !/^\d+$/.test(keDanHang)) {
    return null;
  }

  return { keDanHao, keDanHang, milRef: `${keDanHao}-${keDanHang}` };
}

function toRouteErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "Unexpected error";
  const detail = error instanceof Error && error.cause instanceof Error ? error.cause.message : "";
  const combined = `${message}\n${detail}`;

  if (combined.includes("no such table")) {
    return "Tabel halaman DPP belum ada. Jalankan `npm run db:generate` lalu apply migrasi D1 lokal.";
  }

  if (combined.includes("binding") && combined.includes("unavailable")) {
    return "D1 binding `DB` belum aktif. Set `\"d1\": \"DB\"` di .openai/hosting.json lalu restart dev server.";
  }

  return message;
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const milRef = text(url.searchParams.get("milRef"));
    const db = getDb();

    if (milRef) {
      const [page] = await db.select().from(dppPages).where(eq(dppPages.milRef, milRef)).limit(1);
      return Response.json({ page: page ?? null });
    }

    const pages = await db.select().from(dppPages).orderBy(desc(dppPages.updatedAt)).limit(200);
    return Response.json({ pages });
  } catch (error) {
    return Response.json({ error: toRouteErrorMessage(error) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as Record<string, unknown>;
    const parsed = parseMilRefValue(text(payload.milRef));
    const status = payload.status ?? "draft";
    const title = text(payload.title);
    const intro = text(payload.intro);

    if (!parsed) {
      return Response.json({ error: "milRef must be KeDanHao-KeDanHang, e.g. B02345-1" }, { status: 400 });
    }

    if (!STATUSES.includes(status as DppPageStatus)) {
      return Response.json({ error: `status must be one of: ${STATUSES.join(", ")}` }, { status: 400 });
    }

    const now = new Date().toISOString();
    const db = getDb();

    if (status === "published") {
      const apiBase = (process.env.DPP_API_BASE_URL ?? "http://localhost:4000").replace(/\/$/, "");
      let traceabilityResponse: Response;

      try {
        traceabilityResponse = await fetch(
          `${apiBase}/api/dpp/traceability/${encodeURIComponent(parsed.milRef)}`,
          { cache: "no-store" },
        );
      } catch {
        return Response.json(
          { error: "Cannot verify traceability data. Make sure the ERP API is running." },
          { status: 502 },
        );
      }

      if (traceabilityResponse.status === 404) {
        return Response.json(
          { error: `Cannot publish: no traceability data found for ${parsed.milRef} in the DPP database.` },
          { status: 400 },
        );
      }

      if (!traceabilityResponse.ok) {
        return Response.json(
          { error: "Cannot verify traceability data from the ERP API." },
          { status: 502 },
        );
      }

      const mappedNodes = await db
        .select()
        .from(traceabilityNodeMappings)
        .where(
          and(
            eq(traceabilityNodeMappings.keDanHao, parsed.keDanHao),
            eq(traceabilityNodeMappings.keDanHang, parsed.keDanHang),
          ),
        )
        .limit(1);

      if (mappedNodes.length === 0) {
        return Response.json(
          { error: "Cannot publish: map at least one journey node to a DPP stage first." },
          { status: 400 },
        );
      }
    }

    const [page] = await db
      .insert(dppPages)
      .values({
        milRef: parsed.milRef,
        keDanHao: parsed.keDanHao,
        keDanHang: parsed.keDanHang,
        title: title || parsed.milRef,
        intro,
        status: status as DppPageStatus,
        publishedAt: status === "published" ? now : null,
      })
      .onConflictDoUpdate({
        target: dppPages.milRef,
        set: {
          title: title || parsed.milRef,
          intro,
          status: status as DppPageStatus,
          publishedAt: status === "published" ? now : null,
          updatedAt: now,
        },
      })
      .returning();

    return Response.json({ page: page as DppPage }, { status: 201 });
  } catch (error) {
    return Response.json({ error: toRouteErrorMessage(error) }, { status: 500 });
  }
}
