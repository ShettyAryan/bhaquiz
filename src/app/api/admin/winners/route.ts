import { randomInt } from "crypto";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { jsonError, parseJson } from "@/lib/api";
import { phoneLast4 } from "@/lib/phone";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!(await requireAdmin())) return jsonError("Unauthorized.", 401);

  let body: { session_id?: string; question_id?: string } | null = null;
  try {
    body = parseJson(await request.json());
  } catch {
    return jsonError("Invalid request.");
  }

  const sessionId = body?.session_id ?? "";
  const questionId = body?.question_id ?? "";
  if (!sessionId || !questionId) {
    return jsonError("Session and question are required.");
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
      return jsonError("Close the question before picking a winner.");
    }

    const { data: correct, error: correctError } = await admin
      .from("answers")
      .select("id, participant_name, phone")
      .eq("question_id", questionId)
      .eq("is_correct", true);

    if (correctError) throw correctError;
    if (!correct?.length) {
      return jsonError("No correct answers to draw from.");
    }

    const picked = correct[randomInt(correct.length)];

    const { data: winner, error: winnerError } = await admin
      .from("winners")
      .insert({ session_id: sessionId, answer_id: picked.id })
      .select("id, picked_at")
      .single();

    if (winnerError) throw winnerError;

    return NextResponse.json({
      winner: {
        id: winner.id,
        name: picked.participant_name,
        phone_last4: phoneLast4(picked.phone),
        answer_id: picked.id,
        picked_at: winner.picked_at,
      },
    });
  } catch (error) {
    console.error("pick winner", error);
    return jsonError("Could not pick a winner. Try again.", 500);
  }
}
