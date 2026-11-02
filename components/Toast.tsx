"use client";

import { Check } from "lucide-react";
import { useEffect } from "react";

export interface ToastMessage {
  id: number;
  message: string;
}

export default function Toast({
  toast,
  onDismiss,
  duration = 3200,
}: {
  toast: ToastMessage | null;
  onDismiss: () => void;
  duration?: number;
}) {
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(onDismiss, duration);
    return () => window.clearTimeout(timer);
  }, [toast, onDismiss, duration]);

  if (!toast) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-6 z-[90] flex justify-center px-4">
      <div
        key={toast.id}
        role="status"
        aria-live="polite"
        className="pointer-events-auto flex items-center gap-2 rounded-full bg-[#174f3a] px-4 py-2.5 text-xs font-bold text-white shadow-[0_12px_30px_rgba(23,49,39,0.28)]"
      >
        <Check size={15} className="shrink-0 text-[#d8f169]" />
        <span>{toast.message}</span>
      </div>
    </div>
  );
}
