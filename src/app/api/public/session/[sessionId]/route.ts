import { NextResponse } from "next/server";
import { jsonError } from "@/lib/api";
import { getPublicSessionState } from "@/lib/session-state";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ sessionId: string }> },
) {
  const { sessionId } = await context.params;

  try {
    const state = await getPublicSessionState(sessionId);
    if (!state) return jsonError("Session not found.", 404);
    return NextResponse.json(state);
  } catch (error) {
    console.error("public session", error);
    return jsonError("Could not load this session. Check your connection and try again.", 500);
  }
}
