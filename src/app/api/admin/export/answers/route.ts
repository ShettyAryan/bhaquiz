import { requireAdmin } from "@/lib/auth";
import { jsonError } from "@/lib/api";
import { toCsv } from "@/lib/csv";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!(await requireAdmin())) return jsonError("Unauthorized.", 401);

  const sessionId = new URL(request.url).searchParams.get("sessionId") ?? "";
  if (!sessionId) return jsonError("sessionId is required.");

  try {
    const admin = getSupabaseAdmin();
    const { data: session, error: sessionError } = await admin
      .from("sessions")
      .select("id, session_number, title")
      .eq("id", sessionId)
      .maybeSingle();

    if (sessionError) throw sessionError;
    if (!session) return jsonError("Session not found.", 404);

    const { data: questions, error: questionsError } = await admin
      .from("questions")
      .select("id, question_text")
      .eq("session_id", sessionId);

    if (questionsError) throw questionsError;

    const questionIds = (questions ?? []).map((question) => question.id);
    const questionText = new Map(
      (questions ?? []).map((question) => [question.id, question.question_text]),
    );

    const { data: answers, error: answersError } = questionIds.length
      ? await admin
          .from("answers")
          .select("question_id, participant_name, chosen_option, is_correct, submitted_at")
          .in("question_id", questionIds)
          .order("submitted_at", { ascending: true })
      : { data: [], error: null };

    if (answersError) throw answersError;

    const csv = toCsv(
      [
        "session_number",
        "session_title",
        "question_text",
        "participant_name",
        "chosen_option",
        "is_correct",
        "submitted_at",
      ],
      (answers ?? []).map((answer) => [
        session.session_number,
        session.title,
        questionText.get(answer.question_id) ?? "",
        answer.participant_name,
        answer.chosen_option,
        answer.is_correct,
        answer.submitted_at,
      ]),
    );

    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="session-${session.session_number}-answers.csv"`,
      },
    });
  } catch (error) {
    console.error("export answers", error);
    return jsonError("Could not export answers. Try again.", 500);
  }
}
