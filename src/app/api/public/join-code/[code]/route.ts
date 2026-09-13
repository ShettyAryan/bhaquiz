import { NextResponse } from "next/server";
import { jsonError } from "@/lib/api";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ code: string }> },
) {
  const { code } = await context.params;
  const sessionNumber = Number.parseInt(code, 10);
  if (!Number.isInteger(sessionNumber) || sessionNumber < 1 || sessionNumber > 10) {
    return jsonError("Enter a session code from 1 to 10.");
  }

  try {
    const { data, error } = await getSupabaseAdmin()
      .from("sessions")
      .select("id, session_number, title")
      .eq("session_number", sessionNumber)
      .maybeSingle();

    if (error) throw error;
    if (!data) return jsonError("No session found for that code.", 404);
    return NextResponse.json({ session: data });
  } catch (error) {
    console.error("join code", error);
    return jsonError("Could not look up that session. Try again.", 500);
  }
}
