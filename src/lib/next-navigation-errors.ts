/** Server action redirect()/notFound() — client catch bloğunda yeniden fırlatılmalı. */
export function isNextRedirectError(err: unknown): boolean {
  if (err && typeof err === "object" && "digest" in err) {
    return String((err as { digest?: string }).digest).includes("NEXT_REDIRECT");
  }
  return err instanceof Error && err.message === "NEXT_REDIRECT";
}
