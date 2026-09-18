"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { RetryBanner } from "@/components/retry-banner";
import { readErrorMessage } from "@/lib/api";
import { displayNameWithLast4 } from "@/lib/phone";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";
import type { AdminQuestion, AdminSession, CorrectAnswerRow } from "@/lib/types";

type QuestionDraft = {
  question_text: string;
  options: string[];
  correct_option: string;
};

const emptyDraft = (): QuestionDraft => ({
  question_text: "",
  options: ["", ""],
  correct_option: "",
});

export function AdminDashboard() {
  const router = useRouter();
  const [sessions, setSessions] = useState<AdminSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/sessions", { cache: "no-store" });
      if (response.status === 401) {
        router.push("/admin/login");
        return;
      }
      if (!response.ok) {
        throw new Error(await readErrorMessage(response, "Could not load sessions."));
      }
      const payload = (await response.json()) as { sessions: AdminSession[] };
      setSessions(payload.sessions);
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load sessions.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
  }

  async function seedSessions() {
    setBusy("seed");
    try {
      const response = await fetch("/api/admin/sessions/seed", { method: "POST" });
      if (!response.ok) {
        throw new Error(await readErrorMessage(response, "Could not create sessions."));
      }
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not create sessions.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-5 py-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold tracking-[0.18em] text-brand uppercase">
            Organizer console
          </p>
          <h2 className="font-display text-4xl text-slate-900">Quiz admin</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href="/api/admin/export/winners"
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium"
          >
            Export all winners CSV
          </a>
          <button
            type="button"
            onClick={() => void logout()}
            className="rounded-xl bg-brand px-4 py-2 text-sm font-medium text-white"
          >
            Log out
          </button>
        </div>
      </header>

      {error ? (
        <div className="mt-6">
          <RetryBanner message={error} onRetry={() => void load()} />
        </div>
      ) : null}

      {loading ? <p className="mt-10 text-slate-600">Loading sessions…</p> : null}

      {!loading && !error && sessions.length === 0 ? (
        <div className="mt-10 rounded-3xl bg-white p-8">
          <h2 className="font-display text-3xl">Create the 10 sessions</h2>
          <p className="mt-2 text-slate-600">
            No sessions yet. This will add Session 1–10 so you can attach questions.
          </p>
          <button
            type="button"
            onClick={() => void seedSessions()}
            disabled={busy === "seed"}
            className="mt-6 rounded-xl bg-brand px-5 py-3 font-semibold text-white disabled:opacity-60"
          >
            {busy === "seed" ? "Creating…" : "Create 10 sessions"}
          </button>
        </div>
      ) : null}

      <div className="mt-8 space-y-6">
        {sessions.map((session) => (
          <SessionCard
            key={session.id}
            session={session}
            onChanged={load}
            setError={setError}
          />
        ))}
      </div>
    </main>
  );
}

