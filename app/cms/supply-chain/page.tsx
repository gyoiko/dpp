"use client";

import type { FormEvent } from "react";
import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  ChevronDown,
  Copy,
  Database,
  ExternalLink,
  FileText,
  Loader2,
  QrCode,
  RefreshCw,
  Search,
  SearchX,
  X,
} from "lucide-react";
import DppPageSettingsDrawer from "@/components/DppPageSettingsDrawer";
import DppQrCode from "@/components/DppQrCode";
import Toast, { type ToastMessage } from "@/components/Toast";
import TraceabilityMappingDrawer from "@/components/TraceabilityMappingDrawer";
import { useDialogA11y } from "@/components/useDialogA11y";
import type { DppPageStatus } from "@/types/dppPage";
import type { TraceabilityNodeMapping, TraceabilityRecord } from "@/types/traceability";
import { DPP_STAGE_LABELS, traceabilityNodeMappingKey } from "@/types/traceability";

const RECENT_SEARCHES_KEY = "dpp-cms-recent-milrefs";

function readRecentSearches(): string[] {
  try {
    const raw = window.localStorage.getItem(RECENT_SEARCHES_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is string => typeof item === "string").slice(0, 5);
  } catch {
    return [];
  }
}

function ReadOnlyField({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <p className="text-[10px] sm:text-[9px] font-extrabold uppercase tracking-[0.1em] text-[#8a978f]">{label}</p>
      <p className="mt-1 text-sm font-semibold text-[#173127]">{value || "—"}</p>
    </div>
  );
}

function MappingBadge({ mapping }: { mapping: TraceabilityNodeMapping }) {
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      <span className="rounded-full bg-[#eef4e7] px-2 py-0.5 text-[11px] sm:text-[10px] font-extrabold text-[#174f3a]">
        {DPP_STAGE_LABELS[mapping.stage]}
      </span>
      <span
        className={`rounded-full px-2 py-0.5 text-[10px] sm:text-[9px] font-extrabold ${
          mapping.status === "reviewed" ? "bg-[#d9eedf] text-[#155b3d]" : "bg-[#f3e8bf] text-[#725d24]"
        }`}
      >
        {mapping.status === "reviewed" ? "Reviewed" : "Draft"}
      </span>
    </span>
  );
}

