import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { jsonError, parseJson } from "@/lib/api";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { validateQuestionPayload } from "@/lib/session-state";
import { asQuestion } from "@/lib/types";

export const runtime = "nodejs";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  if (!(await requireAdmin())) return jsonError("Unauthorized.", 401);

  const { id } = await context.params;
  let body: {
    question_text?: string;
    options?: string[];
    correct_option?: string;
  } | null = null;

  try {
    body = parseJson(await request.json());
  } catch {
    return jsonError("Invalid request.");
  }

  const parsed = validateQuestionPayload(body ?? {});
  if ("error" in parsed) return jsonError(parsed.error ?? "Invalid question.");

  try {
    const admin = getSupabaseAdmin();
    const { data: existing, error: existingError } = await admin
      .from("questions")
      .select("id, is_open")
      .eq("id", id)
      .maybeSingle();

    if (existingError) throw existingError;
    if (!existing) return jsonError("Question not found.", 404);
    if (existing.is_open) {
      return jsonError("Close the question before editing it.");
    }

    const { data, error } = await admin
      .from("questions")
      .update({
        question_text: parsed.questionText,
        options: parsed.options,
        correct_option: parsed.correctOption,
      })
      .eq("id", id)
      .select("*")
      .single();

    if (error) throw error;
    return NextResponse.json({ question: asQuestion(data as Record<string, unknown>) });
  } catch (error) {
    console.error("update question", error);
    return jsonError("Could not update the question. Try again.", 500);
  }
}
