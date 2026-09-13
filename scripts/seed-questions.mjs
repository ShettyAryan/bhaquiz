import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";

const envPath = resolve(process.cwd(), ".env.local");
const env = Object.fromEntries(
  readFileSync(envPath, "utf8")
    .split(/\r?\n/)
    .filter((line) => line && !line.startsWith("#"))
    .map((line) => {
      const i = line.indexOf("=");
      return [line.slice(0, i), line.slice(i + 1)];
    }),
);

const QUESTIONS = [
  {
    session_number: 1,
    question_text:
      "Which of the following is generally considered a moderate-intensity physical activity?",
    options: ["Brisk walking", "Sleeping", "Watching television", "Reading a book"],
    correct_option: "Brisk walking",
  },
  {
    session_number: 2,
    question_text: "Which nutrient is the body's main source of energy?",
    options: ["Vitamins", "Carbohydrates", "Minerals", "Water"],
    correct_option: "Carbohydrates",
  },
  {
    session_number: 3,
    question_text:
      "Which of the following is the best everyday choice for hydration for most healthy adults?",
    options: [
      "Sugary soft drink",
      "Energy drink",
      "Plain water",
      "Sweetened fruit drink",
    ],
    correct_option: "Plain water",
  },
  {
    session_number: 4,
    question_text: "Which food group is generally a good source of dietary fibre?",
    options: [
      "Whole grains, fruits and vegetables",
      "Butter and ghee",
      "Eggs and fish",
      "Refined sugar",
    ],
    correct_option: "Whole grains, fruits and vegetables",
  },
  {
    session_number: 5,
    question_text: "Which statement about sleep is most appropriate?",
    options: [
      "Adults do not need a regular sleep schedule",
      "Good-quality sleep is an important part of healthy living",
      "Sleeping less always improves productivity",
      "Sleep has no relationship with overall health",
    ],
    correct_option: "Good-quality sleep is an important part of healthy living",
  },
  {
    session_number: 6,
    question_text:
      "A person with normal body weight is automatically considered healthy.",
    options: ["True", "False"],
    correct_option: "False",
  },
  {
    session_number: 7,
    question_text:
      "Which of the following can help reduce the risk of lifestyle-related diseases?",
    options: [
      "Regular physical activity",
      "Regular tobacco use",
      "Prolonged physical inactivity",
      "Excessive consumption of processed foods",
    ],
    correct_option: "Regular physical activity",
  },
  {
    session_number: 8,
    question_text:
      "Which is generally the healthier approach to improving one's diet?",
    options: [
      "Making gradual, sustainable changes",
      "Following an extremely restrictive diet",
      "Skipping meals regularly",
      "Eliminating all carbohydrates",
    ],
    correct_option: "Making gradual, sustainable changes",
  },
  {
    session_number: 9,
    question_text:
      "Which of the following is most strongly associated with increased cardiovascular risk?",
    options: [
      "Regular physical activity",
      "Tobacco use",
      "Adequate sleep",
      "Eating vegetables",
    ],
    correct_option: "Tobacco use",
  },
  {
    session_number: 10,
    question_text:
      "Which of the following is an important benefit of regular physical activity?",
    options: [
      "It can improve cardiovascular fitness",
      "It eliminates the need for sleep",
      "It guarantees that disease will never occur",
      "It makes a balanced diet unnecessary",
    ],
    correct_option: "It can improve cardiovascular fitness",
  },
];

const admin = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

const { data: sessions, error: sessionError } = await admin
  .from("sessions")
  .select("id, session_number")
  .order("session_number", { ascending: true });

if (sessionError) throw sessionError;

const sessionByNumber = new Map(
  (sessions ?? []).map((session) => [session.session_number, session.id]),
);

const missing = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].filter(
  (number) => !sessionByNumber.has(number),
);
if (missing.length) {
  const { data: created, error: createError } = await admin
    .from("sessions")
    .insert(
      missing.map((session_number) => ({
        session_number,
        title: `Session ${session_number}`,
      })),
    )
    .select("id, session_number");
  if (createError) throw createError;
  for (const session of created ?? []) {
    sessionByNumber.set(session.session_number, session.id);
  }
}

const { data: existing, error: existingError } = await admin
  .from("questions")
  .select("question_text");

if (existingError) throw existingError;

const already = new Set((existing ?? []).map((row) => row.question_text));
const toInsert = QUESTIONS.filter((question) => !already.has(question.question_text)).map(
  (question) => ({
    session_id: sessionByNumber.get(question.session_number),
    question_text: question.question_text,
    options: question.options,
    correct_option: question.correct_option,
    is_open: false,
  }),
);

if (!toInsert.length) {
  console.log("All 10 questions are already in the database.");
  process.exit(0);
}

const { error: insertError } = await admin.from("questions").insert(toInsert);
if (insertError) throw insertError;

console.log(`Added ${toInsert.length} question(s).`);
