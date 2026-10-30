"use client";

import { useEffect, useState } from "react";
import { ExternalLink, Loader2, X } from "lucide-react";
import type { DppPage, DppPageStatus } from "@/types/dppPage";

const fieldClass =
  "h-10 w-full rounded-lg border border-[#d8dfcf] bg-white px-3 text-sm font-medium outline-none transition focus:border-[#174f3a] focus:ring-4 focus:ring-[#174f3a]/10";

interface DppPageSettingsDrawerProps {
  milRef: string;
  defaultTitle: string;
  mappedNodeCount: number;
  onClose: () => void;
}

export default function DppPageSettingsDrawer({
  milRef,
  defaultTitle,
  mappedNodeCount,
  onClose,
}: DppPageSettingsDrawerProps) {
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState(defaultTitle);
  const [intro, setIntro] = useState("");
  const [status, setStatus] = useState<DppPageStatus>("draft");
  const [traceabilityAvailable, setTraceabilityAvailable] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedPage, setSavedPage] = useState<DppPage | null>(null);

  const canPublish = traceabilityAvailable && mappedNodeCount > 0;
  const publishBlocked = status === "published" && !canPublish;

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const [response, traceabilityResponse] = await Promise.all([
          fetch(`/api/dpp/pages?milRef=${encodeURIComponent(milRef)}`),
          fetch(`/api/dpp/traceability/${encodeURIComponent(milRef)}`).catch(() => null),
        ]);

        const payload = (await response.json()) as { page?: DppPage | null; error?: string };

        if (!response.ok) {
          throw new Error(payload.error ?? "Gagal memuat halaman DPP.");
        }

        if (!active) {
          return;
        }

        setTraceabilityAvailable(Boolean(traceabilityResponse?.ok));

        if (payload.page) {
          setTitle(payload.page.title || defaultTitle);
          setIntro(payload.page.intro);
          setStatus(payload.page.status);
          setSavedPage(payload.page);
        } else {
          setTitle(defaultTitle);
          setIntro("");
          setStatus("draft");
        }
      } catch (loadError) {
        if (active) {
          setError(loadError instanceof Error ? loadError.message : "Gagal memuat halaman DPP.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, [milRef, defaultTitle]);

  async function save() {
    setSaving(true);
    setError(null);

    try {
      const response = await fetch("/api/dpp/pages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ milRef, title, intro, status }),
      });

      const payload = (await response.json()) as { page?: DppPage; error?: string };

      if (!response.ok || !payload.page) {
        throw new Error(payload.error ?? "Gagal menyimpan halaman DPP.");
      }

      setSavedPage(payload.page);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Gagal menyimpan halaman DPP.");
    } finally {
      setSaving(false);
    }
  }

  const publicUrl = `/dpp/${encodeURIComponent(milRef)}`;

  return (
    <div className="fixed inset-0 z-50">
      <button type="button" aria-label="Close page settings" className="absolute inset-0 bg-[#173127]/40" onClick={onClose} />
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="page-settings-title"
        className="absolute inset-y-0 right-0 flex w-full max-w-lg flex-col overflow-y-auto bg-[#fffef9] shadow-[0_0_60px_rgba(23,49,39,0.25)]"
      >
        <header className="flex items-start justify-between gap-4 border-b border-[#dfe3da] px-6 py-5">
          <div>
            <p className="text-[10px] font-extrabold tracking-[0.16em] text-[#7a8c80]">DPP PAGE SETTINGS</p>
            <h2 id="page-settings-title" className="mt-1 font-[family-name:var(--font-manrope)] text-xl font-bold tracking-[-0.02em]">
              {milRef}
            </h2>
            <p className="mt-1 text-xs text-[#7a8c80]">Atur halaman publik DPP untuk MilRef ini.</p>
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

        <div className="flex-1 space-y-5 px-6 py-5">
          {loading ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-[#6f7f77]">
              <Loader2 size={26} className="animate-spin text-[#174f3a]" />
              <p className="text-sm font-semibold">Loading page settings…</p>
            </div>
          ) : (
            <>
              <div>
                <label htmlFor="page-title" className="mb-1.5 block text-xs font-bold text-[#173127]">
                  Page title
                </label>
                <input
                  id="page-title"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Product / passport title"
                  className={fieldClass}
                />
              </div>

              <div>
                <label htmlFor="page-intro" className="mb-1.5 block text-xs font-bold text-[#173127]">
                  Intro
                </label>
                <textarea
                  id="page-intro"
                  value={intro}
                  onChange={(event) => setIntro(event.target.value)}
                  rows={4}
                  placeholder="Short introduction shown on the public DPP page"
                  className="w-full rounded-lg border border-[#d8dfcf] bg-white px-3 py-2 text-sm font-medium outline-none transition focus:border-[#174f3a] focus:ring-4 focus:ring-[#174f3a]/10"
                />
              </div>

              <div>
                <label htmlFor="page-status" className="mb-1.5 block text-xs font-bold text-[#173127]">
                  Status
                </label>
                <select
                  id="page-status"
                  value={status}
                  onChange={(event) => setStatus(event.target.value as DppPageStatus)}
                  className={fieldClass}
                >
                  <option value="draft">Draft — not publicly accessible</option>
                  <option value="published" disabled={!canPublish}>
                    Published — public DPP page live
                  </option>
                </select>
              </div>

              {!traceabilityAvailable && (
                <div className="rounded-xl border border-[#e8c5ad] bg-[#f4ded6] px-4 py-3 text-xs font-medium leading-5 text-[#8a4b3a]">
                  No traceability data found for this MilRef in the DPP database. Publishing is disabled; save the page as
                  Draft or fix the source data in tesdatt5 first.
                </div>
              )}

              {traceabilityAvailable && mappedNodeCount === 0 && (
                <div className="rounded-xl border border-[#e8d9b0] bg-[#faf3d8] px-4 py-3 text-xs font-medium leading-5 text-[#6b5722]">
                  Map at least one journey node to a DPP stage before publishing.
                </div>
              )}

              {publishBlocked && status === "published" && (
                <div className="rounded-xl border border-[#e8c5ad] bg-[#f4ded6] px-4 py-3 text-xs font-medium leading-5 text-[#8a4b3a]">
                  This page is set to Published but cannot be published yet. Switch to Draft or complete the requirements
                  above.
                </div>
              )}

              <div className="rounded-xl border border-[#e2e7d8] bg-[#f6f8ef] p-4">
                <p className="text-[9px] font-extrabold uppercase tracking-[0.12em] text-[#8a978f]">Public URL</p>
                <p className="mt-1 break-all text-xs font-semibold text-[#174f3a]">{publicUrl}</p>
                {savedPage?.status === "published" ? (
                  <a
                    href={publicUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-extrabold text-[#174f3a] underline-offset-2 hover:underline"
                  >
                    Open public page <ExternalLink size={13} />
                  </a>
                ) : (
                  <p className="mt-2 text-[10px] text-[#7a8c80]">Publish the page to make this URL live.</p>
                )}
              </div>

              {error && (
                <div role="alert" className="rounded-xl border border-[#e8c5ad] bg-[#f4ded6] px-4 py-3 text-sm font-medium text-[#8a4b3a]">
                  {error}
                </div>
              )}
            </>
          )}
        </div>

        <footer className="sticky bottom-0 flex items-center justify-end gap-2 border-t border-[#dfe3da] bg-[#fffef9] px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="h-10 rounded-lg border border-[#d8dfcf] px-4 text-xs font-extrabold text-[#173127] transition hover:bg-[#f6f8ef]"
          >
            Close
          </button>
          <button
            type="button"
            onClick={save}
            disabled={saving || loading || publishBlocked}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#174f3a] px-4 text-xs font-extrabold text-white transition hover:bg-[#123e2d] disabled:opacity-60"
          >
            {saving && <Loader2 size={14} className="animate-spin" />}
            Save page
          </button>
        </footer>
      </aside>
    </div>
  );
}