export default function SupplyChainMappingPage() {
  const [milRef, setMilRef] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [lastSearched, setLastSearched] = useState<string | null>(null);
  const [traceability, setTraceability] = useState<TraceabilityRecord | null>(null);
  const [traceabilityLoading, setTraceabilityLoading] = useState(false);
  const [traceabilityError, setTraceabilityError] = useState<string | null>(null);
  const [nodeMappings, setNodeMappings] = useState<Record<string, TraceabilityNodeMapping>>({});
  const [mappingOpen, setMappingOpen] = useState(false);
  const [pageSettingsOpen, setPageSettingsOpen] = useState(false);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [pageExists, setPageExists] = useState(false);
  const [pageStatus, setPageStatus] = useState<DppPageStatus | null>(null);
  const [knownMilRefs, setKnownMilRefs] = useState<string[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [expandedNodeId, setExpandedNodeId] = useState<number | null>(null);
  const [qrOpen, setQrOpen] = useState(false);

  const qrDialogRef = useDialogA11y<HTMLDivElement>({ open: qrOpen, onEscape: () => setQrOpen(false) });

  const dismissToast = useCallback(() => setToast(null), []);
  const notify = useCallback((message: string) => {
    setToast({ id: Date.now(), message });
  }, []);

  useEffect(() => {
    let active = true;

    fetch("/api/dpp/pages")
      .then((response) => (response.ok ? response.json() : null))
      .then((payload: { pages?: Array<{ milRef?: string }> } | null) => {
        if (!active) return;
        const refs = (payload?.pages ?? [])
          .map((page) => page.milRef)
          .filter((ref): ref is string => Boolean(ref));
        setKnownMilRefs(Array.from(new Set(refs)));
      })
      .catch(() => undefined);

    return () => {
      active = false;
    };
  }, []);

  async function refreshPageStatus(milRefValue: string) {
    try {
      const response = await fetch(`/api/dpp/pages?milRef=${encodeURIComponent(milRefValue)}`);
      if (!response.ok) {
        setPageExists(false);
        setPageStatus(null);
        return;
      }
      const payload = (await response.json()) as { page?: { status?: DppPageStatus } | null };
      setPageExists(Boolean(payload.page));
      setPageStatus(payload.page?.status ?? null);
    } catch {
      setPageExists(false);
      setPageStatus(null);
    }
  }

  function rememberSearch(value: string) {
    const next = [value, ...readRecentSearches().filter((item) => item !== value)].slice(0, 5);
    setRecentSearches(next);
    try {
      window.localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next));
    } catch {
      // Storage can be unavailable; recent searches are a convenience only.
    }
  }

  async function loadTraceability(milRefValue: string) {
    setTraceabilityLoading(true);
    setTraceabilityError(null);
    void refreshPageStatus(milRefValue);

    try {
      const response = await fetch(`/api/dpp/traceability/${encodeURIComponent(milRefValue)}`);
      const payload = (await response.json()) as TraceabilityRecord | { error: string };

      if (response.status === 404) {
        setTraceability(null);
        setNodeMappings({});
        return;
      }

      if (!response.ok || "error" in payload) {
        throw new Error("error" in payload ? payload.error : "Failed to load DPP traceability data.");
      }

      setTraceability(payload);
      setLastSearched(payload.milRef);

      const mappingResponse = await fetch(`/api/dpp/node-mappings?milRef=${encodeURIComponent(payload.milRef)}`);

      if (!mappingResponse.ok) {
        setNodeMappings({});
        return;
      }

      const mappingPayload = (await mappingResponse.json()) as { mappings?: TraceabilityNodeMapping[] };
      const next: Record<string, TraceabilityNodeMapping> = {};

      for (const mapping of mappingPayload.mappings ?? []) {
        next[mapping.mappingKey] = mapping;
      }

      setNodeMappings(next);
    } catch (loadError) {
      setTraceability(null);
      setNodeMappings({});
      setTraceabilityError(loadError instanceof Error ? loadError.message : "Failed to load DPP traceability data.");
    } finally {
      setTraceabilityLoading(false);
    }
  }

  function runSearch(value: string) {
    const query = value.trim();

    if (!query) {
      setError("Please enter a MilRef before searching.");
      return;
    }

    setError(null);
    setLastSearched(query);
    setTraceability(null);
    setTraceabilityError(null);
    setNodeMappings({});
    setMappingOpen(false);
    setPageSettingsOpen(false);
    setExpandedNodeId(null);
    setQrOpen(false);
    rememberSearch(query);
    void loadTraceability(query);
  }

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    runSearch(milRef);
  }

  async function copyPublicUrl() {
    if (!absolutePublicUrl) return;
    try {
      await navigator.clipboard.writeText(absolutePublicUrl);
      notify("Public URL copied.");
    } catch {
      notify("Clipboard unavailable. Copy the URL from Page settings.");
    }
  }

  const publicPath = lastSearched ? `/dpp/${encodeURIComponent(lastSearched)}` : "";
  const absolutePublicUrl = !publicPath
    ? ""
    : typeof window === "undefined"
      ? publicPath
      : `${window.location.origin}${publicPath}`;
  const milRefSuggestions = Array.from(new Set([...recentSearches, ...knownMilRefs])).slice(0, 20);

  return (
    <main className="min-h-screen bg-[#e8e8dd] px-4 py-8 text-[#173127] sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-6xl">
        <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] sm:text-[10px] font-extrabold tracking-[0.18em] text-[#7a8c80]">SCM CONSOLE</p>
            <h1 className="mt-2 font-[family-name:var(--font-manrope)] text-3xl font-bold leading-tight tracking-[-0.03em]">
              Supply Chain Mapping
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#6f7f77]">
              Pull read-only traceability data from the DPP database by MilRef, then map each node to the DPP journey.
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-[#d3dcc8] bg-[#f6f8ef] px-3 py-2 text-xs sm:text-[11px] font-bold text-[#174f3a]">
            <Database size={14} />
            DPP traceability · read-only
          </div>
        </header>

        <section className="rounded-3xl border border-[#1731270f] bg-[#fffef9] p-5 shadow-[0_24px_80px_rgba(30,47,39,0.10)] sm:p-6">
          <form onSubmit={handleSearch} className="flex flex-col gap-3 sm:flex-row">
            <div className="flex-1">
              <label htmlFor="milref" className="sr-only">
                MilRef
              </label>
              <div className="relative">
                <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#7a8c80]" />
                <input
                  id="milref"
                  type="text"
                  list="milref-suggestions"
                  value={milRef}
                  onChange={(event) => setMilRef(event.target.value)}
                  onFocus={() => setRecentSearches(readRecentSearches())}
                  placeholder="Input MilRef, e.g., B02345-1"
                  autoComplete="off"
                  className="h-12 w-full rounded-xl border border-[#d8dfcf] bg-white pl-11 pr-4 text-sm font-medium outline-none transition focus:border-[#174f3a] focus:ring-4 focus:ring-[#174f3a]/10"
                />
                <datalist id="milref-suggestions">
                  {milRefSuggestions.map((ref) => (
                    <option key={ref} value={ref} />
                  ))}
                </datalist>
              </div>
            </div>
            <button
              type="submit"
              disabled={traceabilityLoading}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#174f3a] px-6 text-sm font-extrabold text-white transition hover:bg-[#123e2d] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {traceabilityLoading ? <Loader2 size={17} className="animate-spin" /> : <Search size={17} />}
              {traceabilityLoading ? "Loading…" : "Search / Load Data"}
            </button>
          </form>

          {recentSearches.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="text-[10px] sm:text-[9px] font-extrabold uppercase tracking-[0.12em] text-[#8a978f]">Recent</span>
              {recentSearches.map((ref) => (
                <button
                  key={ref}
                  type="button"
                  onClick={() => {
                    setMilRef(ref);
                    runSearch(ref);
                  }}
                  className="rounded-full border border-[#d8dfcf] bg-[#f6f8ef] px-2.5 py-1 text-[11px] sm:text-[10px] font-extrabold text-[#174f3a] transition hover:bg-[#eef1e7]"
                >
                  {ref}
                </button>
              ))}
            </div>
          )}

          {error && (
            <div role="alert" className="mt-4 rounded-xl border border-[#e8c5ad] bg-[#f4ded6] px-4 py-3 text-sm font-medium text-[#8a4b3a]">
              {error}
            </div>
          )}
        </section>

        {lastSearched ? (
          <section className="mt-6 rounded-3xl border border-[#1731270f] bg-[#fffef9] p-5 shadow-[0_24px_80px_rgba(30,47,39,0.10)] sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#dfe3da] pb-3">
              <div>
                <h2 className="font-[family-name:var(--font-manrope)] text-sm font-bold">
                  DPP traceability journey
                  <span className="ml-2 font-normal text-[#7a8c80]">· {lastSearched}</span>
                </h2>
                <p className="mt-1 text-xs text-[#7a8c80]">
                  Loaded from T_溯源_*. Supplier, country, consignee, and quantities are read-only.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {pageExists ? (
                  <span
                    className={`inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-[11px] sm:text-[10px] font-extrabold ${
                      pageStatus === "published"
                        ? "border-[#b9d8c4] bg-[#d9eedf] text-[#155b3d]"
                        : "border-[#e2d3a2] bg-[#f3e8bf] text-[#725d24]"
                    }`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        pageStatus === "published" ? "bg-[#155b3d]" : "bg-[#725d24]"
                      }`}
                    />
                    {pageStatus === "published" ? "DPP Published" : "DPP Draft"}
                  </span>
                ) : (
                  <span className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#d8dfcf] bg-[#f0f2ea] px-3 text-[11px] sm:text-[10px] font-extrabold text-[#7a8c80]">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#9aa69f]" />
                    No DPP page
                  </span>
                )}

                {pageStatus === "published" && publicPath && (
                  <a
                    href={publicPath}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#174f3a] px-3 text-[11px] sm:text-[10px] font-extrabold text-[#174f3a] transition hover:bg-[#eef1e7]"
                  >
                    <ExternalLink size={12} /> Open page
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => void copyPublicUrl()}
                  disabled={!absolutePublicUrl}
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#d8dfcf] px-3 text-[11px] sm:text-[10px] font-extrabold text-[#173127] transition hover:bg-[#f6f8ef] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Copy size={12} /> Copy URL
                </button>
                <button
                  type="button"
                  onClick={() => setQrOpen(true)}
                  disabled={!absolutePublicUrl}
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#d8dfcf] px-3 text-[11px] sm:text-[10px] font-extrabold text-[#173127] transition hover:bg-[#f6f8ef] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <QrCode size={12} /> QR
                </button>
                <button
                  type="button"
                  onClick={() => setPageSettingsOpen(true)}
                  disabled={!lastSearched}
                  className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#174f3a] px-4 text-xs sm:text-[11px] font-extrabold text-[#174f3a] transition hover:bg-[#eef1e7] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Page settings
                </button>
                <button
                  type="button"
                  onClick={() => setMappingOpen(true)}
                  disabled={!traceability || traceability.nodes.length === 0}
                  className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#174f3a] px-4 text-xs sm:text-[11px] font-extrabold text-white transition hover:bg-[#123e2d] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Map DPP journey
                </button>
              </div>
            </div>

            {traceabilityLoading ? (
              <div className="mt-4 animate-pulse space-y-4" aria-live="polite" aria-busy="true">
                <span className="sr-only">Loading DPP traceability…</span>
                <div className="grid grid-cols-2 gap-4 rounded-xl border border-[#e2e7d8] bg-[#f6f8ef] p-4 sm:grid-cols-3">
                  {Array.from({ length: 6 }).map((_, index) => (
                    <div key={index}>
                      <div className="h-2 w-16 rounded bg-[#dfe5d6]" />
                      <div className="mt-2 h-4 w-24 rounded bg-[#e8ece0]" />
                    </div>
                  ))}
                </div>
                <div className="flex flex-wrap gap-2">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <div key={index} className="h-6 w-28 rounded-full bg-[#e8ece0]" />
                  ))}
                </div>
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <div key={index} className="rounded-xl border border-[#e1e5db] bg-white p-4">
                      <div className="h-2 w-32 rounded bg-[#dfe5d6]" />
                      <div className="mt-2 h-4 w-56 rounded bg-[#e8ece0]" />
                      <div className="mt-2 h-3 w-40 rounded bg-[#eef1e7]" />
                      <div className="mt-3 h-3 w-full rounded bg-[#f2f4ec]" />
                    </div>
                  ))}
                </div>
              </div>
            ) : traceabilityError ? (
              <div role="alert" className="mt-4 rounded-xl border border-[#e8c5ad] bg-[#f4ded6] px-4 py-3 text-sm font-medium text-[#8a4b3a]">
                <p>{traceabilityError}</p>
                <button
                  type="button"
                  onClick={() => lastSearched && void loadTraceability(lastSearched)}
                  className="mt-2 inline-flex h-8 items-center gap-1.5 rounded-lg border border-[#8a4b3a] px-3 text-[11px] sm:text-[10px] font-extrabold text-[#8a4b3a] transition hover:bg-[#efd2c8]"
                >
                  <RefreshCw size={12} /> Retry
                </button>
              </div>
            ) : !traceability ? (
              <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#eef1e7] text-[#174f3a]">
                  <SearchX size={22} />
                </span>
                <p className="text-sm font-semibold text-[#173127]">No DPP traceability record found for this MilRef</p>
                <p className="max-w-md text-xs leading-5 text-[#7a8c80]">
                  Make sure the MilRef exists in T_溯源_主表 (tesdatt5). Publishing is disabled until traceability data is
                  available.
                </p>
              </div>
            ) : (
              <>
                <div className="mt-4 grid grid-cols-2 gap-4 rounded-xl border border-[#e2e7d8] bg-[#f6f8ef] p-4 sm:grid-cols-3">
                  <ReadOnlyField label="Mill No" value={traceability.header?.millNo ?? null} />
                  <ReadOnlyField label="Buyer" value={traceability.header?.buyer ?? null} />
                  <ReadOnlyField label="GTI PO" value={traceability.header?.buyerPo ?? null} />
                  <ReadOnlyField label="Style" value={traceability.header?.style ?? null} />
                  <ReadOnlyField label="Scope" value={traceability.header?.scope ?? null} />
                  <ReadOnlyField label="Status" value={traceability.header?.status ?? null} />
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {traceability.fibres.length > 0 ? (
                    traceability.fibres.map((fibre, index) => (
                      <span key={`${fibre.fibreType ?? "fibre"}-${index}`} className="rounded-full bg-[#eef4e7] px-2.5 py-1 text-[11px] sm:text-[10px] font-extrabold text-[#174f3a]">
                        {fibre.fibreType ?? "Fibre"} {fibre.percentage === null ? "" : `${fibre.percentage}%`}
                        {fibre.sourceLot ? ` · Yarn Count ${fibre.sourceLot}` : ""}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-[#7a8c80]">No fibre composition recorded.</span>
                  )}
                </div>

                <div className="mt-5 flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-[11px] sm:text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#7a8c80]">Journey nodes</h3>
                  <span className="text-[11px] sm:text-[10px] font-bold text-[#7a8c80]">
                    {traceability.nodes.length} node{traceability.nodes.length === 1 ? "" : "s"} · {traceability.documents.length} document
                    {traceability.documents.length === 1 ? "" : "s"}
                  </span>
                </div>

                <div className="mt-2 grid gap-2">
                  {traceability.nodes.length === 0 ? (
                    <p className="text-sm text-[#7a8c80]">No journey nodes recorded for this MilRef.</p>
                  ) : (
                    traceability.nodes.map((node) => {
                      const mapping = nodeMappings[traceabilityNodeMappingKey(traceability.keDanHao, traceability.keDanHang, node.id)];
                      const nodeDocuments = traceability.documents.filter((document) => document.nodeId === node.id);
                      const documentCount = node.documentCount ?? nodeDocuments.length;
                      const missingCount = node.missingDocumentCount ?? null;
                      const documentsOpen = expandedNodeId === node.id;

                      return (
                        <article key={node.id} className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-[#e1e5db] bg-white p-4">
                          <div className="min-w-0">
                            <p className="text-[10px] sm:text-[9px] font-extrabold uppercase tracking-[0.12em] text-[#7a8c80]">
                              #{node.seqNo ?? "—"} · {node.role ?? "Unnamed role"}
                              {node.roleDescription ? ` · ${node.roleDescription}` : ""}
                            </p>
                            <p className="mt-1 truncate text-sm font-bold text-[#173127]">{node.supplier ?? "—"}</p>
                            <p className="mt-0.5 text-xs text-[#6f7f77]">
                              {[node.country, node.branchLabel ? `Consignee ${node.branchLabel}` : null]
                                .filter(Boolean)
                                .join(" · ") || "—"}
                              {node.directSupplier === null ? "" : node.directSupplier ? " · Direct" : " · Indirect"}
                            </p>
                            <p className="mt-1 text-xs sm:text-[11px] text-[#7a8c80]">
                              Quantity RAW Material {node.inputLot ?? "—"} → Quantity Finish Good {node.outputLot ?? "—"}
                              {node.quantity === null
                                ? ""
                                : ` · Quantity PO ${node.quantity.toLocaleString("en-US")} ${node.unit ?? ""}`.trimEnd()}
                            </p>
                          </div>
                          <div className="text-right">
                            {mapping ? <MappingBadge mapping={mapping} /> : <span className="text-[11px] sm:text-[10px] font-bold text-[#9aa69f]">Not mapped</span>}
                          </div>

                          <div className="w-full border-t border-[#eef0e8] pt-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <button
                                type="button"
                                onClick={() => setExpandedNodeId(documentsOpen ? null : node.id)}
                                aria-expanded={documentsOpen}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-[#dfe3da] px-2.5 py-1 text-[11px] sm:text-[10px] font-extrabold text-[#174f3a] transition hover:bg-[#f6f8ef]"
                              >
                                <FileText size={12} />
                                {documentCount} document{documentCount === 1 ? "" : "s"}
                                <ChevronDown
                                  size={12}
                                  className={`transition-transform ${documentsOpen ? "rotate-180" : ""}`}
                                />
                              </button>

                              {missingCount === null ? null : missingCount > 0 ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-[#f4ded6] px-2 py-0.5 text-[10px] sm:text-[9px] font-extrabold text-[#8a4b3a]">
                                  <AlertTriangle size={10} />
                                  {missingCount} missing required
                                </span>
                              ) : (
                                <span className="rounded-full bg-[#d9eedf] px-2 py-0.5 text-[10px] sm:text-[9px] font-extrabold text-[#155b3d]">
                                  Required documents complete
                                </span>
                              )}
                            </div>

                            {documentsOpen && (
                              <div className="mt-2 space-y-1">
                                {nodeDocuments.length === 0 ? (
                                  <p className="rounded-lg bg-[#f8f9f3] px-2.5 py-2 text-[11px] sm:text-[10px] text-[#7a8c80]">
                                    No documents attached to this node.
                                  </p>
                                ) : (
                                  nodeDocuments.map((document) => (
                                    <div
                                      key={document.id}
                                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-[#f8f9f3] px-2.5 py-1.5"
                                    >
                                      <div className="min-w-0">
                                        <p className="text-[11px] sm:text-[10px] font-bold text-[#173127]">
                                          {document.documentType ?? "Document"}
                                          {document.typeDescription ? ` · ${document.typeDescription}` : ""}
                                        </p>
                                        <p className="truncate text-[10px] sm:text-[9px] text-[#7a8c80]">{document.fileName ?? "—"}</p>
                                      </div>
                                      <span
                                        className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] sm:text-[9px] font-extrabold ${
                                          document.reviewStatus === "Approved"
                                            ? "bg-[#d9eedf] text-[#155b3d]"
                                            : document.reviewStatus === "Rejected"
                                              ? "bg-[#f4ded6] text-[#8a4b3a]"
                                              : "bg-[#f3e8bf] text-[#725d24]"
                                        }`}
                                      >
                                        {document.reviewStatus ?? "—"}
                                      </span>
                                    </div>
                                  ))
                                )}
                              </div>
                            )}
                          </div>
                        </article>
                      );
                    })
                  )}
                </div>
              </>
            )}
          </section>
        ) : (
          <section className="mt-6 rounded-3xl border border-[#1731270f] bg-[#fffef9] p-5 shadow-[0_24px_80px_rgba(30,47,39,0.10)] sm:p-6">
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#eef1e7] text-[#174f3a]">
                <SearchX size={22} />
              </span>
              <p className="text-sm font-semibold text-[#173127]">Search a MilRef to load the DPP traceability journey</p>
              <p className="max-w-md text-xs leading-5 text-[#7a8c80]">
                Example: B02345-1. The result shows the traceability journey from T_溯源_* and the DPP stage mapping.
              </p>
            </div>
          </section>
        )}
      </div>

      {pageSettingsOpen && lastSearched && (
        <DppPageSettingsDrawer
          milRef={lastSearched}
          defaultTitle={traceability?.header?.style || lastSearched}
          mappedNodeCount={Object.keys(nodeMappings).length}
          onNotify={notify}
          onClose={() => {
            setPageSettingsOpen(false);
            if (lastSearched) void refreshPageStatus(lastSearched);
          }}
        />
      )}

      {mappingOpen && traceability && (
        <TraceabilityMappingDrawer
          record={traceability}
          existing={nodeMappings}
          onNotify={notify}
          onClose={() => setMappingOpen(false)}
          onSaved={(saved) => {
            setNodeMappings((current) => {
              const next = { ...current };
              for (const mapping of saved) {
                next[mapping.mappingKey] = mapping;
              }
              return next;
            });
            setMappingOpen(false);
          }}
        />
      )}

      {qrOpen && lastSearched && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-[#173127]/40 px-4"
          role="presentation"
          onClick={(event) => {
            if (event.target === event.currentTarget) setQrOpen(false);
          }}
        >
          <div
            ref={qrDialogRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-label="Public page QR code"
            className="relative w-full max-w-sm rounded-2xl border border-[#e2e7d8] bg-[#fffef9] p-5 shadow-[0_24px_70px_rgba(23,49,39,0.28)]"
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] sm:text-[10px] font-extrabold tracking-[0.16em] text-[#7a8c80]">PUBLIC PAGE</p>
                <h2 className="mt-1 font-[family-name:var(--font-manrope)] text-lg font-bold tracking-[-0.02em] text-[#173127]">
                  {lastSearched}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setQrOpen(false)}
                aria-label="Close QR code"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#dfe3da] text-[#174f3a] transition hover:bg-[#eef1e7]"
              >
                <X size={16} />
              </button>
            </div>
            <DppQrCode
              value={absolutePublicUrl}
              fileName={lastSearched}
              note={
                pageStatus === "published"
                  ? "QR ini mengarah ke halaman publik yang sudah live."
                  : "Publish halaman ini agar QR dapat dibuka."
              }
            />
          </div>
        </div>
      )}

      <Toast toast={toast} onDismiss={dismissToast} />
    </main>
  );
}
