"use client";

import { Check, Copy, Download, QrCode } from "lucide-react";
import { QRCodeCanvas, QRCodeSVG } from "qrcode.react";
import { useCallback, useMemo, useRef, useState } from "react";

function safeFileName(value: string) {
  const cleaned = value
    .trim()
    .replace(/[^A-Za-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return cleaned || "dpp-passport";
}

export default function DppQrCode({
  value,
  fileName,
  note = "Scan the QR code to open the public DPP page.",
}: {
  value: string;
  fileName: string;
  note?: string;
}) {
  const [copied, setCopied] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const downloadName = useMemo(() => `${safeFileName(fileName)}-qr.png`, [fileName]);

  const handleCopy = useCallback(async () => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard access can be blocked; the URL stays visible for manual copy.
    }
  }, [value]);

  const handleDownload = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.href = canvas.toDataURL("image/png");
    link.download = downloadName;
    link.click();
  }, [downloadName]);

  return (
    <div className="rounded-xl border border-[#e2e7d8] bg-[#f6f8ef] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[9px] font-extrabold uppercase tracking-[0.12em] text-[#8a978f]">QR code</p>
          <p className="mt-1 text-xs font-semibold text-[#173127]">Scan to open the public page</p>
        </div>
        <QrCode size={16} className="shrink-0 text-[#174f3a]" />
      </div>

      <div className="mt-3 flex justify-center rounded-lg border border-[#e2e7d8] bg-white p-3">
        {value ? (
          <>
            <QRCodeSVG
              value={value}
              size={176}
              level="M"
              marginSize={2}
              bgColor="#ffffff"
              fgColor="#174f3a"
              title="QR code linking to the public DPP page"
            />
            <QRCodeCanvas
              ref={canvasRef}
              value={value}
              size={1024}
              level="M"
              marginSize={4}
              bgColor="#ffffff"
              fgColor="#174f3a"
              style={{ display: "none" }}
            />
          </>
        ) : (
          <div className="h-44 w-44 rounded-lg bg-[#eef1e7]" aria-hidden="true" />
        )}
      </div>

      <p className="mt-2 break-all text-center text-[10px] text-[#7a8c80]">{value || "Public URL not available yet."}</p>
      <p className="mt-1 text-center text-[10px] leading-4 text-[#7a8c80]">{note}</p>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={handleCopy}
          disabled={!value}
          className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-[#174f3a] px-3 text-[11px] font-extrabold text-[#174f3a] transition hover:bg-[#eef1e7] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {copied ? <Check size={13} /> : <Copy size={13} />}
          {copied ? "Copied" : "Copy link"}
        </button>
        <button
          type="button"
          onClick={handleDownload}
          disabled={!value}
          className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-[#174f3a] px-3 text-[11px] font-extrabold text-white transition hover:bg-[#123e2d] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Download size={13} />
          Download PNG
        </button>
      </div>
    </div>
  );
}
