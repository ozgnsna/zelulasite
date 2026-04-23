type Level = "info" | "warn" | "error";

export function logPayment(level: Level, message: string, meta?: unknown) {
  const line = `[payments] ${message}`;
  if (level === "error") console.error(line, meta ?? "");
  else if (level === "warn") console.warn(line, meta ?? "");
  else console.info(line, meta ?? "");
}
