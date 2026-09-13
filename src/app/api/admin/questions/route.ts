import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { jsonError, parseJson } from "@/lib/api";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { validateQuestionPayload } from "@/lib/session-state";
import { asQuestion } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!(await requireAdmin())) return jsonError("Unauthorized.", 401);

  let body: {
    session_id?: string;
    question_text?: string;
    options?: string[];
    correct_option?: string;
  } | null = null;

  try {
    body = parseJson(await request.json());
  } catch {
    return jsonError("Invalid request.");
  }

  const sessionId = body?.session_id ?? "";
  if (!sessionId) return jsonError("Session is required.");

  const parsed = validateQuestionPayload(body ?? {});
  if ("error" in parsed) return jsonError(parsed.error ?? "Invalid question.");

  try {
    const { data, error } = await getSupabaseAdmin()
      .from("questions")
      .insert({
        session_id: sessionId,
        question_text: parsed.questionText,
        options: parsed.options,
        correct_option: parsed.correctOption,
        is_open: false,
      })
      .select("*")
      .single();

    if (error) throw error;
    return NextResponse.json({ question: asQuestion(data as Record<string, unknown>) });
  } catch (error) {
    console.error("create question", error);
    return jsonError("Could not save the question. Try again.", 500);
  }
}
