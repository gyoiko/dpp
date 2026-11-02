"use client";

import { useMemo, useState } from "react";
import { Loader2, X } from "lucide-react";
import type {
  DppStage,
  TraceabilityNode,
  TraceabilityNodeMapping,
  TraceabilityRecord,
} from "@/types/traceability";
import { DPP_STAGE_LABELS, traceabilityNodeMappingKey } from "@/types/traceability";
import TraceabilityWorkflowPreview from "@/components/TraceabilityWorkflowPreview";
import { useDialogA11y } from "@/components/useDialogA11y";

interface NodeView {
  stage: DppStage | "";
  process: string;
  notes: string;
}

const ROLE_STAGE_MAP: Record<string, DppStage> = {
  "farmer / grower": "farm",
  farmer: "farm",
  grower: "farm",
  ginner: "ginner",
  "cotton trader": "trader",
  "spinner / yarn manufacturer": "spinner",
  spinner: "spinner",
  "yarn manufacturer": "spinner",
  "yarn trader / intermediary": "yarn_trader",
  "yarn trader": "yarn_trader",
  "weaver / knitter": "fabric",
  weaver: "fabric",
  knitter: "fabric",
  "dyeing & finishing": "dyeing",
  "dyeing / finishing": "dyeing",
  dyeing: "dyeing",
  "garment manufacturer": "garment",
  garment: "garment",
  customer: "customer",
  other: "other",
};

