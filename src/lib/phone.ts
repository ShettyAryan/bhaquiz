const DIGITS_RE = /\D/g;

export function normalizePhone(value: string) {
  let digits = value.replace(DIGITS_RE, "");
  if (digits.length === 12 && digits.startsWith("91")) {
    digits = digits.slice(2);
  }
  if (digits.length === 11 && digits.startsWith("0")) {
    digits = digits.slice(1);
  }
  return digits;
}

export function isValidPhone(value: string) {
  return /^[6-9]\d{9}$/.test(normalizePhone(value));
}

export function phoneLast4(value: string | null | undefined) {
  const digits = normalizePhone(value ?? "");
  if (digits.length < 4) return "";
  return digits.slice(-4);
}

export function displayNameWithLast4(
  name: string,
  phone: string | null | undefined,
) {
  const tail = phoneLast4(phone);
  return tail ? `${name} · ${tail}` : name;
}
