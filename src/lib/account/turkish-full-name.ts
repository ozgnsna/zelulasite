const LOCALE = "tr-TR";

function capitalizeTurkishWord(word: string): string {
  if (!word) return "";
  const first = word.charAt(0).toLocaleUpperCase(LOCALE);
  const rest = word.slice(1).toLocaleLowerCase(LOCALE);
  return first + rest;
}

/** Final storage / blur: trim, single spaces between words, Turkish title-case per word. */
export function normalizeTurkishFullName(raw: string): string {
  const collapsed = raw.replace(/\s+/g, " ").trim();
  if (collapsed === "") return "";
  return collapsed.split(" ").map(capitalizeTurkishWord).join(" ");
}

/** As-you-type: title-case each segment; any run of whitespace becomes one space (except we preserve trailing space while typing). */
export function formatTurkishFullNameLive(raw: string): string {
  return raw
    .split(/(\s+)/)
    .map((part) => {
      if (/^\s+$/.test(part)) {
        return " ";
      }
      return capitalizeTurkishWord(part);
    })
    .join("");
}
