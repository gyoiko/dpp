"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, LockKeyhole } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const payload = (await response.json().catch(() => null)) as { error?: string } | null;

      if (!response.ok) {
        setError(payload?.error ?? "Login failed.");
        return;
      }

      router.replace("/cms/supply-chain");
      router.refresh();
    } catch {
      setError("Cannot reach the server. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-canvas px-4 py-10 text-ink">
      <section className="w-full max-w-sm rounded-3xl border border-[#1731270f] bg-paper p-6 shadow-[0_24px_80px_rgba(30,47,39,0.10)]">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#eef1e7] text-forest">
          <LockKeyhole size={20} />
        </div>
        <p className="mt-4 text-[11px] font-extrabold tracking-[0.18em] text-muted">SCM CONSOLE</p>
        <h1 className="mt-1 font-[family-name:var(--font-manrope)] text-2xl font-bold tracking-[-0.02em]">
          Sign in
        </h1>
        <p className="mt-2 text-sm leading-6 text-muted">
          Use your GTI Soft username (NIK) and password to access supply chain mapping and page publishing.
        </p>

        <form onSubmit={handleSubmit} className="mt-5 space-y-3">
          <div>
            <label htmlFor="username" className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-muted">
              Username / NIK
            </label>
            <input
              id="username"
              type="text"
              autoComplete="username"
              required
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              className="mt-1 h-11 w-full rounded-xl border border-[#d8dfcf] bg-white px-3 text-base font-medium outline-none transition focus:border-forest focus:ring-4 focus:ring-[#174f3a]/10"
            />
          </div>
          <div>
            <label htmlFor="password" className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-muted">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-1 h-11 w-full rounded-xl border border-[#d8dfcf] bg-white px-3 text-base font-medium outline-none transition focus:border-forest focus:ring-4 focus:ring-[#174f3a]/10"
            />
          </div>

          {error && (
            <div role="alert" className="rounded-xl border border-[#e8c5ad] bg-[#f4ded6] px-3 py-2 text-sm font-medium text-[#8a4b3a]">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-forest px-4 text-sm font-extrabold text-white transition hover:bg-[#123e2d] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading && <Loader2 size={16} className="animate-spin" />}
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </section>
    </main>
  );
}
