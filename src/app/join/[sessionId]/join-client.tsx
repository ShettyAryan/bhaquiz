"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { RetryBanner } from "@/components/retry-banner";
import { useLiveSession } from "@/hooks/use-live-session";
import { readErrorMessage } from "@/lib/api";
import {
  getDeviceToken,
  getSavedName,
  getSavedPhone,
  getSubmittedQuestionKey,
  saveName,
  savePhone,
} from "@/lib/device";
import { isValidPhone, normalizePhone } from "@/lib/phone";

export function JoinClient({ sessionId }: { sessionId: string }) {
  const { state, error, loading, reload } = useLiveSession(sessionId);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [choice, setChoice] = useState("");
  const [deviceToken, setDeviceToken] = useState("");
  const [submittedId, setSubmittedId] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    setDeviceToken(getDeviceToken());
    setName(getSavedName());
    setPhone(getSavedPhone());
    setSubmittedId(sessionStorage.getItem(getSubmittedQuestionKey(sessionId)));
  }, [sessionId]);

  const openQuestion = state?.question?.is_open ? state.question : null;
  const alreadySubmitted = Boolean(
    openQuestion && submittedId && submittedId === openQuestion.id,
  );

  const options = useMemo(() => openQuestion?.options ?? [], [openQuestion]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!openQuestion) return;
    setPending(true);
    setSubmitError(null);
    try {
      const response = await fetch("/api/answers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question_id: openQuestion.id,
          participant_name: name.trim(),
          phone: normalizePhone(phone),
          device_token: deviceToken,
          chosen_option: choice,
        }),
      });

      if (!response.ok) {
        const message = await readErrorMessage(
          response,
          "Could not submit your answer. Check your connection and try again.",
        );
        if (response.status === 409 && /already answered/i.test(message)) {
          sessionStorage.setItem(getSubmittedQuestionKey(sessionId), openQuestion.id);
          setSubmittedId(openQuestion.id);
          saveName(name.trim());
          savePhone(normalizePhone(phone));
          return;
        }
        throw new Error(message);
      }

      sessionStorage.setItem(getSubmittedQuestionKey(sessionId), openQuestion.id);
      setSubmittedId(openQuestion.id);
      saveName(name.trim());
      savePhone(normalizePhone(phone));
    } catch (caught) {
      setSubmitError(
        caught instanceof Error
          ? caught.message
          : "Could not submit your answer. Check your connection and try again.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="mx-auto flex h-full min-h-0 w-full max-w-lg flex-col overflow-hidden px-4 py-3">
      <p className="shrink-0 text-[11px] font-semibold tracking-[0.16em] text-brand uppercase">
        {state ? `Session ${state.session.session_number}` : "Session"}
      </p>
      <h2 className="font-display shrink-0 text-xl leading-tight text-slate-900 sm:text-2xl">
        {state?.session.title ?? "Live question"}
      </h2>

      {loading ? (
        <p className="m-auto text-slate-600">Looking for the live question…</p>
      ) : null}

      {error ? (
        <div className="mt-3 shrink-0">
          <RetryBanner message={error} onRetry={() => void reload()} />
        </div>
      ) : null}

      {!loading && !error && !openQuestion ? (
        <WaitingState title={state?.session.title ?? "this session"} />
      ) : null}

      {openQuestion && alreadySubmitted ? <ConfirmationState /> : null}

      {openQuestion && !alreadySubmitted ? (
        <form onSubmit={onSubmit} className="mt-3 flex min-h-0 flex-1 flex-col gap-2.5">
          <div className="shrink-0">
            <p className="text-xs font-medium text-slate-600">Question</p>
            <p className="mt-1 text-lg leading-snug font-semibold sm:text-xl">
              {openQuestion.question_text}
            </p>
          </div>

          <div className="grid shrink-0 grid-cols-[minmax(0,1fr)_8.75rem] gap-2">
            <label className="block">
              <span className="text-xs font-medium">Your name</span>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={80}
                required
                autoComplete="name"
                placeholder="Name we should announce"
                className="mt-1 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-base outline-none focus:border-brand"
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium">Mobile number</span>
              <input
                value={phone}
                onChange={(event) => setPhone(normalizePhone(event.target.value).slice(0, 10))}
                inputMode="numeric"
                autoComplete="tel"
                required
                maxLength={10}
                placeholder="10-digit mobile"
                className="mt-1 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-base outline-none focus:border-brand"
              />
            </label>
          </div>

          <fieldset className="flex min-h-0 flex-1 flex-col gap-2">
            <legend className="mb-1 text-xs font-medium">Your answer</legend>
            {options.map((option) => {
              const selected = choice === option;
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => setChoice(option)}
                  className={`flex min-h-0 flex-1 items-center rounded-xl border px-4 py-2 text-left text-base font-medium sm:text-lg ${
                    selected
                      ? "border-brand bg-brand text-white"
                      : "border-slate-200 bg-white"
                  }`}
                >
                  {option}
                </button>
              );
            })}
          </fieldset>

          {submitError ? (
            <RetryBanner
              message={submitError}
              onRetry={() => {
                setSubmitError(null);
              }}
            />
          ) : null}

          <button
            type="submit"
            disabled={pending || !choice || !name.trim() || !isValidPhone(phone)}
            className="h-12 shrink-0 rounded-xl bg-brand text-base font-semibold text-white disabled:opacity-50"
          >
            {pending ? "Submitting…" : "Submit answer"}
          </button>
        </form>
      ) : null}
    </main>
  );
}

function WaitingState({ title }: { title: string }) {
  return (
    <div className="m-auto max-w-sm px-2 text-center">
      <div className="mx-auto h-2.5 w-2.5 animate-pulse rounded-full bg-brand" />
      <h2 className="font-display mt-4 text-2xl text-slate-900">
        No active question right now
      </h2>
      <p className="mt-2 text-sm text-slate-600">
        Keep this page open. When the next question for {title} opens, it will
        appear here automatically.
      </p>
    </div>
  );
}

function ConfirmationState() {
  return (
    <div className="m-auto max-w-sm px-2 text-center">
      <p className="text-xs font-semibold tracking-[0.16em] text-brand uppercase">
        Received
      </p>
      <h2 className="font-display mt-2 text-3xl text-slate-900">Answer submitted!</h2>
      <p className="mt-2 text-sm text-slate-600">
        You’re in. Watch the screen for the lucky draw — we won’t say here
        whether you were right.
      </p>
    </div>
  );
}
