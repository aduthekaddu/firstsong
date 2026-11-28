// Leave room for the date, export label and extension on byte-limited volumes.
const maxStemBytes = 210;

export function songFileStem(title: string, maxLength: number) {
  const normalized = title.toLowerCase().normalize("NFC").replace(/[^\p{L}\p{N}\p{M}]+/gu, "-");
  // Keep marks attached to a letter or number when clipping a long title.
  const parts = normalized.match(/[\p{L}\p{N}]\p{M}*|-/gu) ?? [];
  const encoder = new TextEncoder();
  let bytes = 0;
  let stem = "";
  for (const part of parts) {
    if (part === "-" && (!stem || stem.endsWith("-"))) continue;
    bytes += encoder.encode(part).length;
    if (stem.length + part.length > maxLength || bytes > maxStemBytes) break;
    stem += part;
  }
  return stem.replace(/-$/, "");
}
