export function toCsv(headers: string[], rows: Array<Array<string | number | boolean | null>>) {
  const lines = [
    headers.map(escapeCsv).join(","),
    ...rows.map((row) => row.map((cell) => escapeCsv(cell ?? "")).join(",")),
  ];
  return `${lines.join("\r\n")}\r\n`;
}

function escapeCsv(value: string | number | boolean) {
  const text = String(value);
  if (/[",\r\n]/.test(text)) {
    return `"${text.replaceAll('"', '""')}"`;
  }
  return text;
}
