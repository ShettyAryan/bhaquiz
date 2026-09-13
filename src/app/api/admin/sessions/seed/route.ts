import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { jsonError } from "@/lib/api";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const DEFAULT_TITLES = Array.from({ length: 10 }, (_, index) => ({
  session_number: index + 1,
  title: `Session ${index + 1}`,
}));

export async function POST() {
  if (!(await requireAdmin())) return jsonError("Unauthorized.", 401);

  try {
    const admin = getSupabaseAdmin();
    const { data: existing, error: existingError } = await admin
      .from("sessions")
      .select("session_number");

    if (existingError) throw existingError;

    const have = new Set((existing ?? []).map((row) => row.session_number));
    const missing = DEFAULT_TITLES.filter((row) => !have.has(row.session_number));

    if (missing.length) {
      const { error } = await admin.from("sessions").insert(missing);
      if (error) throw error;
    }

    return NextResponse.json({ ok: true, created: missing.length });
  } catch (error) {
    console.error("seed sessions", error);
    return jsonError("Could not create the 10 sessions. Try again.", 500);
  }
}
