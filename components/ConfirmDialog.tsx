"use client";

import { AlertTriangle } from "lucide-react";
import { useEffect } from "react";
import { createPortal } from "react-dom";
import { useDialogA11y } from "@/components/useDialogA11y";

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Discard changes",
  cancelLabel = "Keep editing",
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const dialogRef = useDialogA11y<HTMLDivElement>({ open, onEscape: onCancel });

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[95] flex items-center justify-center px-4"
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget) onCancel();
      }}
    >
      <div className="absolute inset-0 bg-[#173127]/40" aria-hidden="true" />
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-message"
        className="relative w-full max-w-sm rounded-2xl border border-[#e2e7d8] bg-[#fffef9] p-5 shadow-[0_24px_70px_rgba(23,49,39,0.28)]"
      >
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#f4ded6] text-[#8a4b3a]">
            <AlertTriangle size={17} />
          </span>
          <div>
            <h2 id="confirm-dialog-title" className="font-[family-name:var(--font-manrope)] text-base font-bold tracking-[-0.01em] text-[#173127]">
              {title}
            </h2>
            <p id="confirm-dialog-message" className="mt-1.5 text-xs leading-5 text-[#6f7f77]">
              {message}
            </p>
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="h-9 rounded-lg border border-[#d8dfcf] px-3 text-[11px] font-extrabold text-[#173127] transition hover:bg-[#f6f8ef]"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="h-9 rounded-lg bg-[#8a4b3a] px-3 text-[11px] font-extrabold text-white transition hover:bg-[#733d2f]"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
