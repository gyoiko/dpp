"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import { Database, Loader2, Search, SearchX } from "lucide-react";
import DppPageSettingsDrawer from "@/components/DppPageSettingsDrawer";
import TraceabilityMappingDrawer from "@/components/TraceabilityMappingDrawer";
import type { TraceabilityNodeMapping, TraceabilityRecord } from "@/types/traceability";
import { DPP_STAGE_LABELS, traceabilityNodeMappingKey } from "@/types/traceability";

function ReadOnlyField({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <p className="text-[9px] font-extrabold uppercase tracking-[0.1em] text-[#8a978f]">{label}</p>
      <p className="mt-1 text-sm font-semibold text-[#173127]">{value || "—"}</p>
    </div>
  );
}

function MappingBadge({ mapping }: { mapping: TraceabilityNodeMapping }) {
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      <span className="rounded-full bg-[#eef4e7] px-2 py-0.5 text-[10px] font-extrabold text-[#174f3a]">
        {DPP_STAGE_LABELS[mapping.stage]}
      </span>
      <span
        className={`rounded-full px-2 py-0.5 text-[9px] font-extrabold ${
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

  async function loadTraceability(milRefValue: string) {
    setTraceabilityLoading(true);
    setTraceabilityError(null);

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

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = milRef.trim();

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
    void loadTraceability(query);
  }

  return (
    <main className="min-h-screen bg-[#e8e8dd] px-4 py-8 text-[#173127] sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-6xl">
        <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-extrabold tracking-[0.18em] text-[#7a8c80]">SCM CONSOLE</p>
            <h1 className="mt-2 font-[family-name:var(--font-manrope)] text-3xl font-bold leading-tight tracking-[-0.03em]">
              Supply Chain Mapping
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#6f7f77]">
              Pull read-only traceability data from the DPP database by MilRef, then map each node to the DPP journey.
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-[#d3dcc8] bg-[#f6f8ef] px-3 py-2 text-[11px] font-bold text-[#174f3a]">
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
                  value={milRef}
                  onChange={(event) => setMilRef(event.target.value)}
                  placeholder="Input MilRef, e.g., B02345-1"
                  autoComplete="off"
                  className="h-12 w-full rounded-xl border border-[#d8dfcf] bg-white pl-11 pr-4 text-sm font-medium outline-none transition focus:border-[#174f3a] focus:ring-4 focus:ring-[#174f3a]/10"
                />
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
                  Loaded from T_溯源_*. Supplier, country, lot, and quantity are read-only.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setPageSettingsOpen(true)}
                  disabled={!lastSearched}
                  className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#174f3a] px-4 text-[11px] font-extrabold text-[#174f3a] transition hover:bg-[#eef1e7] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Page settings
                </button>
                <button
                  type="button"
                  onClick={() => setMappingOpen(true)}
                  disabled={!traceability || traceability.nodes.length === 0}
                  className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#174f3a] px-4 text-[11px] font-extrabold text-white transition hover:bg-[#123e2d] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Map DPP journey
                </button>
              </div>
            </div>

            {traceabilityLoading ? (
              <div className="flex flex-col items-center justify-center gap-3 py-20 text-[#6f7f77]" aria-live="polite">
                <Loader2 size={30} className="animate-spin text-[#174f3a]" />
                <p className="text-sm font-semibold">Loading DPP traceability…</p>
              </div>
            ) : traceabilityError ? (
              <div role="alert" className="mt-4 rounded-xl border border-[#e8c5ad] bg-[#f4ded6] px-4 py-3 text-sm font-medium text-[#8a4b3a]">
                {traceabilityError}
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
                  <ReadOnlyField label="Buyer PO" value={traceability.header?.buyerPo ?? null} />
                  <ReadOnlyField label="Style" value={traceability.header?.style ?? null} />
                  <ReadOnlyField label="Scope" value={traceability.header?.scope ?? null} />
                  <ReadOnlyField label="Status" value={traceability.header?.status ?? null} />
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {traceability.fibres.length > 0 ? (
                    traceability.fibres.map((fibre, index) => (
                      <span key={`${fibre.fibreType ?? "fibre"}-${index}`} className="rounded-full bg-[#eef4e7] px-2.5 py-1 text-[10px] font-extrabold text-[#174f3a]">
                        {fibre.fibreType ?? "Fibre"} {fibre.percentage === null ? "" : `${fibre.percentage}%`}
                        {fibre.sourceLot ? ` · lot ${fibre.sourceLot}` : ""}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-[#7a8c80]">No fibre composition recorded.</span>
                  )}
                </div>

                <div className="mt-5 flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#7a8c80]">Journey nodes</h3>
                  <span className="text-[10px] font-bold text-[#7a8c80]">
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

                      return (
                        <article key={node.id} className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-[#e1e5db] bg-white p-4">
                          <div className="min-w-0">
                            <p className="text-[9px] font-extrabold uppercase tracking-[0.12em] text-[#7a8c80]">
                              #{node.seqNo ?? "—"} · {node.role ?? "Unnamed role"}
                              {node.roleDescription ? ` · ${node.roleDescription}` : ""}
                            </p>
                            <p className="mt-1 truncate text-sm font-bold text-[#173127]">{node.supplier ?? "—"}</p>
                            <p className="mt-0.5 text-xs text-[#6f7f77]">
                              {[node.country, node.branchLabel ? `Branch ${node.branchLabel}` : null]
                                .filter(Boolean)
                                .join(" · ") || "—"}
                              {node.directSupplier === null ? "" : node.directSupplier ? " · Direct" : " · Indirect"}
                            </p>
                            <p className="mt-1 text-[11px] text-[#7a8c80]">
                              Lot {node.inputLot ?? "—"} → {node.outputLot ?? "—"}
                              {node.quantity === null ? "" : ` · ${node.quantity.toLocaleString("en-US")} ${node.unit ?? ""}`.trimEnd()}
                            </p>
                          </div>
                          <div className="text-right">
                            {mapping ? <MappingBadge mapping={mapping} /> : <span className="text-[10px] font-bold text-[#9aa69f]">Not mapped</span>}
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
          onClose={() => setPageSettingsOpen(false)}
        />
      )}

      {mappingOpen && traceability && (
        <TraceabilityMappingDrawer
          record={traceability}
          existing={nodeMappings}
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
    </main>
  );
}
