import { NextResponse } from "next/server";

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export function isUniqueViolation(error: { code?: string; message?: string }) {
  return (
    error.code === "23505" ||
    /duplicate key|unique constraint/i.test(error.message ?? "")
  );
}

export function parseJson<T>(value: unknown): T | null {
  if (!value || typeof value !== "object") return null;
  return value as T;
}

export function friendlyNetworkMessage(fallback = "Something went wrong. Check your connection and try again.") {
  return fallback;
}

export async function readErrorMessage(response: Response, fallback: string) {
  try {
    const body = (await response.json()) as { error?: string };
    if (body.error) return body.error;
  } catch {
    // ignore non-JSON error bodies
  }
  return fallback;
}
