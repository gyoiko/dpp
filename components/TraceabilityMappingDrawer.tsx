"use client";

import { useState } from "react";
import { Loader2, X } from "lucide-react";
import type {
  DppStage,
  TraceabilityMappingStatus,
  TraceabilityNodeMapping,
  TraceabilityRecord,
} from "@/types/traceability";
import {
  DPP_STAGES,
  DPP_STAGE_LABELS,
  traceabilityNodeMappingKey,
} from "@/types/traceability";
import TraceabilityWorkflowPreview from "@/components/TraceabilityWorkflowPreview";

interface NodeDraft {
  stage: DppStage | "";
  process: string;
  notes: string;
}

const fieldClass =
  "h-9 w-full rounded-lg border border-[#d8dfcf] bg-white px-2.5 text-xs font-medium outline-none transition focus:border-[#174f3a] focus:ring-4 focus:ring-[#174f3a]/10";

function inferStage(role: string | null): DppStage | "" {
  const value = role?.toLowerCase() ?? "";

  if (value.includes("farm")) return "farm";
  if (value.includes("gin")) return "ginner";
  if (value.includes("trader")) return "trader";
  if (value.includes("spinner") || value.includes("yarn")) return "spinner";
  if (value.includes("knit") || value.includes("weav") || value.includes("fabric") || value.includes("dye")) return "fabric";
  if (value.includes("garment") || value.includes("cut") || value.includes("cmt")) return "garment";

  return "";
}

function buildDrafts(
  record: TraceabilityRecord,
  existing: Record<string, TraceabilityNodeMapping>,
): Record<number, NodeDraft> {
  const drafts: Record<number, NodeDraft> = {};

  for (const node of record.nodes) {
    const key = traceabilityNodeMappingKey(record.keDanHao, record.keDanHang, node.id);
    const mapping = existing[key];

    drafts[node.id] = {
      stage: mapping?.stage ?? inferStage(node.role),
      process: mapping?.process ?? node.role ?? "",
      notes: mapping?.notes ?? "",
    };
  }

  return drafts;
}

interface TraceabilityMappingDrawerProps {
  record: TraceabilityRecord;
  existing: Record<string, TraceabilityNodeMapping>;
  onClose: () => void;
  onSaved: (mappings: TraceabilityNodeMapping[]) => void;
}

