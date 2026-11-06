"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, UserRound } from "lucide-react";
import type { AuthUser } from "@/types/auth";

export default function CmsSessionBadge() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    let active = true;

    fetch("/api/auth/me")
      .then((response) => (response.ok ? response.json() : null))
      .then((payload: { user?: AuthUser } | null) => {
        if (active) setUser(payload?.user ?? null);
      })
      .catch(() => undefined);

    return () => {
      active = false;
    };
  }, []);

  async function signOut() {
    setSigningOut(true);

    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      router.replace("/login");
      router.refresh();
    }
  }

  if (!user) {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      <span className="inline-flex items-center gap-1.5 rounded-full border border-[#d3dcc8] bg-[#f6f8ef] px-3 py-2 text-xs font-bold text-[#174f3a] sm:text-[11px]">
        <UserRound size={13} />
        {user.name || user.email}
      </span>
      <button
        type="button"
        onClick={() => void signOut()}
        disabled={signingOut}
        className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#d8dfcf] px-3 text-[11px] font-extrabold text-[#173127] transition hover:bg-[#f6f8ef] disabled:opacity-50 sm:text-[10px]"
      >
        <LogOut size={12} />
        {signingOut ? "Signing out…" : "Sign out"}
      </button>
    </div>
  );
}
