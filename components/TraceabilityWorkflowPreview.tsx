"use client";

import { Download, FileText, Loader2, Maximize2, Minus, Plus, X } from "lucide-react";
import { toPng } from "html-to-image";
import { jsPDF } from "jspdf";
import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { useDialogA11y } from "@/components/useDialogA11y";
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
  { id: "tier4", label: "Tier 4", stages: ["farm", "ginner"] },
  { id: "tier3", label: "Tier 3", stages: ["spinner"] },
  { id: "tier2", label: "Tier 2", stages: ["fabric"] },
  { id: "tier1", label: "Tier 1", stages: ["garment"] },
  { id: "brand", label: "Brand / Retailer", stages: ["customer", "other"] },
];

const SUPPORTING_GROUPS: Tier[] = [
  { id: "trader", label: "Trader / Broker / Agent", stages: ["trader", "yarn_trader"] },
  { id: "value-adding", label: "Value adding process", stages: ["dyeing"] },
];

const CARD_WIDTH = 290;
const CARD_HEIGHT = 138;
const CARD_GAP = 18;
const COLUMN_GAP = 96;
const CANVAS_PADDING = 32;
const HEADER_OFFSET = 64;
const MIN_ZOOM = 0.2;
const MAX_ZOOM = 2;
const ZOOM_STEP = 0.1;

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
  const supporting = SUPPORTING_GROUPS.map((group) => ({
    ...group,
    entries: mapped.filter((entry) => group.stages.includes(entry.stage)),
  }));

  const maxRows = Math.max(1, ...columns.map((column) => column.entries.length));
  const canvasWidth = CANVAS_PADDING * 2 + columns.length * CARD_WIDTH + (columns.length - 1) * COLUMN_GAP;
  const canvasHeight = HEADER_OFFSET + maxRows * (CARD_HEIGHT + CARD_GAP) + 24;
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
  const contentWidth = canvasWidth + 48;

  const viewportRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null>(null);
  const interactedRef = useRef(false);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 24, y: 24 });
  const [dragging, setDragging] = useState(false);
  const [exporting, setExporting] = useState<"png" | "pdf" | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  const dialogRef = useDialogA11y<HTMLDivElement>({ open: true, onEscape: onClose });

  const applyFit = useCallback(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const availableWidth = Math.max(1, viewport.clientWidth - 48);
    const fitted = Math.min(1, availableWidth / contentWidth);

    setZoom(Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, fitted)));
    setPan({ x: 24, y: 24 });
    interactedRef.current = false;
  }, [contentWidth]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const frame = window.requestAnimationFrame(() => {
      if (!interactedRef.current) applyFit();
    });
    const observer = new ResizeObserver(() => {
      if (!interactedRef.current) applyFit();
    });
    observer.observe(viewport);

    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [applyFit]);

  function changeZoom(delta: number) {
    interactedRef.current = true;
    setZoom((current) => {
      const next = Number((current + delta).toFixed(2));
      return Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, next));
    });
  }

  function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return;
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: pan.x,
      originY: pan.y,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragging(true);
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    interactedRef.current = true;
    setPan({
      x: drag.originX + (event.clientX - drag.startX),
      y: drag.originY + (event.clientY - drag.startY),
    });
  }

  function handlePointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    if (dragRef.current?.pointerId !== event.pointerId) return;
    dragRef.current = null;
    setDragging(false);
  }

  const exportBase = (record.milRef || "dpp-workflow").replace(/[^A-Za-z0-9._-]+/g, "-");

  async function renderExportImage() {
    const node = contentRef.current;
    if (!node) return null;
    return toPng(node, {
      pixelRatio: 2,
      backgroundColor: "#f4f3ec",
      cacheBust: true,
      style: {
        backgroundColor: "#f4f3ec",
        backgroundImage: "radial-gradient(#d7d3c2 1px, transparent 1px)",
        backgroundSize: "18px 18px",
      },
    });
  }

  async function exportPng() {
    setExportError(null);
    setExporting("png");
    try {
      const dataUrl = await renderExportImage();
      if (!dataUrl) return;
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = `${exportBase}-workflow.png`;
      link.click();
    } catch {
      setExportError("Gagal membuat PNG. Coba lagi.");
    } finally {
      setExporting(null);
    }
  }

  async function exportPdf() {
    setExportError(null);
    setExporting("pdf");
    try {
      const dataUrl = await renderExportImage();
      if (!dataUrl) return;

      const image = new Image();
      image.src = dataUrl;
      await new Promise<void>((resolve, reject) => {
        image.onload = () => resolve();
        image.onerror = () => reject(new Error("Image failed to load"));
      });

      const orientation = image.width >= image.height ? "landscape" : "portrait";
      const pdf = new jsPDF({
        orientation,
        unit: "px",
        format: [image.width, image.height],
        hotfixes: ["px_scaling"],
      });
      pdf.addImage(dataUrl, "PNG", 0, 0, image.width, image.height);
      pdf.save(`${exportBase}-workflow.pdf`);
    } catch {
      setExportError("Gagal membuat PDF. Coba lagi.");
    } finally {
      setExporting(null);
    }
  }

  return (
    <div
      ref={dialogRef}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-label="Workflow preview"
      className="fixed inset-0 z-[60] flex flex-col bg-[#f4f3ec]"
    >
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
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex h-10 items-center overflow-hidden rounded-lg border border-[#d8d5c5] bg-white">
            <button
              type="button"
              onClick={() => changeZoom(-ZOOM_STEP)}
              aria-label="Zoom out"
              className="flex h-10 w-9 items-center justify-center text-[#174f3a] transition hover:bg-[#eef1e7]"
            >
              <Minus size={15} />
            </button>
            <span className="w-12 text-center text-[11px] font-extrabold text-[#173127]">
              {Math.round(zoom * 100)}%
            </span>
            <button
              type="button"
              onClick={() => changeZoom(ZOOM_STEP)}
              aria-label="Zoom in"
              className="flex h-10 w-9 items-center justify-center text-[#174f3a] transition hover:bg-[#eef1e7]"
            >
              <Plus size={15} />
            </button>
            <button
              type="button"
              onClick={applyFit}
              aria-label="Fit to view"
              title="Fit to view"
              className="flex h-10 w-9 items-center justify-center border-l border-[#e5e2d4] text-[#174f3a] transition hover:bg-[#eef1e7]"
            >
              <Maximize2 size={15} />
            </button>
          </div>

          <button
            type="button"
            onClick={() => void exportPng()}
            disabled={exporting !== null}
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#174f3a] px-3 text-xs font-extrabold text-[#174f3a] transition hover:bg-[#eef1e7] disabled:opacity-60"
          >
            {exporting === "png" ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
            PNG
          </button>
          <button
            type="button"
            onClick={() => void exportPdf()}
            disabled={exporting !== null}
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#174f3a] px-3 text-xs font-extrabold text-[#174f3a] transition hover:bg-[#eef1e7] disabled:opacity-60"
          >
            {exporting === "pdf" ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
            PDF
          </button>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#174f3a] px-4 text-xs font-extrabold text-white transition hover:bg-[#123e2d]"
          >
            <X size={15} /> Close preview
          </button>
        </div>
      </header>

      {exportError && (
        <div role="alert" className="border-b border-[#e8c5ad] bg-[#f4ded6] px-6 py-2 text-xs font-semibold text-[#8a4b3a]">
          {exportError}
        </div>
      )}

      <div
        ref={viewportRef}
        className={`relative flex-1 touch-none overflow-hidden ${dragging ? "cursor-grabbing" : "cursor-grab"}`}
        style={{
          backgroundColor: "#f4f3ec",
          backgroundImage: "radial-gradient(#d7d3c2 1px, transparent 1px)",
          backgroundSize: "18px 18px",
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        {mapped.length === 0 ? (
          <div className="mx-auto mt-10 flex max-w-lg flex-col items-center gap-3 rounded-2xl border border-dashed border-[#c7c3b0] bg-[#fffef9] px-6 py-16 text-center">
            <p className="text-sm font-bold text-[#173127]">No mapped nodes yet</p>
            <p className="text-xs leading-5 text-[#7a8c80]">
              Select a DPP stage for at least one journey node, then open Preview again.
            </p>
          </div>
        ) : (
          <div
            className="absolute left-0 top-0 origin-top-left"
            style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}
          >
            <div ref={contentRef} className="relative" style={{ width: contentWidth }}>
            <div
              className="relative rounded-2xl border border-[#e0ddcd]"
              style={{
                width: canvasWidth,
                height: canvasHeight,
              }}
            >
              {columns.map((column, columnIndex) => (
                <div
                  key={`${column.id}-tier-box`}
                  className="pointer-events-none absolute rounded-2xl border border-[#c9c5b4] bg-white/45"
                  style={{
                    left: columnX(columnIndex) - 12,
                    top: 8,
                    width: CARD_WIDTH + 24,
                    height: canvasHeight - 16,
                  }}
                />
              ))}
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
                    const location = [entry.node.country, entry.node.branchLabel ? `Consignee ${entry.node.branchLabel}` : null]
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
                            Quantity PO {currency(entry.node.quantity)} {entry.node.unit ?? ""}
                          </span>
                        </div>

                        <div className="mt-2 flex flex-wrap items-center gap-1">
                          {entry.node.inputLot || entry.node.outputLot ? (
                            <span className="truncate rounded bg-[#f4f1e2] px-1.5 py-0.5 text-[8px] font-bold text-[#6f5b23]">
                              Raw Material {entry.node.inputLot ?? "—"} → Finish Good {entry.node.outputLot ?? "—"}
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

            {supporting.some((group) => group.entries.length > 0) && (
              <div
                className="mt-4 rounded-2xl border border-[#cfcbb8] bg-[#fffef9] p-4"
                style={{ width: canvasWidth }}
              >
                <div className="flex flex-wrap gap-5">
                  {supporting.map((group) =>
                    group.entries.length > 0 ? (
                      <div key={group.id} className="min-w-[240px] flex-1">
                        <p className="flex items-center gap-2 text-[9px] font-extrabold uppercase tracking-[0.12em] text-[#7a8c80]">
                          <span
                            className={`h-2.5 w-2.5 rounded-full ${
                              group.id === "trader" ? "bg-[#2c6a9a]" : "bg-[#4f8a3d]"
                            }`}
                          />
                          {group.label}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {group.entries.map((entry) => (
                            <span
                              key={entry.node.id}
                              className={`inline-flex max-w-full items-center gap-2 rounded-full px-3 py-1 text-[10px] font-bold ${
                                group.id === "trader"
                                  ? "bg-[#e8f0f7] text-[#2c5f86]"
                                  : "bg-[#eef4e7] text-[#174f3a]"
                              }`}
                            >
                              <span className="truncate">{entry.node.supplier ?? entry.node.role ?? "Unnamed"}</span>
                              <span className="truncate font-normal opacity-70">
                                {entry.draft.process || entry.node.role}
                              </span>
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : null,
                  )}
                </div>
              </div>
            )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
