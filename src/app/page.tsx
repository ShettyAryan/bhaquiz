"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { readErrorMessage } from "@/lib/api";

export default function HomePage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const response = await fetch(`/api/public/join-code/${code.trim()}`);
      if (!response.ok) {
        throw new Error(
          await readErrorMessage(response, "Could not find that session. Try again."),
        );
      }
      const payload = (await response.json()) as { session: { id: string } };
      router.push(`/join/${payload.session.id}`);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Could not find that session. Try again.",
      );
      setPending(false);
    }
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-8">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 text-center shadow-sm ring-1 ring-sky-100">
        <p className="text-base leading-7 text-slate-600">
          Scan the QR on the projector, or enter the session code shown on screen.
        </p>

        <form onSubmit={onSubmit} className="mt-8 space-y-4 text-left">
          <label className="block text-sm font-medium" htmlFor="code">
            Session code
          </label>
          <input
            id="code"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={2}
            value={code}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))}
            placeholder="1–10"
            className="h-14 w-full rounded-2xl border border-slate-200 bg-white px-4 text-lg outline-none focus:border-brand"
            required
          />
          {error ? <p className="text-sm text-red-700">{error}</p> : null}
          <button
            type="submit"
            disabled={pending}
            className="h-14 w-full rounded-2xl bg-brand text-lg font-semibold text-white disabled:opacity-60"
          >
            {pending ? "Joining…" : "Join session"}
          </button>
        </form>
      </div>
    </main>
  );
}