function SessionCard({
  session,
  onChanged,
  setError,
}: {
  session: AdminSession;
  onChanged: () => Promise<void>;
  setError: (message: string | null) => void;
}) {
  const [title, setTitle] = useState(session.title);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<QuestionDraft>(emptyDraft());
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    setTitle(session.title);
  }, [session.title]);

  async function saveTitle() {
    const trimmed = title.trim();
    if (!trimmed || trimmed === session.title) return;
    try {
      const response = await fetch(`/api/admin/sessions/${session.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: trimmed }),
      });
      if (!response.ok) {
        throw new Error(await readErrorMessage(response, "Could not save title."));
      }
      await onChanged();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save title.");
    }
  }

  function startCreate() {
    setCreating(true);
    setEditingId(null);
    setDraft(emptyDraft());
  }

  function startEdit(question: AdminQuestion) {
    setCreating(false);
    setEditingId(question.id);
    setDraft({
      question_text: question.question_text,
      options: [...question.options],
      correct_option: question.correct_option,
    });
  }

  return (
    <section className="rounded-3xl bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold tracking-[0.16em] text-brand uppercase">
            Session {session.session_number}
          </p>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            onBlur={() => void saveTitle()}
            className="mt-1 w-full border-b border-transparent text-2xl font-semibold outline-none focus:border-slate-300"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href={`/screen/${session.id}`}
            target="_blank"
            rel="noreferrer"
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium"
          >
            Open projector screen
          </a>
          <a
            href={`/join/${session.id}`}
            target="_blank"
            rel="noreferrer"
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium"
          >
            Open join page
          </a>
          <a
            href={`/api/admin/export/answers?sessionId=${session.id}`}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium"
          >
            Export answers CSV
          </a>
        </div>
      </div>

      <div className="mt-6 space-y-4">
        {session.questions.map((question) => (
          <QuestionPanel
            key={question.id}
            session={session}
            question={question}
            editing={editingId === question.id}
            draft={draft}
            setDraft={setDraft}
            onStartEdit={() => startEdit(question)}
            onCancelEdit={() => setEditingId(null)}
            onChanged={onChanged}
            setError={setError}
          />
        ))}
      </div>

      {creating ? (
        <div className="mt-4 rounded-2xl border border-slate-200 p-4">
          <QuestionForm
            draft={draft}
            setDraft={setDraft}
            submitLabel="Save question"
            onCancel={() => setCreating(false)}
            onSubmit={async () => {
              const response = await fetch("/api/admin/questions", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ session_id: session.id, ...draft }),
              });
              if (!response.ok) {
                throw new Error(await readErrorMessage(response, "Could not save question."));
              }
              setCreating(false);
              setDraft(emptyDraft());
              await onChanged();
            }}
            setError={setError}
          />
        </div>
      ) : (
        <button
          type="button"
          onClick={startCreate}
          className="mt-5 text-sm font-semibold text-brand"
        >
          + Add question
        </button>
      )}

      {session.winners.length > 0 ? (
        <div className="mt-5 border-t border-slate-100 pt-4">
          <p className="text-sm font-medium">Winner history</p>
          <ul className="mt-2 space-y-1 text-sm text-slate-600">
            {session.winners.map((winner) => (
              <li key={winner.id}>
                {displayNameWithLast4(winner.participant_name, winner.phone_last4)} ·{" "}
                {new Date(winner.picked_at).toLocaleString()}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

function QuestionPanel({
  session,
  question,
  editing,
  draft,
  setDraft,
  onStartEdit,
  onCancelEdit,
  onChanged,
  setError,
}: {
  session: AdminSession;
  question: AdminQuestion;
  editing: boolean;
  draft: QuestionDraft;
  setDraft: (draft: QuestionDraft) => void;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onChanged: () => Promise<void>;
  setError: (message: string | null) => void;
}) {
  const [liveCount, setLiveCount] = useState(question.answerCount);
  const [results, setResults] = useState<{
    total: number;
    correctCount: number;
    incorrectCount: number;
    correct: CorrectAnswerRow[];
  } | null>(null);
  const [drawing, setDrawing] = useState(false);
  const [shuffleNames, setShuffleNames] = useState<string[]>([]);
  const [pendingWinners, setPendingWinners] = useState<
    Array<{ answer_id: string; name: string; phone_last4: string }>
  >([]);
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    setLiveCount(question.answerCount);
  }, [question.answerCount, question.id]);

  useEffect(() => {
    if (!question.is_open || !isSupabaseConfigured()) return;
    try {
      const supabase = getSupabaseBrowserClient();
      const channel = supabase
        .channel(`admin-answer-counts:${question.id}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "answer_counts",
            filter: `question_id=eq.${question.id}`,
          },
          (payload) => {
            const next = payload.new as { total?: number } | null;
            if (typeof next?.total === "number") setLiveCount(next.total);
          },
        )
        .subscribe();
      return () => {
        void supabase.removeChannel(channel);
      };
    } catch {
      // Keep the last known count if realtime is unavailable.
    }
  }, [question.id, question.is_open]);

  const loadResults = useCallback(async () => {
    if (question.is_open) return;
    try {
      const response = await fetch(`/api/admin/questions/${question.id}/answers`);
      if (!response.ok) {
        throw new Error(await readErrorMessage(response, "Could not load answers."));
      }
      setResults(await response.json());
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load answers.");
    }
  }, [question.id, question.is_open, setError]);

  useEffect(() => {
    if (!question.is_open) {
      void loadResults();
    } else {
      setResults(null);
      setPendingWinners([]);
      setShuffleNames([]);
    }
  }, [loadResults, question.is_open]);

  async function runAction(path: string, failure: string) {
    try {
      const response = await fetch(path, { method: "POST" });
      if (!response.ok) {
        throw new Error(await readErrorMessage(response, failure));
      }
      await onChanged();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : failure);
    }
  }

  async function drawFromServer(count: number, excludeAnswerIds: string[] = []) {
    const response = await fetch("/api/admin/winners/draw", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        session_id: session.id,
        question_id: question.id,
        count,
        exclude_answer_ids: excludeAnswerIds,
      }),
    });
    if (!response.ok) {
      throw new Error(await readErrorMessage(response, "Could not draw winners."));
    }
    const payload = (await response.json()) as {
      winners: Array<{ answer_id: string; name: string; phone_last4: string }>;
    };
    return payload.winners;
  }

  async function drawWinners() {
    const names =
      results?.correct.map((row) =>
        displayNameWithLast4(row.participant_name, row.phone_last4),
      ) ?? [];
    if (!names.length) {
      setError("No correct answers to draw from.");
      return;
    }

    setDrawing(true);
    setError(null);

    let drawn: Array<{ answer_id: string; name: string; phone_last4: string }> = [];
    try {
      drawn = await drawFromServer(Math.min(2, names.length));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not draw winners.");
      setDrawing(false);
      return;
    }

    const started = Date.now();
    const duration = 3200;
    const tick = window.setInterval(() => {
      setShuffleNames(
        Array.from(
          { length: drawn.length },
          () => names[Math.floor(Math.random() * names.length)] ?? "",
        ),
      );
      if (Date.now() - started > duration) {
        window.clearInterval(tick);
        setShuffleNames(
          drawn.map((row) => displayNameWithLast4(row.name, row.phone_last4)),
        );
        setPendingWinners(drawn);
        setDrawing(false);
      }
    }, 80);
  }

  async function redrawSlot(index: number) {
    const exclude = pendingWinners
      .filter((_, slot) => slot !== index)
      .map((row) => row.answer_id);
    try {
      const [next] = await drawFromServer(1, exclude);
      if (!next) return;
      setPendingWinners((current) =>
        current.map((row, slot) => (slot === index ? next : row)),
      );
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Could not re-draw that winner.",
      );
    }
  }

  function changeSlot(index: number, answerId: string) {
    const row = results?.correct.find((item) => item.id === answerId);
    if (!row) return;
    setPendingWinners((current) =>
      current.map((item, slot) =>
        slot === index
          ? {
              answer_id: row.id,
              name: row.participant_name,
              phone_last4: row.phone_last4,
            }
          : item,
      ),
    );
  }

  async function postWinners() {
    if (!pendingWinners.length) return;
    setPosting(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/winners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: session.id,
          question_id: question.id,
          answer_ids: pendingWinners.map((row) => row.answer_id),
        }),
      });
      if (!response.ok) {
        throw new Error(await readErrorMessage(response, "Could not post winners."));
      }
      setPendingWinners([]);
      await onChanged();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not post winners.");
    } finally {
      setPosting(false);
    }
  }

  const postedWinners = useMemo(
    () =>
      session.winners.filter((winner) => winner.question_id === question.id).slice(0, 2),
    [question.id, session.winners],
  );

  return (
    <article className="rounded-2xl border border-slate-200 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-lg font-semibold">{question.question_text}</p>
          <p className="mt-1 text-sm text-slate-500">
            {question.is_open
              ? `${liveCount} submitted`
              : `${question.answerCount} answers · ${question.correctCount} correct`}
            {question.is_open ? " · LIVE" : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {!question.is_open ? (
            <button
              type="button"
              onClick={onStartEdit}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
            >
              Edit
            </button>
          ) : null}
          {question.is_open ? (
            <button
              type="button"
              onClick={() =>
                void runAction(
                  `/api/admin/questions/${question.id}/close`,
                  "Could not close the question.",
                )
              }
              className="rounded-lg bg-brand-strong px-3 py-1.5 text-sm font-semibold text-white"
            >
              Close question
            </button>
          ) : (
            <button
              type="button"
              onClick={() =>
                void runAction(
                  `/api/admin/questions/${question.id}/open`,
                  "Could not open the question.",
                )
              }
              className="rounded-lg bg-brand px-3 py-1.5 text-sm font-semibold text-white"
            >
              Open question
            </button>
          )}
        </div>
      </div>

      {editing ? (
        <div className="mt-4">
          <QuestionForm
            draft={draft}
            setDraft={setDraft}
            submitLabel="Save changes"
            onCancel={onCancelEdit}
            onSubmit={async () => {
              const response = await fetch(`/api/admin/questions/${question.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(draft),
              });
              if (!response.ok) {
                throw new Error(await readErrorMessage(response, "Could not update question."));
              }
              onCancelEdit();
              await onChanged();
            }}
            setError={setError}
          />
        </div>
      ) : (
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {question.options.map((option) => (
            <li
              key={option}
              className={`rounded-xl px-3 py-2 text-sm ${
                option === question.correct_option
                  ? "bg-emerald-50 text-emerald-950"
                  : "bg-slate-50"
              }`}
            >
              {option}
              {option === question.correct_option ? " · correct" : ""}
            </li>
          ))}
        </ul>
      )}

      {!question.is_open && results ? (
        <div className="mt-5 border-t border-slate-100 pt-4">
          <p className="text-sm text-slate-600">
            {results.correctCount} correct · {results.incorrectCount} incorrect ·{" "}
            {results.total} total
          </p>
          {results.correct.length > 0 ? (
            <div className="mt-3 max-h-48 overflow-auto rounded-xl bg-slate-50 p-3">
              <p className="text-sm font-medium">Correct answers</p>
              <ul className="mt-2 space-y-1 text-sm">
                {results.correct.map((row) => (
                  <li key={row.id}>
                    {displayNameWithLast4(row.participant_name, row.phone_last4)}
                    <span className="ml-2 text-slate-500">
                      {new Date(row.submitted_at).toLocaleTimeString()}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="mt-2 text-sm text-slate-500">No correct answers yet.</p>
          )}

          <div className="mt-4 space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => void drawWinners()}
                disabled={drawing || posting || results.correct.length === 0}
                className="rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {drawing
                  ? "Drawing…"
                  : pendingWinners.length || postedWinners.length
                    ? "Re-draw both"
                    : results.correct.length === 1
                      ? "Draw 1 winner"
                      : "Draw 2 winners"}
              </button>
              {pendingWinners.length > 0 ? (
                <button
                  type="button"
                  onClick={() => void postWinners()}
                  disabled={drawing || posting}
                  className="rounded-xl bg-brand-strong px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {posting ? "Posting…" : "Post to screen"}
                </button>
              ) : null}
            </div>

            {drawing ? (
              <div className="grid gap-2 sm:grid-cols-2">
                {(shuffleNames.length ? shuffleNames : ["…"]).map((name, index) => (
                  <p
                    key={`shuffle-${index}`}
                    className="animate-shuffle rounded-xl bg-slate-50 px-3 py-2 text-lg font-semibold"
                  >
                    {name || "…"}
                  </p>
                ))}
              </div>
            ) : null}

            {!drawing && pendingWinners.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {pendingWinners.map((winner, index) => (
                  <div
                    key={`${winner.answer_id}-${index}`}
                    className="rounded-xl border border-sky-100 bg-white p-3"
                  >
                    <p className="text-xs font-semibold tracking-[0.14em] text-brand uppercase">
                      Winner {index + 1}
                    </p>
                    <select
                      value={winner.answer_id}
                      onChange={(event) => changeSlot(index, event.target.value)}
                      className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-sm"
                    >
                      {results.correct.map((row) => (
                        <option
                          key={row.id}
                          value={row.id}
                          disabled={pendingWinners.some(
                            (other, slot) =>
                              slot !== index && other.answer_id === row.id,
                          )}
                        >
                          {displayNameWithLast4(row.participant_name, row.phone_last4)}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => void redrawSlot(index)}
                      disabled={drawing || posting || results.correct.length < 2}
                      className="mt-2 text-sm font-semibold text-brand disabled:opacity-50"
                    >
                      Re-draw this one
                    </button>
                  </div>
                ))}
              </div>
            ) : null}

            {!drawing && pendingWinners.length === 0 && postedWinners.length > 0 ? (
              <p className="text-sm text-slate-600">
                On screen:{" "}
                <strong>
                  {postedWinners
                    .map((winner) =>
                      displayNameWithLast4(
                        winner.participant_name,
                        winner.phone_last4,
                      ),
                    )
                    .join(" · ")}
                </strong>
              </p>
            ) : null}

            {pendingWinners.length > 0 ? (
              <p className="text-xs text-slate-500">
                These names stay on admin only until you post them to the projector.
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
    </article>
  );
}

function QuestionForm({
  draft,
  setDraft,
  submitLabel,
  onSubmit,
  onCancel,
  setError,
}: {
  draft: QuestionDraft;
  setDraft: (draft: QuestionDraft) => void;
  submitLabel: string;
  onSubmit: () => Promise<void>;
  onCancel: () => void;
  setError: (message: string | null) => void;
}) {
  const [pending, setPending] = useState(false);

  function updateOption(index: number, value: string) {
    const options = draft.options.map((option, optionIndex) =>
      optionIndex === index ? value : option,
    );
    setDraft({
      ...draft,
      options,
      correct_option:
        draft.correct_option === draft.options[index] ? value : draft.correct_option,
    });
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    try {
      await onSubmit();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save the question.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <input
        value={draft.question_text}
        onChange={(event) => setDraft({ ...draft, question_text: event.target.value })}
        placeholder="Question text"
        required
        className="h-11 w-full rounded-xl border border-slate-300 px-3"
      />
      {draft.options.map((option, index) => (
        <div key={index} className="flex items-center gap-2">
          <input
            type="radio"
            name="correct"
            checked={draft.correct_option === option && option !== ""}
            onChange={() => setDraft({ ...draft, correct_option: option })}
            aria-label={`Mark option ${index + 1} as correct`}
          />
          <input
            value={option}
            onChange={(event) => updateOption(index, event.target.value)}
            placeholder={`Option ${index + 1}`}
            required
            className="h-11 flex-1 rounded-xl border border-slate-300 px-3"
          />
          {draft.options.length > 2 ? (
            <button
              type="button"
              onClick={() =>
                setDraft({
                  ...draft,
                  options: draft.options.filter((_, optionIndex) => optionIndex !== index),
                  correct_option: draft.correct_option === option ? "" : draft.correct_option,
                })
              }
              className="text-sm text-slate-500"
            >
              Remove
            </button>
          ) : null}
        </div>
      ))}
      {draft.options.length < 4 ? (
        <button
          type="button"
          onClick={() => setDraft({ ...draft, options: [...draft.options, ""] })}
          className="text-sm font-medium text-brand"
        >
          Add option
        </button>
      ) : null}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {pending ? "Saving…" : submitLabel}
        </button>
        <button type="button" onClick={onCancel} className="rounded-xl px-4 py-2 text-sm">
          Cancel
        </button>
      </div>
    </form>
  );
}
