import { NextResponse } from "next/server";
import { isUniqueViolation, jsonError, parseJson } from "@/lib/api";
import { isValidPhone, normalizePhone } from "@/lib/phone";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { parseOptions } from "@/lib/types";

export const runtime = "nodejs";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  let body: {
    question_id?: string;
    participant_name?: string;
    phone?: string;
    device_token?: string;
    chosen_option?: string;
  } | null = null;

  try {
    body = parseJson(await request.json());
  } catch {
    return jsonError("Invalid request.");
  }

  const questionId = body?.question_id?.trim() ?? "";
  const name = body?.participant_name?.trim() ?? "";
  const phone = normalizePhone(body?.phone ?? "");
  const deviceToken = body?.device_token?.trim() ?? "";
  const chosenOption = body?.chosen_option?.trim() ?? "";

  if (!questionId || !UUID_RE.test(questionId)) {
    return jsonError("This question is no longer available.");
  }
  if (name.length < 1 || name.length > 80) {
    return jsonError("Enter your name (up to 80 characters).");
  }
  if (!isValidPhone(phone)) {
    return jsonError("Enter a valid 10-digit mobile number.");
  }
  if (!deviceToken || deviceToken.length > 80) {
    return jsonError("Could not identify this device. Refresh and try again.");
  }
  if (!chosenOption) {
    return jsonError("Pick an answer.");
  }

  try {
    const admin = getSupabaseAdmin();
    const { data: question, error: questionError } = await admin
      .from("questions")
      .select("id, is_open, options, correct_option")
      .eq("id", questionId)
      .maybeSingle();

    if (questionError) throw questionError;
    if (!question) return jsonError("This question is no longer available.", 404);
    if (!question.is_open) {
      return jsonError("Answers are closed for this question.", 409);
    }

    const options = parseOptions(question.options);
    if (!options.includes(chosenOption)) {
      return jsonError("That option is not available.");
    }

    const { error: insertError } = await admin.from("answers").insert({
      question_id: questionId,
      participant_name: name,
      phone,
      device_token: deviceToken,
      chosen_option: chosenOption,
      is_correct: chosenOption === question.correct_option,
    });

    if (insertError) {
      if (isUniqueViolation(insertError)) {
        return NextResponse.json(
          { error: "You've already answered this question." },
          { status: 409 },
        );
      }
      throw insertError;
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("submit answer", error);
    return jsonError("Could not submit your answer. Check your connection and try again.", 500);
  }
}
