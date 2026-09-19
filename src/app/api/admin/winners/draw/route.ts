import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { jsonError, parseJson } from "@/lib/api";
import { phoneLast4 } from "@/lib/phone";
import { pickUnique } from "@/lib/random";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  if (!(await requireAdmin())) return jsonError("Unauthorized.", 401);

  let body: {
    session_id?: string;
    question_id?: string;
    count?: number;
    exclude_answer_ids?: string[];
  } | null = null;
  try {
    body = parseJson(await request.json());
  } catch {
    return jsonError("Invalid request.");
  }

  const sessionId = body?.session_id ?? "";
  const questionId = body?.question_id ?? "";
  const count = Number.isInteger(body?.count) ? Number(body?.count) : 2;
  const exclude = new Set(
    (body?.exclude_answer_ids ?? []).filter(
      (id) => typeof id === "string" && UUID_RE.test(id),
    ),
  );

  if (!sessionId || !questionId) {
    return jsonError("Session and question are required.");
  }
  if (count < 1 || count > 2) {
    return jsonError("Draw 1 or 2 winners.");
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
      return jsonError("Close the question before picking winners.");
    }

    const { data: correct, error: correctError } = await admin
      .from("answers")
      .select("id, participant_name, phone")
      .eq("question_id", questionId)
      .eq("is_correct", true);

    if (correctError) throw correctError;

    const pool = (correct ?? []).filter((row) => !exclude.has(row.id));
    if (!pool.length) {
      return jsonError("No correct answers left to draw from.");
    }

    const picked = pickUnique(pool, count);

    return NextResponse.json({
      winners: picked.map((row) => ({
        answer_id: row.id,
        name: row.participant_name,
        phone: row.phone ?? "",
        phone_last4: phoneLast4(row.phone),
      })),
    });
  } catch (error) {
    console.error("draw winners", error);
    return jsonError("Could not draw winners. Try again.", 500);
  }
}
