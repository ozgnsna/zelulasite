"use client";

import { useId, useMemo, useState } from "react";
import {
  getEmailSmartSuggestion,
  isBasicValidEmail,
  normalizeEmailInput,
} from "@/lib/account/email-input";
import { cn } from "@/lib/utils";

const defaultInputClass =
  "w-full rounded-xl border border-[#e8dfd3]/90 bg-[linear-gradient(180deg,#ffffff_0%,#faf8f5_100%)] py-2.5 pl-4 pr-4 text-stone-900 outline-none transition-all duration-200 ease-out placeholder:text-stone-400 focus:border-[#C6A36D] focus:bg-white focus:shadow-[0_0_0_2px_rgba(198,163,109,0.15)] focus:ring-0 disabled:opacity-60";

type EmailFieldProps = {
  id: string;
  name?: string;
  disabled?: boolean;
  required?: boolean;
  placeholder?: string;
  inputClassName?: string;
  /** Parent set true when submit was blocked due to invalid email */
  submitBlocked?: boolean;
  onClearSubmitBlocked?: () => void;
};

export function EmailField({
  id,
  name = "email",
  disabled,
  required = true,
  placeholder = "siz@ornek.com",
  inputClassName,
  submitBlocked = false,
  onClearSubmitBlocked,
}: EmailFieldProps) {
  const [value, setValue] = useState("");
  const [blurred, setBlurred] = useState(false);
  const invalidId = useId();
  const suggestId = useId();

  const normalized = useMemo(() => normalizeEmailInput(value), [value]);
  const basicOk = useMemo(() => isBasicValidEmail(normalized), [normalized]);
  const suggestion = useMemo(() => getEmailSmartSuggestion(normalized), [normalized]);
  const showSuggestion = Boolean(suggestion && suggestion.full !== normalized);

  const showSoftInvalid = (blurred || submitBlocked) && normalized.length > 0 && !basicOk;

  const describedBy = [showSoftInvalid ? invalidId : null, showSuggestion ? suggestId : null]
    .filter(Boolean)
    .join(" ") || undefined;

  function applySuggestion() {
    if (!suggestion) return;
    setValue(suggestion.full);
    onClearSubmitBlocked?.();
  }

  return (
    <div className="space-y-0">
      <input
        id={id}
        name={name}
        type="text"
        inputMode="email"
        autoComplete="email"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        required={required}
        disabled={disabled}
        placeholder={placeholder}
        value={value}
        onChange={(e) => {
          const next = normalizeEmailInput(e.target.value);
          setValue(next);
          if (isBasicValidEmail(next)) onClearSubmitBlocked?.();
        }}
        onBlur={() => {
          setValue((v) => normalizeEmailInput(v));
          setBlurred(true);
        }}
        aria-invalid={showSoftInvalid}
        aria-describedby={describedBy}
        className={cn(
          defaultInputClass,
          inputClassName,
          showSoftInvalid &&
            "border-amber-200/70 focus:border-amber-300/55 focus:bg-white focus:shadow-[0_0_0_2px_rgba(198,163,109,0.12)] focus:ring-0",
        )}
      />

      <div className="mt-1.5 min-h-[1.25rem]">
        <p
          id={invalidId}
          role={showSoftInvalid ? "status" : undefined}
          aria-hidden={!showSoftInvalid}
          className={cn(
            "text-xs text-amber-900/55 transition-opacity duration-200 ease-out",
            showSoftInvalid ? "opacity-100" : "pointer-events-none opacity-0 select-none",
          )}
        >
          Geçerli bir email adresi gir
        </p>
      </div>

      {showSuggestion && suggestion ? (
        <div
          id={suggestId}
          className="mt-1 space-y-1 text-xs leading-relaxed text-stone-500 transition-opacity duration-200"
          aria-live="polite"
        >
          <p>
            <span className="font-medium text-stone-600">{suggestion.suggestedDomain}</span> mu demek istedin?
          </p>
          <button
            type="button"
            onClick={applySuggestion}
            className="block text-left font-medium text-[color:var(--brand-gold)] underline decoration-[color:var(--brand-gold)]/35 underline-offset-2 transition hover:decoration-[color:var(--brand-gold)]/70"
          >
            {suggestion.full}
          </button>
        </div>
      ) : null}
    </div>
  );
}