export default function TraceabilityMappingDrawer({
  record,
  existing,
  onClose,
  onSaved,
}: TraceabilityMappingDrawerProps) {
  const [drafts, setDrafts] = useState<Record<number, NodeDraft>>(() => buildDrafts(record, existing));
  const [saving, setSaving] = useState<TraceabilityMappingStatus | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateDraft(nodeId: number, patch: Partial<NodeDraft>) {
    setDrafts((current) => ({
      ...current,
      [nodeId]: { ...current[nodeId], ...patch },
    }));
  }

  async function save(status: TraceabilityMappingStatus) {
    const mappedNodes = record.nodes.filter((node) => drafts[node.id]?.stage);

    if (mappedNodes.length === 0) {
      setError("Pilih minimal satu DPP stage sebelum menyimpan.");
      return;
    }

    setSaving(status);
    setError(null);

    try {
      const saved = await Promise.all(
        mappedNodes.map(async (node) => {
          const draft = drafts[node.id];

          const response = await fetch("/api/dpp/node-mappings", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              keDanHao: record.keDanHao,
              keDanHang: record.keDanHang,
              nodeId: node.id,
              nodeSeqNo: node.seqNo,
              stage: draft.stage,
              process: draft.process,
              notes: draft.notes,
              status,
            }),
          });

          const payload = (await response.json()) as { mapping?: TraceabilityNodeMapping; error?: string };

          if (!response.ok || !payload.mapping) {
            throw new Error(payload.error ?? "Gagal menyimpan mapping.");
          }

          return payload.mapping;
        }),
      );

      onSaved(saved);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Gagal menyimpan mapping.");
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="fixed inset-0 z-50">
      <button type="button" aria-label="Close mapping editor" className="absolute inset-0 bg-[#173127]/40" onClick={onClose} />
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="traceability-mapping-title"
        className="absolute inset-y-0 right-0 flex w-full max-w-3xl flex-col overflow-y-auto bg-[#fffef9] shadow-[0_0_60px_rgba(23,49,39,0.25)]"
      >
        <header className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-[#dfe3da] bg-[#fffef9] px-6 py-5">
          <div>
            <p className="text-[10px] font-extrabold tracking-[0.16em] text-[#7a8c80]">MAP TO DPP JOURNEY</p>
            <h2 id="traceability-mapping-title" className="mt-1 font-[family-name:var(--font-manrope)] text-xl font-bold tracking-[-0.02em]">
              {record.milRef}
            </h2>
            <p className="mt-1 text-xs text-[#7a8c80]">
              Supplier, country, lot, and quantity are loaded from the ERP and cannot be edited here.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#dfe3da] text-[#174f3a] transition hover:bg-[#eef1e7]"
          >
            <X size={16} />
          </button>
        </header>

        <div className="flex-1 space-y-4 px-6 py-5">
          {record.nodes.map((node) => {
            const draft = drafts[node.id] ?? { stage: "", process: "", notes: "" };
            const key = traceabilityNodeMappingKey(record.keDanHao, record.keDanHang, node.id);
            const saved = existing[key];

            return (
              <section key={node.id} className="rounded-2xl border border-[#e2e7d8] bg-white p-4">
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#eef0e8] pb-3">
                  <div>
                    <p className="text-[9px] font-extrabold uppercase tracking-[0.12em] text-[#7a8c80]">
                      #{node.seqNo ?? "—"} · {node.role ?? "Unnamed role"}
                    </p>
                    <p className="mt-1 text-sm font-bold text-[#173127]">{node.supplier ?? "—"}</p>
                    <p className="mt-0.5 text-xs text-[#6f7f77]">
                      {[node.country, node.branchLabel ? `Branch ${node.branchLabel}` : null]
                        .filter(Boolean)
                        .join(" · ") || "—"}
                      {node.directSupplier === null ? "" : node.directSupplier ? " · Direct" : " · Indirect"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-[#173127]">
                      {node.quantity === null ? "—" : `${node.quantity.toLocaleString("en-US")} ${node.unit ?? ""}`.trim()}
                    </p>
                    <p className="mt-0.5 text-[10px] text-[#7a8c80]">
                      Lot: {node.inputLot ?? "—"} → {node.outputLot ?? "—"}
                    </p>
                    {saved && (
                      <span
                        className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[9px] font-extrabold ${
                          saved.status === "reviewed" ? "bg-[#d9eedf] text-[#155b3d]" : "bg-[#f3e8bf] text-[#725d24]"
                        }`}
                      >
                        {DPP_STAGE_LABELS[saved.stage]} · {saved.status}
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div>
                    <label htmlFor={`stage-${node.id}`} className="mb-1 block text-[10px] font-extrabold uppercase tracking-[0.1em] text-[#7a8c80]">
                      DPP stage
                    </label>
                    <select
                      id={`stage-${node.id}`}
                      value={draft.stage}
                      onChange={(event) => updateDraft(node.id, { stage: event.target.value as DppStage | "" })}
                      className={fieldClass}
                    >
                      <option value="">Select stage…</option>
                      {DPP_STAGES.map((stage) => (
                        <option key={stage} value={stage}>
                          {DPP_STAGE_LABELS[stage]}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor={`process-${node.id}`} className="mb-1 block text-[10px] font-extrabold uppercase tracking-[0.1em] text-[#7a8c80]">
                      Process label
                    </label>
                    <input
                      id={`process-${node.id}`}
                      value={draft.process}
                      onChange={(event) => updateDraft(node.id, { process: event.target.value })}
                      className={fieldClass}
                    />
                  </div>
                </div>

                <div className="mt-3">
                  <label htmlFor={`notes-${node.id}`} className="mb-1 block text-[10px] font-extrabold uppercase tracking-[0.1em] text-[#7a8c80]">
                    Notes
                  </label>
                  <input
                    id={`notes-${node.id}`}
                    value={draft.notes}
                    onChange={(event) => updateDraft(node.id, { notes: event.target.value })}
                    placeholder="Optional reviewer note"
                    className={fieldClass}
                  />
                </div>
              </section>
            );
          })}

          {error && (
            <div role="alert" className="rounded-xl border border-[#e8c5ad] bg-[#f4ded6] px-4 py-3 text-sm font-medium text-[#8a4b3a]">
              {error}
            </div>
          )}
        </div>

        <footer className="sticky bottom-0 flex flex-wrap items-center justify-end gap-2 border-t border-[#dfe3da] bg-[#fffef9] px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="h-10 rounded-lg border border-[#d8dfcf] px-4 text-xs font-extrabold text-[#173127] transition hover:bg-[#f6f8ef]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => save("draft")}
            disabled={saving !== null}
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#174f3a] px-4 text-xs font-extrabold text-[#174f3a] transition hover:bg-[#eef1e7] disabled:opacity-60"
          >
            {saving === "draft" && <Loader2 size={14} className="animate-spin" />}
            Save draft
          </button>
          <button
            type="button"
            onClick={() => setPreviewOpen(true)}
            disabled={saving !== null}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#174f3a] px-4 text-xs font-extrabold text-white transition hover:bg-[#123e2d] disabled:opacity-60"
          >
            Preview
          </button>
        </footer>
      </aside>

      {previewOpen && (
        <TraceabilityWorkflowPreview record={record} drafts={drafts} onClose={() => setPreviewOpen(false)} />
      )}
    </div>
  );
}