function normaliseRole(role: string | null): string {
  return (role ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

function inferStage(role: string | null): DppStage | "" {
  return ROLE_STAGE_MAP[normaliseRole(role)] ?? "";
}

function defaultProcess(node: TraceabilityNode): string {
  if (normaliseRole(node.role) === "other") {
    return node.roleDescription || node.processDescription || node.role || "";
  }

  return node.role || "";
}

function buildViews(
  record: TraceabilityRecord,
  existing: Record<string, TraceabilityNodeMapping>,
): Record<number, NodeView> {
  const views: Record<number, NodeView> = {};

  for (const node of record.nodes) {
    const key = traceabilityNodeMappingKey(record.keDanHao, record.keDanHang, node.id);
    const mapping = existing[key];

    views[node.id] = {
      stage: mapping?.stage ?? inferStage(node.role),
      process: mapping?.process ?? defaultProcess(node),
      notes: mapping?.notes ?? "",
    };
  }

  return views;
}

interface TraceabilityMappingDrawerProps {
  record: TraceabilityRecord;
  existing: Record<string, TraceabilityNodeMapping>;
  onNotify: (message: string) => void;
  onClose: () => void;
  onSaved: (mappings: TraceabilityNodeMapping[]) => void;
}

export default function TraceabilityMappingDrawer({
  record,
  existing,
  onNotify,
  onClose,
  onSaved,
}: TraceabilityMappingDrawerProps) {
  const views = useMemo(() => buildViews(record, existing), [record, existing]);
  const [saving, setSaving] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dialogRef = useDialogA11y<HTMLElement>({ open: !previewOpen, onEscape: onClose });

  async function saveDraft() {
    const mappedNodes = record.nodes.filter((node) => views[node.id]?.stage);

    if (mappedNodes.length === 0) {
      setError("Tidak ada node dengan DPP stage yang bisa disimpan.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const saved = await Promise.all(
        mappedNodes.map(async (node) => {
          const view = views[node.id];

          const response = await fetch("/api/dpp/node-mappings", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              keDanHao: record.keDanHao,
              keDanHang: record.keDanHang,
              nodeId: node.id,
              nodeSeqNo: node.seqNo,
              stage: view.stage,
              process: view.process,
              notes: view.notes,
              status: "draft",
            }),
          });

          const payload = (await response.json()) as { mapping?: TraceabilityNodeMapping; error?: string };

          if (!response.ok || !payload.mapping) {
            throw new Error(payload.error ?? "Gagal menyimpan journey nodes.");
          }

          return payload.mapping;
        }),
      );

      onNotify(
        `${saved.length} journey node${saved.length === 1 ? "" : "s"} saved. The DPP page can now be published.`,
      );
      onSaved(saved);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Gagal menyimpan journey nodes.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50">
      <button type="button" aria-label="Close journey view" className="absolute inset-0 bg-[#173127]/40" onClick={onClose} />
      <aside
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="traceability-mapping-title"
        className="absolute inset-y-0 right-0 flex w-full max-w-3xl flex-col overflow-y-auto bg-[#fffef9] shadow-[0_0_60px_rgba(23,49,39,0.25)]"
      >
        <header className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-[#dfe3da] bg-[#fffef9] px-6 py-5">
          <div>
            <p className="text-[11px] sm:text-[10px] font-extrabold tracking-[0.16em] text-[#7a8c80]">MAP TO DPP JOURNEY</p>
            <h2 id="traceability-mapping-title" className="mt-1 font-[family-name:var(--font-manrope)] text-xl font-bold tracking-[-0.02em]">
              {record.milRef}
            </h2>
            <p className="mt-1 text-xs text-[#7a8c80]">
              Read-only ERP data. Review the journey nodes, then save the draft to enable publishing this DPP page.
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
            const view = views[node.id] ?? { stage: "", process: "", notes: "" };
            const key = traceabilityNodeMappingKey(record.keDanHao, record.keDanHang, node.id);
            const saved = existing[key];

            return (
              <section key={node.id} className="rounded-2xl border border-[#e2e7d8] bg-white p-4">
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#eef0e8] pb-3">
                  <div>
                    <p className="text-[10px] sm:text-[9px] font-extrabold uppercase tracking-[0.12em] text-[#7a8c80]">
                      #{node.seqNo ?? "—"} · {node.role ?? "Unnamed role"}
                      {node.roleDescription ? ` · ${node.roleDescription}` : ""}
                    </p>
                    <p className="mt-1 text-sm font-bold text-[#173127]">{node.supplier ?? "—"}</p>
                    <p className="mt-0.5 text-xs text-[#6f7f77]">
                      {[node.country, node.branchLabel ? `Consignee ${node.branchLabel}` : null]
                        .filter(Boolean)
                        .join(" · ") || "—"}
                      {node.directSupplier === null ? "" : node.directSupplier ? " · Direct" : " · Indirect"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] sm:text-[9px] font-extrabold uppercase tracking-[0.1em] text-[#7a8c80]">Quantity PO</p>
                    <p className="text-sm font-bold text-[#173127]">
                      {node.quantity === null ? "—" : `${node.quantity.toLocaleString("en-US")} ${node.unit ?? ""}`.trim()}
                    </p>
                    <p className="mt-0.5 text-[11px] sm:text-[10px] text-[#7a8c80]">
                      Quantity RAW Material: {node.inputLot ?? "—"} → Quantity Finish Good: {node.outputLot ?? "—"}
                    </p>
                    {saved && (
                      <span className="mt-1 inline-flex rounded-full bg-[#f3e8bf] px-2 py-0.5 text-[10px] sm:text-[9px] font-extrabold text-[#725d24]">
                        {DPP_STAGE_LABELS[saved.stage]} · {saved.status}
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div>
                    <p className="text-[11px] sm:text-[10px] font-extrabold uppercase tracking-[0.1em] text-[#7a8c80]">
                      DPP stage
                    </p>
                    <p className="mt-1 text-sm font-bold text-[#173127]">
                      {view.stage ? DPP_STAGE_LABELS[view.stage] : "Not mapped"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] sm:text-[10px] font-extrabold uppercase tracking-[0.1em] text-[#7a8c80]">
                      Process label
                    </p>
                    <p className="mt-1 text-sm font-semibold text-[#173127]">{view.process || "—"}</p>
                  </div>
                </div>

                {view.notes ? (
                  <div className="mt-3">
                    <p className="text-[11px] sm:text-[10px] font-extrabold uppercase tracking-[0.1em] text-[#7a8c80]">
                      Notes
                    </p>
                    <p className="mt-1 text-xs text-[#6f7f77]">{view.notes}</p>
                  </div>
                ) : null}

                <p className="mt-3 text-[10px] sm:text-[9px] leading-4 text-[#7a8c80]">
                  DPP stage and process label are derived automatically from the ERP role. ERP values are read-only.
                </p>
              </section>
            );
          })}

          {error && (
            <div role="alert" className="rounded-xl border border-[#e8c5ad] bg-[#f4ded6] px-4 py-3 text-sm font-medium text-[#8a4b3a]">
              {error}
            </div>
          )}
        </div>

        <footer className="sticky bottom-0 flex flex-wrap items-center gap-2 border-t border-[#dfe3da] bg-[#fffef9] px-6 py-4">
          <p className="mr-auto text-[10px] sm:text-[9px] leading-4 text-[#7a8c80]">
            Saving the draft enables the page to be published.
          </p>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="h-10 rounded-lg border border-[#d8dfcf] px-4 text-xs font-extrabold text-[#173127] transition hover:bg-[#f6f8ef] disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => setPreviewOpen(true)}
            disabled={saving}
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#d8dfcf] px-4 text-xs font-extrabold text-[#173127] transition hover:bg-[#f6f8ef] disabled:opacity-60"
          >
            Preview
          </button>
          <button
            type="button"
            onClick={() => void saveDraft()}
            disabled={saving}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#174f3a] px-4 text-xs font-extrabold text-white transition hover:bg-[#123e2d] disabled:opacity-60"
          >
            {saving && <Loader2 size={14} className="animate-spin" />}
            Save draft
          </button>
        </footer>
      </aside>

      {previewOpen && (
        <TraceabilityWorkflowPreview record={record} drafts={views} onClose={() => setPreviewOpen(false)} />
      )}
    </div>
  );
}
