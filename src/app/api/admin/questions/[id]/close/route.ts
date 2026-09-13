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
    const { data, error } = await getSupabaseAdmin()
      .from("questions")
      .update({ is_open: false, closed_at: new Date().toISOString() })
      .eq("id", id)
      .select("*")
      .single();

    if (error) throw error;
    return NextResponse.json({ question: asQuestion(data as Record<string, unknown>) });
  } catch (error) {
    console.error("close question", error);
    return jsonError("Could not close the question. Try again.", 500);
  }
}
