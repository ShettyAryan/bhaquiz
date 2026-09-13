"use client";

import { useEffect, useMemo, useState } from "react";
import { RetryBanner } from "@/components/retry-banner";
import { useLiveSession } from "@/hooks/use-live-session";

export function ScreenClient({ sessionId }: { sessionId: string }) {
  const { state, error, loading, reload } = useLiveSession(sessionId);
  const [qr, setQr] = useState<string>("");
  const [joinUrl, setJoinUrl] = useState("");

  useEffect(() => {
    const url = `${window.location.origin}/join/${sessionId}`;
    setJoinUrl(url);
    let cancelled = false;

    async function makeQr() {
      try {
        const QRCode = (await import("qrcode")).default;
        const dataUrl = await QRCode.toDataURL(url, {
          width: 900,
          margin: 1,
          errorCorrectionLevel: "M",
          color: { dark: "#115e59", light: "#ffffff" },
        });
        if (!cancelled) setQr(dataUrl);
      } catch {
        if (!cancelled) setQr("");
      }
    }

    void makeQr();
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  const question = state?.question ?? null;
  const isOpen = Boolean(question?.is_open);
  const showWinner = Boolean(
    state?.winner &&
      question &&
      !question.is_open &&
      question.opened_at &&
      new Date(state.winner.picked_at) >= new Date(question.opened_at),
  );

  const countLabel = useMemo(() => {
    const count = state?.answerCount ?? 0;
    return `${count} ${count === 1 ? "person has" : "people have"} answered`;
  }, [state?.answerCount]);

  return (
    <main className="flex h-full min-h-0 flex-col overflow-hidden bg-background text-slate-900">
      <div className="flex shrink-0 items-center justify-between gap-4 px-6 py-2">
        <h2 className="font-display truncate text-xl sm:text-2xl">
          {state
            ? state.session.title &&
              state.session.title !== `Session ${state.session.session_number}`
              ? `Session ${state.session.session_number} · ${state.session.title}`
              : `Session ${state.session.session_number}`
            : "Session"}
        </h2>
        <p className="shrink-0 text-right text-base font-semibold text-brand sm:text-lg">
          {countLabel}
        </p>
      </div>

      {error ? (
        <div className="shrink-0 px-6 pb-2">
          <RetryBanner message={error} onRetry={() => void reload()} />
        </div>
      ) : null}

      {loading && !state ? (
        <p className="m-auto text-xl text-slate-500">Connecting to the live session…</p>
      ) : null}

      {showWinner && state?.winner ? (
        <WinnerReveal name={state.winner.name} />
      ) : question && isOpen ? (
        <OpenQuestion
          text={question.question_text}
          options={question.options}
          qr={qr}
          joinUrl={joinUrl}
          sessionNumber={state?.session.session_number ?? 0}
        />
      ) : question && !isOpen ? (
        <ClosedState />
      ) : !loading && !error && !question ? (
        <WaitingScreen />
      ) : null}
    </main>
  );
}

function OpenQuestion({
  text,
  options,
  qr,
  joinUrl,
  sessionNumber,
}: {
  text: string;
  options: string[];
  qr: string;
  joinUrl: string;
  sessionNumber: number;
}) {
  return (
    <section className="grid min-h-0 flex-1 grid-cols-1 items-stretch gap-4 overflow-hidden px-6 pb-3 lg:grid-cols-[minmax(0,1.15fr)_minmax(16rem,0.85fr)]">
      <div className="flex min-h-0 flex-col overflow-hidden">
        <p className="shrink-0 text-sm font-semibold tracking-[0.16em] text-brand uppercase">
          Question
        </p>
        <h3 className="font-display mt-1 shrink-0 text-[clamp(1.5rem,4.4vh,3.25rem)] leading-tight text-slate-900">
          {text}
        </h3>
        <ol className="mt-3 flex min-h-0 flex-1 flex-col justify-center gap-2 overflow-hidden">
          {options.map((option, index) => (
            <li
              key={option}
              className="flex min-h-0 flex-1 items-center rounded-xl border border-sky-100 bg-white px-4 py-2 text-[clamp(1rem,2.4vh,1.65rem)]"
            >
              <span className="mr-3 shrink-0 font-semibold text-brand">
                {String.fromCharCode(65 + index)}.
              </span>
              <span className="min-w-0">{option}</span>
            </li>
          ))}
        </ol>
      </div>

      <div className="flex min-h-0 flex-col items-center">
        <div className="flex min-h-0 flex-1 items-center justify-center">
          <div className="aspect-square h-full max-h-full w-auto max-w-full rounded-2xl bg-white p-3 shadow-sm ring-1 ring-sky-100">
            {qr ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={qr}
                alt="Scan to join the quiz"
                className="h-full w-full object-contain"
              />
            ) : (
              <div className="h-full w-full bg-slate-100" />
            )}
          </div>
        </div>
        <p className="mt-2 max-w-full shrink-0 truncate text-center text-xs text-slate-600 sm:text-sm">
          {joinUrl}
        </p>
        <p className="mt-0.5 shrink-0 text-center text-lg font-semibold sm:text-xl">
          Session code <span className="text-brand">{sessionNumber}</span>
        </p>
      </div>
    </section>
  );
}

function ClosedState() {
  return (
    <section className="m-auto px-6 text-center">
      <p className="text-sm font-semibold tracking-[0.16em] text-brand uppercase">
        Time’s up
      </p>
      <h3 className="font-display mt-2 text-[clamp(2.25rem,8vh,5.5rem)] text-slate-900">
        Answers are closed
      </h3>
      <p className="mt-3 text-lg text-slate-600 sm:text-xl">
        Watch this screen for the lucky draw.
      </p>
    </section>
  );
}

function WaitingScreen() {
  return (
    <section className="m-auto px-6 text-center">
      <h3 className="font-display text-[clamp(2.25rem,8vh,5.5rem)] text-slate-900">
        Waiting for the next question
      </h3>
      <p className="mt-3 text-lg text-slate-600 sm:text-xl">
        Keep the camera ready. The QR will appear when the question opens.
      </p>
    </section>
  );
}

function WinnerReveal({ name }: { name: string }) {
  return (
    <section className="relative m-auto px-6 text-center">
      <span className="sparkle absolute top-0 left-8 text-3xl text-brand">✦</span>
      <span className="sparkle absolute top-6 right-10 text-2xl text-brand [animation-delay:400ms]">
        ✦
      </span>
      <p className="text-sm font-semibold tracking-[0.2em] text-brand uppercase">
        Lucky draw winner
      </p>
      <h3 className="animate-winner font-display mt-3 text-[clamp(2.5rem,10vh,6rem)] leading-none text-slate-900">
        {name}
      </h3>
    </section>
  );
}
