import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { jsonError } from "@/lib/api";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { asQuestion } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  if (!(await requireAdmin())) return jsonError("Unauthorized.", 401);

  const { id } = await context.params;

  try {
    const admin = getSupabaseAdmin();
    const { data: question, error: questionError } = await admin
      .from("questions")
      .select("id, session_id, is_open")
      .eq("id", id)
      .maybeSingle();

    if (questionError) throw questionError;
    if (!question) return jsonError("Question not found.", 404);
    if (question.is_open) {
      return NextResponse.json({ ok: true, alreadyOpen: true });
    }

    const now = new Date().toISOString();

    const { error: closeError } = await admin
      .from("questions")
      .update({ is_open: false, closed_at: now })
      .eq("session_id", question.session_id)
      .eq("is_open", true);

    if (closeError) throw closeError;

    const { data, error } = await admin
      .from("questions")
      .update({ is_open: true, opened_at: now, closed_at: null })
      .eq("id", id)
      .select("*")
      .single();

    if (error) throw error;
    return NextResponse.json({ question: asQuestion(data as Record<string, unknown>) });
  } catch (error) {
    console.error("open question", error);
    return jsonError("Could not open the question. Try again.", 500);
  }
}
