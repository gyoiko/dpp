"use client";

import { X } from "lucide-react";
import type { DppStage, TraceabilityNode, TraceabilityRecord } from "@/types/traceability";
import { DPP_STAGE_LABELS } from "@/types/traceability";

export interface WorkflowDraft {
  stage: DppStage | "";
  process: string;
  notes: string;
}

interface TraceabilityWorkflowPreviewProps {
  record: TraceabilityRecord;
  drafts: Record<number, WorkflowDraft>;
  onClose: () => void;
}

type MappedEntry = {
  node: TraceabilityNode;
  draft: WorkflowDraft;
  stage: DppStage;
};

type Tier = {
  id: string;
  label: string;
  stages: DppStage[];
};

const TIERS: Tier[] = [
  { id: "tier3", label: "Tier 3 Supplier", stages: ["farm", "ginner", "trader"] },
  { id: "tier2", label: "Tier 2 Supplier", stages: ["spinner", "fabric"] },
  { id: "factory", label: "Factory", stages: ["garment"] },
];

const CARD_WIDTH = 290;
const CARD_HEIGHT = 138;
const CARD_GAP = 18;
const COLUMN_GAP = 96;
const CANVAS_PADDING = 32;
const HEADER_OFFSET = 64;

function initials(value: string): string {
  const words = value
    .split(/[\s/&.-]+/)
    .map((word) => word.trim())
    .filter(Boolean);

  if (words.length === 0) return "NA";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();

  return words
    .slice(0, 3)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
}

function currency(value: number | null): string {
  return value === null ? "—" : value.toLocaleString("en-US");
}

