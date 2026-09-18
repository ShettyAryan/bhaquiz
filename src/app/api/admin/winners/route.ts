import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { jsonError, parseJson } from "@/lib/api";
import { phoneLast4 } from "@/lib/phone";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  if (!(await requireAdmin())) return jsonError("Unauthorized.", 401);

  let body: {
    session_id?: string;
    question_id?: string;
    answer_ids?: string[];
  } | null = null;
  try {
    body = parseJson(await request.json());
  } catch {
    return jsonError("Invalid request.");
  }

  const sessionId = body?.session_id ?? "";
  const questionId = body?.question_id ?? "";
  const answerIds = [...new Set((body?.answer_ids ?? []).filter((id) => UUID_RE.test(id)))];

  if (!sessionId || !questionId) {
    return jsonError("Session and question are required.");
  }
  if (answerIds.length < 1 || answerIds.length > 2) {
    return jsonError("Post 1 or 2 winners.");
  }

  try {
    const admin = getSupabaseAdmin();

    const { data: question, error: questionError } = await admin
      .from("questions")
      .select("id, session_id, is_open")
      .eq("id", questionId)
      .maybeSingle();

    if (questionError) throw questionError;
    if (!question || question.session_id !== sessionId) {
      return jsonError("Question not found for this session.", 404);
    }
    if (question.is_open) {
      return jsonError("Close the question before posting winners.");
    }

    const { data: correct, error: correctError } = await admin
      .from("answers")
      .select("id, participant_name, phone")
      .eq("question_id", questionId)
      .eq("is_correct", true)
      .in("id", answerIds);

    if (correctError) throw correctError;
    if ((correct ?? []).length !== answerIds.length) {
      return jsonError("Winners must be people who answered correctly.");
    }

    const { data: questionAnswers, error: questionAnswersError } = await admin
      .from("answers")
      .select("id")
      .eq("question_id", questionId);

    if (questionAnswersError) throw questionAnswersError;

    const previousAnswerIds = (questionAnswers ?? []).map((row) => row.id);
    if (previousAnswerIds.length) {
      const { error: deleteError } = await admin
        .from("winners")
        .delete()
        .in("answer_id", previousAnswerIds);
      if (deleteError) throw deleteError;
    }

    const byId = new Map((correct ?? []).map((row) => [row.id, row]));
    const rows = answerIds.map((id) => ({
      session_id: sessionId,
      answer_id: id,
    }));

    const { data: inserted, error: winnerError } = await admin
      .from("winners")
      .insert(rows)
      .select("id, answer_id, picked_at");

    if (winnerError) throw winnerError;

    const winners = (inserted ?? []).map((row) => {
      const answer = byId.get(row.answer_id);
      return {
        id: row.id,
        name: answer?.participant_name ?? "",
        phone_last4: phoneLast4(answer?.phone),
        answer_id: row.answer_id,
        picked_at: row.picked_at,
      };
    });

    return NextResponse.json({ winners });
  } catch (error) {
    console.error("post winners", error);
    return jsonError("Could not post winners. Try again.", 500);
  }
}
