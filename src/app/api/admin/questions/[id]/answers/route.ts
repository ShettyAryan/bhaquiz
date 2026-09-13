import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { jsonError } from "@/lib/api";
import { phoneLast4 } from "@/lib/phone";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { CorrectAnswerRow } from "@/lib/types";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  if (!(await requireAdmin())) return jsonError("Unauthorized.", 401);

  const { id } = await context.params;

  try {
    const admin = getSupabaseAdmin();
    const { data, error } = await admin
      .from("answers")
      .select("id, participant_name, phone, submitted_at, is_correct")
      .eq("question_id", id)
      .order("submitted_at", { ascending: true });

    if (error) throw error;

    const rows = data ?? [];
    const correct: CorrectAnswerRow[] = rows
      .filter((row) => row.is_correct)
      .map((row) => ({
        id: row.id,
        participant_name: row.participant_name,
        phone_last4: phoneLast4(row.phone),
        submitted_at: row.submitted_at,
      }));

    return NextResponse.json({
      total: rows.length,
      correctCount: correct.length,
      incorrectCount: rows.length - correct.length,
      correct,
    });
  } catch (error) {
    console.error("question answers", error);
    return jsonError("Could not load answers. Try again.", 500);
  }
}