export default function TraceabilityWorkflowPreview({ record, drafts, onClose }: TraceabilityWorkflowPreviewProps) {
  const mapped: MappedEntry[] = record.nodes.flatMap((node) => {
    const draft = drafts[node.id];

    if (!draft?.stage) {
      return [];
    }

    return [{ node, draft, stage: draft.stage }];
  });

  const columns = TIERS.map((tier) => ({
    ...tier,
    entries: mapped.filter((entry) => tier.stages.includes(entry.stage)),
  }));

  const maxRows = Math.max(1, ...columns.map((column) => column.entries.length));
  const canvasWidth = CANVAS_PADDING * 2 + columns.length * CARD_WIDTH + (columns.length - 1) * COLUMN_GAP;
  const canvasHeight = HEADER_OFFSET + maxRows * (CARD_HEIGHT + CARD_GAP) + 24;
  const productPanelWidth = 230;
  const columnX = (index: number) => CANVAS_PADDING + index * (CARD_WIDTH + COLUMN_GAP);
  const cardY = (row: number) => HEADER_OFFSET + row * (CARD_HEIGHT + CARD_GAP);

  const positions = new Map<number, { x: number; y: number; column: number }>();

  columns.forEach((column, columnIndex) => {
    column.entries.forEach((entry, rowIndex) => {
      positions.set(entry.node.id, { x: columnX(columnIndex), y: cardY(rowIndex), column: columnIndex });
    });
  });

  const entriesBySeq = new Map<number, MappedEntry>();

  for (const entry of mapped) {
    if (entry.node.seqNo !== null) {
      entriesBySeq.set(entry.node.seqNo, entry);
    }
  }

  const edges: { key: string; x1: number; y1: number; x2: number; y2: number }[] = [];

  for (const entry of mapped) {
    const target = positions.get(entry.node.id);

    if (!target) continue;

    const upstream = entry.node.upstreamSeqNos
      .map((seq) => entriesBySeq.get(seq))
      .filter((value): value is MappedEntry => Boolean(value));

    for (const sourceEntry of upstream) {
      const source = positions.get(sourceEntry.node.id);

      if (!source || source.column >= target.column) continue;

      edges.push({
        key: `${sourceEntry.node.id}-${entry.node.id}`,
        x1: source.x + CARD_WIDTH,
        y1: source.y + CARD_HEIGHT / 2,
        x2: target.x,
        y2: target.y + CARD_HEIGHT / 2,
      });
    }
  }

  if (edges.length === 0) {
    for (let index = 0; index < columns.length - 1; index += 1) {
      for (const sourceEntry of columns[index].entries) {
        const source = positions.get(sourceEntry.node.id);

        for (const targetEntry of columns[index + 1].entries) {
          const target = positions.get(targetEntry.node.id);

          if (!source || !target) continue;

          edges.push({
            key: `${sourceEntry.node.id}-${targetEntry.node.id}`,
            x1: source.x + CARD_WIDTH,
            y1: source.y + CARD_HEIGHT / 2,
            x2: target.x,
            y2: target.y + CARD_HEIGHT / 2,
          });
        }
      }
    }
  }

  const unmapped = record.nodes.length - mapped.length;

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-[#f4f3ec]">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[#d8d5c5] bg-[#fffef9] px-6 py-4">
        <div>
          <p className="text-[10px] font-extrabold tracking-[0.18em] text-[#7a8c80]">WORKFLOW PREVIEW</p>
          <h2 className="mt-1 font-[family-name:var(--font-manrope)] text-xl font-bold tracking-[-0.02em]">
            {record.header?.style || record.milRef} · {record.milRef}
          </h2>
          <p className="mt-1 text-xs text-[#7a8c80]">
            Preview only — nothing is saved. {mapped.length} mapped node{mapped.length === 1 ? "" : "s"}
            {unmapped > 0 ? ` · ${unmapped} unmapped hidden` : ""}.
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#174f3a] px-4 text-xs font-extrabold text-[#174f3a] transition hover:bg-[#eef1e7]"
        >
          <X size={15} /> Close preview
        </button>
      </header>

      <div className="flex-1 overflow-auto p-6">
        {mapped.length === 0 ? (
          <div className="mx-auto flex max-w-lg flex-col items-center gap-3 rounded-2xl border border-dashed border-[#c7c3b0] bg-[#fffef9] px-6 py-16 text-center">
            <p className="text-sm font-bold text-[#173127]">No mapped nodes yet</p>
            <p className="text-xs leading-5 text-[#7a8c80]">
              Select a DPP stage for at least one journey node, then open Preview again.
            </p>
          </div>
        ) : (
          <div className="relative mx-auto" style={{ width: canvasWidth + productPanelWidth + 48 }}>
            <div
              className="relative rounded-2xl border border-[#e0ddcd]"
              style={{
                width: canvasWidth,
                height: canvasHeight,
                backgroundImage: "radial-gradient(#d7d3c2 1px, transparent 1px)",
                backgroundSize: "18px 18px",
              }}
            >
              <svg className="pointer-events-none absolute inset-0" width={canvasWidth} height={canvasHeight} aria-hidden="true">
                {edges.map((edge) => (
                  <path
                    key={edge.key}
                    d={`M ${edge.x1} ${edge.y1} C ${edge.x1 + 52} ${edge.y1}, ${edge.x2 - 52} ${edge.y2}, ${edge.x2} ${edge.y2}`}
                    fill="none"
                    stroke="#a7a99a"
                    strokeWidth="1.4"
                  />
                ))}
              </svg>

              {columns.map((column, columnIndex) => (
                <div key={column.id} className="absolute" style={{ left: columnX(columnIndex), top: 0, width: CARD_WIDTH }}>
                  <div className="flex items-center justify-between px-1" style={{ height: HEADER_OFFSET }}>
                    <span className="rounded-full border border-[#d3d0c0] bg-[#fffef9] px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-[0.12em] text-[#6f7f77]">
                      {column.label}
                    </span>
                    <span className="text-[9px] font-bold text-[#9aa69f]">{column.entries.length}</span>
                  </div>

                  {column.entries.map((entry, rowIndex) => {
                    const location = [entry.node.country, entry.node.branchLabel ? `Branch ${entry.node.branchLabel}` : null]
                      .filter(Boolean)
                      .join(" · ");
                    const process = entry.draft.process || entry.node.role || DPP_STAGE_LABELS[entry.stage];

                    return (
                      <article
                        key={entry.node.id}
                        className="absolute flex flex-col rounded-xl border border-[#cfcbb8] bg-[#fffef9] p-4 shadow-[0_6px_18px_rgba(23,49,39,0.06)]"
                        style={{ top: cardY(rowIndex), width: CARD_WIDTH, height: CARD_HEIGHT }}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-bold text-[#173127]">{entry.node.supplier ?? "Unnamed supplier"}</p>
                            <p className="mt-0.5 truncate text-[11px] font-semibold text-[#5f6f67]">{process}</p>
                          </div>
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#174f3a] text-[9px] font-extrabold text-white">
                            {initials(entry.node.supplier ?? entry.node.role ?? "NA")}
                          </span>
                        </div>

                        <p className="mt-1 truncate text-[10px] text-[#7a8c80]">{location || "Location not documented"}</p>

                        <div className="mt-auto flex items-end justify-between gap-2 pt-2">
                          <span className="rounded-full bg-[#eef4e7] px-2 py-0.5 text-[9px] font-extrabold text-[#174f3a]">
                            {DPP_STAGE_LABELS[entry.stage]}
                          </span>
                          <span className="text-[10px] font-bold text-[#173127]">
                            {currency(entry.node.quantity)} {entry.node.unit ?? ""}
                          </span>
                        </div>

                        <div className="mt-2 flex flex-wrap items-center gap-1">
                          {entry.node.inputLot || entry.node.outputLot ? (
                            <span className="truncate rounded bg-[#f4f1e2] px-1.5 py-0.5 text-[8px] font-bold text-[#6f5b23]">
                              Lot {entry.node.inputLot ?? "—"} → {entry.node.outputLot ?? "—"}
                            </span>
                          ) : null}
                          {entry.node.directSupplier === null ? null : (
                            <span className="rounded bg-[#eef1e7] px-1.5 py-0.5 text-[8px] font-bold text-[#5f6f67]">
                              {entry.node.directSupplier ? "Direct" : "Indirect"}
                            </span>
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>
              ))}
            </div>

            <aside
              className="absolute right-0 top-0 rounded-2xl border border-[#cfcbb8] bg-[#fffef9] p-4 shadow-[0_6px_18px_rgba(23,49,39,0.06)]"
              style={{ width: productPanelWidth }}
            >
              <p className="text-[9px] font-extrabold uppercase tracking-[0.14em] text-[#7a8c80]">Digital Product Passport</p>
              <p className="mt-2 text-sm font-bold text-[#173127]">{record.header?.style || record.milRef}</p>
              <p className="mt-1 text-[10px] font-semibold text-[#7a8c80]">{record.milRef}</p>
              <div className="mt-3 space-y-1.5 text-[10px] text-[#6f7f77]">
                <p><span className="font-bold text-[#173127]">Buyer:</span> {record.header?.buyer ?? "—"}</p>
                <p><span className="font-bold text-[#173127]">Buyer PO:</span> {record.header?.buyerPo ?? "—"}</p>
                <p><span className="font-bold text-[#173127]">Scope:</span> {record.header?.scope ?? "—"}</p>
              </div>
              <div className="mt-4 flex aspect-square items-center justify-center rounded-xl border border-dashed border-[#c7c3b0] bg-[#f7f6ef] px-3 text-center text-[9px] font-semibold leading-4 text-[#9aa69f]">
                QR code is generated on the published DPP page
              </div>
            </aside>
          </div>
        )}
      </div>
    </div>
  );
}
