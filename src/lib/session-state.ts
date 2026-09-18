import { phoneLast4 } from "@/lib/phone";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import {
  asQuestion,
  toPublicQuestion,
  type PublicSessionState,
  type PublicWinner,
} from "@/lib/types";

type WinnerJoin = {
  picked_at: string;
  answers:
    | { participant_name: string; phone: string | null; question_id: string }
    | { participant_name: string; phone: string | null; question_id: string }[]
    | null;
};

export async function getPublicSessionState(
  sessionId: string,
): Promise<PublicSessionState | null> {
  const admin = getSupabaseAdmin();

  const { data: session, error: sessionError } = await admin
    .from("sessions")
    .select("id, session_number, title")
    .eq("id", sessionId)
    .maybeSingle();

  if (sessionError) throw sessionError;
  if (!session) return null;

  const { data: questionRows, error: questionError } = await admin
    .from("questions")
    .select("*")
    .eq("session_id", sessionId)
    .order("opened_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(8);

  if (questionError) throw questionError;

  const questions = (questionRows ?? []).map((row) =>
    asQuestion(row as Record<string, unknown>),
  );
  const openQuestion = questions.find((question) => question.is_open);
  const latestQuestion = openQuestion ?? questions[0] ?? null;

  let answerCount = 0;
  if (latestQuestion) {
    const { count, error: countError } = await admin
      .from("answers")
      .select("id", { count: "exact", head: true })
      .eq("question_id", latestQuestion.id);

    if (countError) throw countError;
    answerCount = count ?? 0;
  }

  const { data: winnerRows, error: winnerError } = await admin
    .from("winners")
    .select("picked_at, answers(participant_name, phone, question_id)")
    .eq("session_id", sessionId)
    .order("picked_at", { ascending: false })
    .limit(20);

  if (winnerError) throw winnerError;

  const winners: PublicWinner[] = [];
  if (latestQuestion && !latestQuestion.is_open) {
    const openedAt = latestQuestion.opened_at
      ? new Date(latestQuestion.opened_at).getTime()
      : 0;

    for (const row of (winnerRows ?? []) as WinnerJoin[]) {
      const answerJoin = Array.isArray(row.answers) ? row.answers[0] : row.answers;
      if (!answerJoin?.participant_name) continue;
      if (answerJoin.question_id !== latestQuestion.id) continue;
      if (openedAt && new Date(row.picked_at).getTime() < openedAt) continue;
      winners.push({
        name: answerJoin.participant_name,
        phone_last4: phoneLast4(answerJoin.phone),
        picked_at: row.picked_at,
      });
      if (winners.length >= 2) break;
    }
  }

  winners.reverse();

  return {
    session: {
      id: session.id,
      session_number: session.session_number,
      title: session.title,
    },
    question: latestQuestion ? toPublicQuestion(latestQuestion) : null,
    answerCount,
    winners,
  };
}

export function validateQuestionPayload(input: {
  question_text?: unknown;
  options?: unknown;
  correct_option?: unknown;
}):
  | { error: string }
  | { questionText: string; options: string[]; correctOption: string } {
  const questionText =
    typeof input.question_text === "string" ? input.question_text.trim() : "";
  const options = Array.isArray(input.options)
    ? input.options
        .map((option) => (typeof option === "string" ? option.trim() : ""))
        .filter(Boolean)
    : [];
  const correctOption =
    typeof input.correct_option === "string" ? input.correct_option.trim() : "";

  if (!questionText) return { error: "Question text is required." };
  if (options.length < 2 || options.length > 4) {
    return { error: "Add between 2 and 4 options." };
  }
  if (new Set(options).size !== options.length) {
    return { error: "Options must be unique." };
  }
  if (!correctOption || !options.includes(correctOption)) {
    return { error: "Pick which option is correct." };
  }

  return { questionText, options, correctOption };
}
