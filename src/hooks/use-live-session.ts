"use client";

import { useCallback, useEffect, useState } from "react";
import { readErrorMessage } from "@/lib/api";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";
import type { PublicSessionState } from "@/lib/types";

export function useLiveSession(
  sessionId: string,
  options?: { subscribeToAnswerCounts?: boolean },
) {
  const subscribeToAnswerCounts = options?.subscribeToAnswerCounts ?? false;
  const [state, setState] = useState<PublicSessionState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const response = await fetch(`/api/public/session/${sessionId}`, {
        cache: "no-store",
      });
      if (!response.ok) {
        throw new Error(
          await readErrorMessage(
            response,
            "Could not load this session. Check your connection and try again.",
          ),
        );
      }
      const payload = (await response.json()) as PublicSessionState;
      setState(payload);
      setError(null);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Could not load this session. Check your connection and try again.",
      );
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!isSupabaseConfigured()) return;

    try {
      const supabase = getSupabaseBrowserClient();
      const questionsChannel = supabase
        .channel(`live-question:${sessionId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "live_question_state",
            filter: `session_id=eq.${sessionId}`,
          },
          () => {
            void load();
          },
        )
        .subscribe();

      const winnersChannel = supabase
        .channel(`winners:${sessionId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "winners",
            filter: `session_id=eq.${sessionId}`,
          },
          () => {
            void load();
          },
        )
        .subscribe();

      return () => {
        void supabase.removeChannel(questionsChannel);
        void supabase.removeChannel(winnersChannel);
      };
    } catch {
      setError("Live updates are unavailable. Pull to refresh if the screen looks stuck.");
    }
  }, [load, sessionId]);

  useEffect(() => {
    const questionId = state?.question?.id;
    if (!subscribeToAnswerCounts || !questionId || !isSupabaseConfigured()) return;

    try {
      const supabase = getSupabaseBrowserClient();
      const answersChannel = supabase
        .channel(`answer-counts:${questionId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "answer_counts",
            filter: `question_id=eq.${questionId}`,
          },
          (payload) => {
            const next = payload.new as { total?: number } | null;
            if (typeof next?.total !== "number") return;
            setState((current) =>
              current && current.question?.id === questionId
                ? { ...current, answerCount: next.total ?? current.answerCount }
                : current,
            );
          },
        )
        .subscribe();

      return () => {
        void supabase.removeChannel(answersChannel);
      };
    } catch {
      // Count will stay at the last fetched value.
    }
  }, [subscribeToAnswerCounts, state?.question?.id]);

  return { state, error, loading, reload: load };
}
