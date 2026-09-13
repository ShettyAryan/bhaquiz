import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { jsonError, parseJson } from "@/lib/api";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  if (!(await requireAdmin())) return jsonError("Unauthorized.", 401);

  const { id } = await context.params;
  let body: { title?: string } | null = null;
  try {
    body = parseJson<{ title?: string }>(await request.json());
  } catch {
    return jsonError("Invalid request.");
  }

  const title = body?.title?.trim() ?? "";
  if (!title) return jsonError("Session title is required.");

  try {
    const { data, error } = await getSupabaseAdmin()
      .from("sessions")
      .update({ title })
      .eq("id", id)
      .select("id, session_number, title")
      .single();

    if (error) throw error;
    return NextResponse.json({ session: data });
  } catch (error) {
    console.error("update session", error);
    return jsonError("Could not update the session title. Try again.", 500);
  }
}
