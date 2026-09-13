const TOKEN_KEY = "bunts-quiz-device-token";
const NAME_KEY = "bunts-quiz-participant-name";

export function getDeviceToken() {
  const existing = localStorage.getItem(TOKEN_KEY);
  if (existing) return existing;
  const token = crypto.randomUUID();
  localStorage.setItem(TOKEN_KEY, token);
  return token;
}

export function getSavedName() {
  return localStorage.getItem(NAME_KEY) ?? "";
}

export function saveName(name: string) {
  localStorage.setItem(NAME_KEY, name);
}

export function getSubmittedQuestionKey(sessionId: string) {
  return `bunts-quiz-submitted:${sessionId}`;
}
