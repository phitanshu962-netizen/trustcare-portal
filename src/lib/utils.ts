/**
 * Normalizes an enrollment ID to the standard format (e.g., TCIHS001).
 * Supports:
 * - Bare numbers (e.g., "1" -> "TCIHS001", "12" -> "TCIHS012", "123" -> "TCIHS123")
 * - Case insensitivity (e.g., "tcihs001" -> "TCIHS001")
 * - Spaces/dashes (e.g., "TCIHS - 12" -> "TCIHS012")
 */
export function normalizeEnrollmentId(id: string): string {
  const trimmed = id.trim();
  if (!trimmed) return "";

  // Check if it's already just a number
  if (/^\d+$/.test(trimmed)) {
    const padded = trimmed.padStart(3, "0");
    return `TCIHS${padded}`;
  }

  // Check if it starts with TCIHS or TCHS (case-insensitive) with optional spaces or dashes
  const match = trimmed.match(/^(?:TCIHS|TCHS)[- ]*(\d+)$/i);
  if (match) {
    const numStr = match[1];
    const padded = numStr.padStart(3, "0");
    return `TCIHS${padded}`;
  }

  // Otherwise, return uppercase of whatever was entered
  return trimmed.toUpperCase();
}
