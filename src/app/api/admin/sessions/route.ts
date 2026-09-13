import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { jsonError } from "@/lib/api";
import { phoneLast4 } from "@/lib/phone";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { asQuestion, type AdminQuestion, type AdminSession } from "@/lib/types";

export const runtime = "nodejs";

export async function GET() {
  if (!(await requireAdmin())) return jsonError("Unauthorized.", 401);

  try {
    const admin = getSupabaseAdmin();

    const { data: sessions, error: sessionsError } = await admin
      .from("sessions")
      .select("*")
      .order("session_number", { ascending: true });

    if (sessionsError) throw sessionsError;

    const sessionIds = (sessions ?? []).map((session) => session.id);

    const { data: questions, error: questionsError } = sessionIds.length
      ? await admin
          .from("questions")
          .select("*")
          .in("session_id", sessionIds)
          .order("created_at", { ascending: true })
      : { data: [], error: null };

    if (questionsError) throw questionsError;

    const questionIds = (questions ?? []).map((question) => question.id);

    const { data: answers, error: answersError } = questionIds.length
      ? await admin
          .from("answers")
          .select("id, question_id, is_correct")
          .in("question_id", questionIds)
      : { data: [], error: null };

    if (answersError) throw answersError;

    const { data: winners, error: winnersError } = sessionIds.length
      ? await admin
          .from("winners")
          .select("id, session_id, answer_id, picked_at, answers(participant_name, phone, question_id)")
          .in("session_id", sessionIds)
          .order("picked_at", { ascending: false })
      : { data: [], error: null };

    if (winnersError) throw winnersError;

    const counts = new Map<string, { total: number; correct: number }>();
    for (const answer of answers ?? []) {
      const current = counts.get(answer.question_id) ?? { total: 0, correct: 0 };
      current.total += 1;
      if (answer.is_correct) current.correct += 1;
      counts.set(answer.question_id, current);
    }

    const questionsBySession = new Map<string, AdminQuestion[]>();
    for (const row of questions ?? []) {
      const question = asQuestion(row as Record<string, unknown>);
      const count = counts.get(question.id) ?? { total: 0, correct: 0 };
      const list = questionsBySession.get(question.session_id) ?? [];
      list.push({
        ...question,
        answerCount: count.total,
        correctCount: count.correct,
      });
      questionsBySession.set(question.session_id, list);
    }

    const winnersBySession = new Map<string, AdminSession["winners"]>();
    for (const row of winners ?? []) {
      const joined = row.answers as
        | { participant_name: string; phone: string | null; question_id: string }
        | { participant_name: string; phone: string | null; question_id: string }[]
        | null;
      const answer = Array.isArray(joined) ? joined[0] : joined;
      const list = winnersBySession.get(row.session_id) ?? [];
      list.push({
        id: row.id,
        picked_at: row.picked_at,
        participant_name: answer?.participant_name ?? "Unknown",
        phone_last4: phoneLast4(answer?.phone),
        question_id: answer?.question_id ?? "",
      });
      winnersBySession.set(row.session_id, list);
    }

    const payload: AdminSession[] = (sessions ?? []).map((session) => ({
      id: session.id,
      session_number: session.session_number,
      title: session.title,
      created_at: session.created_at,
      questions: questionsBySession.get(session.id) ?? [],
      winners: winnersBySession.get(session.id) ?? [],
    }));

    return NextResponse.json({ sessions: payload });
  } catch (error) {
    console.error("admin sessions", error);
    return jsonError("Could not load sessions. Try again.", 500);
  }
}
