import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { traceabilityNodeMappings } from "@/db/schema";
import type { TraceabilityMappingStatus, TraceabilityNodeMapping } from "@/types/traceability";
import { DPP_STAGES } from "@/types/traceability";

const STATUSES: readonly TraceabilityMappingStatus[] = ["draft", "reviewed"];

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function isOneOf<T extends string>(value: unknown, options: readonly T[]): value is T {
  return typeof value === "string" && (options as readonly string[]).includes(value);
}

function toRouteErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "Unexpected error";
  const detail = error instanceof Error && error.cause instanceof Error ? error.cause.message : "";
  const combined = `${message}\n${detail}`;

  if (combined.includes("no such table")) {
    return "Tabel mapping DPP belum ada. Jalankan `npm run db:generate` lalu apply migrasi D1 lokal.";
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
      const separator = milRef.indexOf("-");
      const keDanHao = (separator === -1 ? milRef : milRef.slice(0, separator)).trim();
      const keDanHang = (separator === -1 ? "1" : milRef.slice(separator + 1).split("-")[0] || "1").trim();

      if (!keDanHao) {
        return Response.json({ error: "milRef is invalid" }, { status: 400 });
      }

      const rows = await db
        .select()
        .from(traceabilityNodeMappings)
        .where(
          and(
            eq(traceabilityNodeMappings.keDanHao, keDanHao),
            eq(traceabilityNodeMappings.keDanHang, keDanHang),
          ),
        )
        .orderBy(desc(traceabilityNodeMappings.updatedAt));

      return Response.json({ mappings: rows });
    }

    const rows = await db
      .select()
      .from(traceabilityNodeMappings)
      .orderBy(desc(traceabilityNodeMappings.updatedAt))
      .limit(200);

    return Response.json({ mappings: rows });
  } catch (error) {
    return Response.json({ error: toRouteErrorMessage(error) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as Record<string, unknown>;

    const keDanHao = text(payload.keDanHao);
    const keDanHang = text(payload.keDanHang);
    const nodeId = Number(payload.nodeId);
    const nodeSeqNo = payload.nodeSeqNo === null || payload.nodeSeqNo === undefined ? null : Number(payload.nodeSeqNo);
    const process = text(payload.process);
    const notes = text(payload.notes);
    const reviewedBy = text(payload.reviewedBy) || "cms-user";
    const stage = payload.stage;
    const status = payload.status ?? "draft";

    if (!keDanHao) {
      return Response.json({ error: "keDanHao is required" }, { status: 400 });
    }

    if (!/^\d+$/.test(keDanHang)) {
      return Response.json({ error: "keDanHang must be a number" }, { status: 400 });
    }

    if (!Number.isInteger(nodeId) || nodeId <= 0) {
      return Response.json({ error: "nodeId must be a positive integer" }, { status: 400 });
    }

    if (!isOneOf(stage, DPP_STAGES)) {
      return Response.json({ error: `stage must be one of: ${DPP_STAGES.join(", ")}` }, { status: 400 });
    }

    if (!isOneOf(status, STATUSES)) {
      return Response.json({ error: `status must be one of: ${STATUSES.join(", ")}` }, { status: 400 });
    }

    const mappingKey = [keDanHao, keDanHang, String(nodeId)].join("|");
    const db = getDb();

    const [mapping] = await db
      .insert(traceabilityNodeMappings)
      .values({
        mappingKey,
        keDanHao,
        keDanHang,
        nodeId,
        nodeSeqNo: Number.isInteger(nodeSeqNo) ? nodeSeqNo : null,
        stage,
        process,
        notes,
        status,
        reviewedBy,
      })
      .onConflictDoUpdate({
        target: traceabilityNodeMappings.mappingKey,
        set: {
          nodeSeqNo: Number.isInteger(nodeSeqNo) ? nodeSeqNo : null,
          stage,
          process,
          notes,
          status,
          reviewedBy,
          updatedAt: new Date().toISOString(),
        },
      })
      .returning();

    return Response.json({ mapping: mapping as TraceabilityNodeMapping }, { status: 201 });
  } catch (error) {
    return Response.json({ error: toRouteErrorMessage(error) }, { status: 500 });
  }
}
