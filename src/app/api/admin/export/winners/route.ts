import { requireAdmin } from "@/lib/auth";
import { jsonError } from "@/lib/api";
import { toCsv } from "@/lib/csv";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function GET() {
  if (!(await requireAdmin())) return jsonError("Unauthorized.", 401);

  try {
    const admin = getSupabaseAdmin();
    const { data: winners, error: winnersError } = await admin
      .from("winners")
      .select("picked_at, session_id, answer_id")
      .order("picked_at", { ascending: true });

    if (winnersError) throw winnersError;

    const sessionIds = [...new Set((winners ?? []).map((row) => row.session_id))];
    const answerIds = [...new Set((winners ?? []).map((row) => row.answer_id))];

    const { data: sessions, error: sessionsError } = sessionIds.length
      ? await admin
          .from("sessions")
          .select("id, session_number, title")
          .in("id", sessionIds)
      : { data: [], error: null };
    if (sessionsError) throw sessionsError;

    const { data: answers, error: answersError } = answerIds.length
      ? await admin
          .from("answers")
          .select("id, participant_name, question_id")
          .in("id", answerIds)
      : { data: [], error: null };
    if (answersError) throw answersError;

    const questionIds = [
      ...new Set((answers ?? []).map((row) => row.question_id).filter(Boolean)),
    ];
    const { data: questions, error: questionsError } = questionIds.length
      ? await admin.from("questions").select("id, question_text").in("id", questionIds)
      : { data: [], error: null };
    if (questionsError) throw questionsError;

    const sessionMap = new Map((sessions ?? []).map((row) => [row.id, row]));
    const answerMap = new Map((answers ?? []).map((row) => [row.id, row]));
    const questionMap = new Map((questions ?? []).map((row) => [row.id, row]));

    const csv = toCsv(
      ["session_number", "session_title", "question_text", "winner_name", "picked_at"],
      (winners ?? []).map((row) => {
        const session = sessionMap.get(row.session_id);
        const answer = answerMap.get(row.answer_id);
        const question = answer ? questionMap.get(answer.question_id) : undefined;
        return [
          session?.session_number ?? "",
          session?.title ?? "",
          question?.question_text ?? "",
          answer?.participant_name ?? "",
          row.picked_at,
        ];
      }),
    );

    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="all-winners.csv"',
      },
    });
  } catch (error) {
    console.error("export winners", error);
    return jsonError("Could not export winners. Try again.", 500);
  }
}
