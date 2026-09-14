"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { readErrorMessage } from "@/lib/api";

export default function AdminLoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!response.ok) {
        throw new Error(await readErrorMessage(response, "Could not sign in."));
      }
      router.push("/admin");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not sign in.");
      setPending(false);
    }
  }

  return (
    <main className="flex min-h-0 flex-1 items-center justify-center px-4 py-3">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-md rounded-3xl bg-white p-5 shadow-sm sm:p-7"
      >
        <p className="text-xs font-semibold tracking-[0.18em] text-brand uppercase">
          Organizer
        </p>
        <h2 className="font-display mt-1 text-3xl text-slate-900 sm:text-4xl">Admin login</h2>
        <label className="mt-5 block text-sm font-medium" htmlFor="password">
          Password
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
          className="mt-2 h-12 w-full rounded-xl border border-slate-200 px-3 outline-none focus:border-brand"
        />
        {error ? <p className="mt-3 text-sm text-red-800">{error}</p> : null}
        <button
          type="submit"
          disabled={pending}
          className="mt-5 h-12 w-full rounded-xl bg-brand font-semibold text-white disabled:opacity-60"
        >
          {pending ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </main>
  );
}
