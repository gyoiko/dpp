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
import CmsSessionBadge from "@/components/CmsSessionBadge";
import DppPageSettingsDrawer from "@/components/DppPageSettingsDrawer";
import DppQrCode from "@/components/DppQrCode";
import Toast, { type ToastMessage } from "@/components/Toast";
import TraceabilityMappingDrawer from "@/components/TraceabilityMappingDrawer";
import { useDialogA11y } from "@/components/useDialogA11y";
import type { DppPageStatus } from "@/types/dppPage";
import type { TraceabilityNodeMapping, TraceabilityOption, TraceabilityRecord } from "@/types/traceability";
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
      <p className="text-xs font-bold uppercase tracking-wider text-muted">{label}</p>
      <p className="mt-1 text-sm font-semibold text-ink">{value || "—"}</p>
    </div>
  );
}

function MappingBadge({ mapping }: { mapping: TraceabilityNodeMapping }) {
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      <span className="rounded-full bg-[#eef4e7] px-2.5 py-1 text-xs font-bold text-forest">
        {DPP_STAGE_LABELS[mapping.stage]}
      </span>
      <span
        className={`rounded-full px-2.5 py-1 text-xs font-bold ${
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
  const [options, setOptions] = useState<TraceabilityOption[]>([]);
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [selectedLine, setSelectedLine] = useState("");
  const [selectedShipment, setSelectedShipment] = useState("");

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

  function resetResultPanels() {
    setLastSearched(null);
    setTraceability(null);
    setTraceabilityError(null);
    setNodeMappings({});
    setMappingOpen(false);
    setPageSettingsOpen(false);
    setExpandedNodeId(null);
    setQrOpen(false);
  }

  function optionMilRef(option: TraceabilityOption) {
    return [option.keDanHao, option.keDanHang, option.shipmentSerial].filter(Boolean).join("-");
  }

  async function loadOptions(millNo: string, preferredLine?: string) {
    setOptionsLoading(true);
    setOptions([]);
    setSelectedLine("");
    setSelectedShipment("");
    setError(null);

    try {
      const response = await fetch(`/api/dpp/traceability-options?millNo=${encodeURIComponent(millNo)}`);
      const payload = (await response.json()) as { options?: TraceabilityOption[]; error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to load order lines.");
      }

      const list = payload.options ?? [];

      if (list.length === 0) {
        setError(`No traceability record found for Mil No ${millNo}.`);
        return;
      }

      setOptions(list);

      const line = preferredLine && list.some((item) => item.keDanHang === preferredLine)
        ? preferredLine
        : list[0].keDanHang;
      const lineOptions = list.filter((item) => item.keDanHang === line);
      setSelectedLine(line);

      if (lineOptions.length === 1) {
        setSelectedShipment(lineOptions[0].shipmentSerial ?? "");
      }

      if (list.length === 1) {
        const ref = optionMilRef(list[0]);
        setMilRef(ref);
        rememberSearch(ref);
        void loadTraceability(ref);
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load order lines.");
    } finally {
      setOptionsLoading(false);
    }
  }

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = milRef.trim();

    if (!query) {
      setError("Please enter a Mil No before searching.");
      return;
    }

    resetResultPanels();
    setError(null);

    const [millNo, orderLine, ...rest] = query.split("-");
    const shipmentSerial = rest.join("-").trim();

    if (shipmentSerial) {
      rememberSearch(query);
      void loadTraceability(query);
      return;
    }

    void loadOptions(millNo.trim(), orderLine?.trim());
  }

  function handleRecentSelect(ref: string) {
    setMilRef(ref);
    runSearch(ref);
  }

  function runSearch(value: string) {
    const query = value.trim();

    if (!query) {
      setError("Please enter a MilRef before searching.");
      return;
    }

    resetResultPanels();
    setError(null);
    setOptions([]);
    setLastSearched(query);
    rememberSearch(query);
    void loadTraceability(query);
  }

  function applyLineSelection(line: string) {
    setSelectedLine(line);
    const lineOptions = options.filter((option) => option.keDanHang === line);
    setSelectedShipment(lineOptions.length === 1 ? (lineOptions[0].shipmentSerial ?? "") : "");
  }

  function loadSelectedOption() {
    const option = selectedOption;

    if (!option) {
      setError("Choose an order line and shipment first.");
      return;
    }

    const ref = optionMilRef(option);
    setMilRef(ref);
    rememberSearch(ref);
    resetResultPanels();
    setLastSearched(ref);
    void loadTraceability(ref);
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
  const orderLines = Array.from(new Set(options.map((option) => option.keDanHang)));
  const shipmentsForLine = options.filter((option) => option.keDanHang === selectedLine);
  const selectedOption = options.find(
    (option) => option.keDanHang === selectedLine && (option.shipmentSerial ?? "") === selectedShipment,
  );
  const searchBusy = traceabilityLoading || optionsLoading;

  return (
    <main className="min-h-screen bg-canvas px-4 py-8 text-ink sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-6xl">
        <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold tracking-widest text-muted">SCM CONSOLE</p>
            <h1 className="mt-2 font-[family-name:var(--font-manrope)] text-3xl font-bold leading-tight tracking-[-0.03em]">
              Supply Chain Mapping
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
              Pull read-only traceability data from the DPP database by MilRef, then map each node to the DPP journey.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 rounded-full border border-[#d3dcc8] bg-[#f6f8ef] px-3.5 py-1.5 text-xs font-bold text-forest">
              <Database size={14} />
              DPP traceability · read-only
            </div>
            <CmsSessionBadge />
          </div>
        </header>

        <section className="rounded-3xl border border-[#1731270f] bg-paper p-5 shadow-[0_24px_80px_rgba(30,47,39,0.10)] sm:p-6">
          <form onSubmit={handleSearch} className="flex flex-col gap-3 sm:flex-row">
            <div className="flex-1">
              <label htmlFor="milref" className="sr-only">
                Mil No
              </label>
              <div className="relative">
                <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
                <input
                  id="milref"
                  type="text"
                  list="milref-suggestions"
                  value={milRef}
                  onChange={(event) => setMilRef(event.target.value)}
                  onFocus={() => setRecentSearches(readRecentSearches())}
                  placeholder="Mil No, e.g., B09262 (or full MilRef B09262-1-YN2608120032)"
                  autoComplete="off"
                  className="h-12 w-full rounded-xl border border-[#d8dfcf] bg-white pl-11 pr-4 text-base font-medium outline-none transition focus:border-forest focus:ring-4 focus:ring-[#174f3a]/10 sm:text-sm"
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
              disabled={searchBusy}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-forest px-6 text-sm font-extrabold text-white transition hover:bg-[#123e2d] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {searchBusy ? <Loader2 size={17} className="animate-spin" /> : <Search size={17} />}
              {searchBusy ? "Loading…" : "Search / Load Data"}
            </button>
          </form>

          {options.length > 1 && (
            <div className="mt-4 grid gap-3 rounded-xl border border-[#e2e7d8] bg-[#f6f8ef] p-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
              <label className="block">
                <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-muted">Order line</span>
                <select
                  value={selectedLine}
                  onChange={(event) => applyLineSelection(event.target.value)}
                  className="h-11 w-full rounded-lg border border-[#d8dfcf] bg-white px-3 text-base font-medium outline-none transition focus:border-forest focus:ring-4 focus:ring-[#174f3a]/10 sm:h-10 sm:text-sm"
                >
                  {orderLines.map((line) => (
                    <option key={line} value={line}>
                      {line}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-muted">
                  Delivery / shipment
                </span>
                <select
                  value={selectedShipment}
                  onChange={(event) => setSelectedShipment(event.target.value)}
                  className="h-11 w-full rounded-lg border border-[#d8dfcf] bg-white px-3 text-base font-medium outline-none transition focus:border-forest focus:ring-4 focus:ring-[#174f3a]/10 sm:h-10 sm:text-sm"
                >
                  {shipmentsForLine.map((option) => (
                    <option key={`${option.mainId}`} value={option.shipmentSerial ?? ""}>
                      {option.shipmentSerial ?? "— no shipment serial —"}
                      {option.buyerPo ? ` · PO ${option.buyerPo}` : ""}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                onClick={loadSelectedOption}
                disabled={!selectedOption || searchBusy}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-forest px-5 text-xs font-extrabold text-white transition hover:bg-[#123e2d] disabled:cursor-not-allowed disabled:opacity-60 sm:h-10"
              >
                Load selected
              </button>
            </div>
          )}

          {options.length > 1 && (
            <p className="mt-2 text-xs leading-5 text-muted">
              {options.length} traceability record(s) found for this Mil No. Pick the order line and delivery/shipment
              to load.
            </p>
          )}

          {recentSearches.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-muted">Recent</span>
              {recentSearches.map((ref) => (
                <button
                  key={ref}
                  type="button"
                  onClick={() => handleRecentSelect(ref)}
                  className="inline-flex min-h-11 items-center justify-center rounded-full border border-[#d8dfcf] bg-[#f6f8ef] px-3 py-1 text-xs font-bold text-forest transition hover:bg-[#eef1e7] sm:min-h-0"
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
          <section className="mt-6 rounded-3xl border border-[#1731270f] bg-paper p-5 shadow-[0_24px_80px_rgba(30,47,39,0.10)] sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#dfe3da] pb-3">
              <div>
                <h2 className="font-[family-name:var(--font-manrope)] text-sm font-bold">
                  DPP traceability journey
                  <span className="ml-2 font-normal text-muted">· {lastSearched}</span>
                </h2>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {pageExists ? (
                  <span
                    className={`inline-flex h-11 items-center sm:h-9 gap-1.5 rounded-lg border px-3 text-xs font-bold ${
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
                  <span className="inline-flex h-11 items-center sm:h-9 gap-1.5 rounded-lg border border-[#d8dfcf] bg-[#f0f2ea] px-3 text-xs font-bold text-muted">
                    <span className="h-1.5 w-1.5 rounded-full bg-muted" />
                    No DPP page
                  </span>
                )}

                {pageStatus === "published" && publicPath && (
                  <a
                    href={publicPath}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-11 items-center sm:h-9 gap-1.5 rounded-lg border border-forest px-3 text-xs font-bold text-forest transition hover:bg-[#eef1e7]"
                  >
                    <ExternalLink size={12} /> Open page
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => void copyPublicUrl()}
                  disabled={!absolutePublicUrl}
                  className="inline-flex h-11 items-center sm:h-9 gap-1.5 rounded-lg border border-[#d8dfcf] px-3 text-xs font-bold text-ink transition hover:bg-[#f6f8ef] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Copy size={12} /> Copy URL
                </button>
                <button
                  type="button"
                  onClick={() => setQrOpen(true)}
                  disabled={!absolutePublicUrl}
                  className="inline-flex h-11 items-center sm:h-9 gap-1.5 rounded-lg border border-[#d8dfcf] px-3 text-xs font-bold text-ink transition hover:bg-[#f6f8ef] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <QrCode size={12} /> QR
                </button>
                <button
                  type="button"
                  onClick={() => setPageSettingsOpen(true)}
                  disabled={!lastSearched}
                  className="inline-flex h-11 items-center sm:h-9 gap-2 rounded-lg border border-forest px-4 text-xs font-bold text-forest transition hover:bg-[#eef1e7] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Page settings
                </button>
                <button
                  type="button"
                  onClick={() => setMappingOpen(true)}
                  disabled={!traceability || traceability.nodes.length === 0}
                  className="inline-flex h-11 items-center sm:h-9 gap-2 rounded-lg bg-forest px-4 text-xs font-bold text-white transition hover:bg-[#123e2d] disabled:cursor-not-allowed disabled:opacity-50"
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
                  className="mt-2 inline-flex h-11 items-center sm:h-8 gap-1.5 rounded-lg border border-[#8a4b3a] px-3 text-[11px] sm:text-[10px] font-extrabold text-[#8a4b3a] transition hover:bg-[#efd2c8]"
                >
                  <RefreshCw size={12} /> Retry
                </button>
              </div>
            ) : !traceability ? (
              <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#eef1e7] text-forest">
                  <SearchX size={22} />
                </span>
                <p className="text-sm font-semibold text-ink">No DPP traceability record found for this MilRef</p>
                <p className="max-w-md text-xs leading-5 text-muted">
                  Make sure the MilRef exists in T_溯源_主表 (tesdatt5). Publishing is disabled until traceability data is
                  available.
                </p>
              </div>
            ) : (
              <>
                <div className="mt-4 grid grid-cols-2 gap-4 rounded-xl border border-[#e2e7d8] bg-[#f6f8ef] p-4 sm:grid-cols-3">
                  <ReadOnlyField label="Mill No" value={traceability.header?.millNo ?? null} />
                  <ReadOnlyField label="Order line" value={traceability.header?.orderLine ?? null} />
                  <ReadOnlyField label="Buyer" value={traceability.header?.buyer ?? null} />
                  <ReadOnlyField label="GTI PO" value={traceability.header?.buyerPo ?? null} />
                  <ReadOnlyField label="Style" value={traceability.header?.style ?? null} />
                  <ReadOnlyField label="Scope" value={traceability.header?.scope ?? null} />
                  <ReadOnlyField label="Status" value={traceability.header?.status ?? null} />
                  <ReadOnlyField label="Customer article" value={traceability.header?.customerArticle ?? null} />
                  <ReadOnlyField label="Shipment serial" value={traceability.header?.shipmentSerial ?? null} />
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {traceability.fibres.length > 0 ? (
                    traceability.fibres.map((fibre, index) => (
                      <span key={`${fibre.fibreType ?? "fibre"}-${index}`} className="rounded-full bg-[#eef4e7] px-2.5 py-1 text-[11px] sm:text-[10px] font-extrabold text-forest">
                        {fibre.fibreType ?? "Fibre"} {fibre.percentage === null ? "" : `${fibre.percentage}%`}
                        {fibre.sourceLot ? ` · Yarn Count ${fibre.sourceLot}` : ""}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-muted">No fibre composition recorded.</span>
                  )}
                </div>

                <div className="mt-5 flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted">Journey nodes</h3>
                  <span className="text-xs font-semibold text-muted">
                    {traceability.nodes.length} node{traceability.nodes.length === 1 ? "" : "s"} · {traceability.documents.length} document
                    {traceability.documents.length === 1 ? "" : "s"}
                  </span>
                </div>

                <div className="mt-2 grid gap-2">
                  {traceability.nodes.length === 0 ? (
                    <p className="text-sm text-muted">No journey nodes recorded for this MilRef.</p>
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
                            <p className="text-xs font-bold uppercase tracking-wider text-muted">
                              #{node.seqNo ?? "—"} · {node.role ?? "Unnamed role"}
                              {node.roleDescription ? ` · ${node.roleDescription}` : ""}
                            </p>
                            <p className="mt-1 truncate text-sm font-bold text-ink">{node.supplier ?? "—"}</p>
                            <p className="mt-0.5 text-xs text-muted">
                              {[node.country, node.branchLabel ? `Consignee ${node.branchLabel}` : null]
                                .filter(Boolean)
                                .join(" · ") || "—"}
                              {node.directSupplier === null ? "" : node.directSupplier ? " · Direct" : " · Indirect"}
                            </p>
                            <p className="mt-1 text-xs text-muted">
                              Quantity RAW Material {node.inputLot ?? "—"} → Quantity Finish Good {node.outputLot ?? "—"}
                              {node.quantity === null
                                ? ""
                                : ` · Quantity PO ${node.quantity.toLocaleString("en-US")} ${node.unit ?? ""}`.trimEnd()}
                            </p>
                          </div>
                          <div className="text-right">
                            {mapping ? <MappingBadge mapping={mapping} /> : <span className="text-xs font-semibold text-muted">Not mapped</span>}
                          </div>

                          <div className="w-full border-t border-[#eef0e8] pt-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <button
                                type="button"
                                onClick={() => setExpandedNodeId(documentsOpen ? null : node.id)}
                                aria-expanded={documentsOpen}
                                className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-[#dfe3da] px-2.5 py-1 text-xs font-bold text-forest transition hover:bg-[#f6f8ef] sm:min-h-0"
                              >
                                <FileText size={12} />
                                {documentCount} document{documentCount === 1 ? "" : "s"}
                                <ChevronDown
                                  size={12}
                                  className={`transition-transform ${documentsOpen ? "rotate-180" : ""}`}
                                />
                              </button>

                              {missingCount === null ? null : missingCount > 0 ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-[#f4ded6] px-2.5 py-1 text-xs font-bold text-[#8a4b3a]">
                                  <AlertTriangle size={11} />
                                  {missingCount} missing required
                                </span>
                              ) : (
                                <span className="rounded-full bg-[#d9eedf] px-2.5 py-1 text-xs font-bold text-[#155b3d]">
                                  Required documents complete
                                </span>
                              )}
                            </div>

                            {documentsOpen && (
                              <div className="mt-2 space-y-1">
                                {nodeDocuments.length === 0 ? (
                                  <p className="rounded-lg bg-[#f8f9f3] px-2.5 py-2 text-[11px] sm:text-[10px] text-muted">
                                    No documents attached to this node.
                                  </p>
                                ) : (
                                  nodeDocuments.map((document) => (
                                    <div
                                      key={document.id}
                                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-[#f8f9f3] px-3 py-2"
                                    >
                                      <div className="min-w-0">
                                        <p className="text-xs font-bold text-ink">
                                          {document.documentType ?? "Document"}
                                          {document.typeDescription ? ` · ${document.typeDescription}` : ""}
                                        </p>
                                        <p className="truncate text-xs text-muted">{document.fileName ?? "—"}</p>
                                      </div>
                                      <span
                                        className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold ${
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
          <section className="mt-6 rounded-3xl border border-[#1731270f] bg-paper p-5 shadow-[0_24px_80px_rgba(30,47,39,0.10)] sm:p-6">
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#eef1e7] text-forest">
                <SearchX size={22} />
              </span>
              <p className="text-sm font-semibold text-ink">Search a Mil No to load the DPP traceability journey</p>
              <p className="max-w-md text-xs leading-5 text-muted">
                Example: B09262. If the Mil No has more than one order line or shipment, pick them from the
                dropdowns before loading. The result shows the traceability journey from T_溯源_* and the DPP stage
                mapping.
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
            className="relative w-full max-w-sm rounded-2xl border border-[#e2e7d8] bg-paper p-5 shadow-[0_24px_70px_rgba(23,49,39,0.28)]"
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] sm:text-[10px] font-extrabold tracking-[0.16em] text-muted">PUBLIC PAGE</p>
                <h2 className="mt-1 font-[family-name:var(--font-manrope)] text-lg font-bold tracking-[-0.02em] text-ink">
                  {lastSearched}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setQrOpen(false)}
                aria-label="Close QR code"
                className="flex h-11 w-11 shrink-0 sm:h-9 sm:w-9 items-center justify-center rounded-full border border-[#dfe3da] text-forest transition hover:bg-[#eef1e7]"
              >
                <X size={16} />
              </button>
            </div>
            <DppQrCode
              value={absolutePublicUrl}
              fileName={lastSearched}
              note={
                pageStatus === "published"
                  ? "This QR code points to the live public page."
                  : "Publish this page to make the QR code work."
              }
            />
          </div>
        </div>
      )}

      <Toast toast={toast} onDismiss={dismissToast} />
    </main>
  );
}
