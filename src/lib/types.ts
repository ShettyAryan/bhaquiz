export type Session = {
  id: string;
  session_number: number;
  title: string;
  created_at: string;
};

export type Question = {
  id: string;
  session_id: string;
  question_text: string;
  options: string[];
  correct_option: string;
  is_open: boolean;
  opened_at: string | null;
  closed_at: string | null;
  created_at: string;
};

export type PublicQuestion = Omit<Question, "correct_option">;

export type Answer = {
  id: string;
  question_id: string;
  participant_name: string;
  phone: string | null;
  device_token: string;
  chosen_option: string;
  is_correct: boolean;
  submitted_at: string;
};

export type Winner = {
  id: string;
  session_id: string;
  answer_id: string;
  picked_at: string;
};

export type PublicSessionState = {
  session: Pick<Session, "id" | "session_number" | "title">;
  question: PublicQuestion | null;
  answerCount: number;
  winner: { name: string; phone_last4: string; picked_at: string } | null;
};

export type AdminQuestion = Question & {
  answerCount: number;
  correctCount: number;
};

export type AdminSession = Session & {
  questions: AdminQuestion[];
  winners: Array<{
    id: string;
    picked_at: string;
    participant_name: string;
    phone_last4: string;
    question_id: string;
  }>;
};

export type CorrectAnswerRow = {
  id: string;
  participant_name: string;
  phone_last4: string;
  submitted_at: string;
};

export function parseOptions(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

export function asQuestion(row: Record<string, unknown>): Question {
  return {
    id: String(row.id),
    session_id: String(row.session_id),
    question_text: String(row.question_text),
    options: parseOptions(row.options),
    correct_option: String(row.correct_option ?? ""),
    is_open: Boolean(row.is_open),
    opened_at: (row.opened_at as string | null) ?? null,
    closed_at: (row.closed_at as string | null) ?? null,
    created_at: String(row.created_at ?? ""),
  };
}

export function toPublicQuestion(question: Question): PublicQuestion {
  const { correct_option: _hidden, ...rest } = question;
  void _hidden;
  return rest;
}
