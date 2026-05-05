"use client";

import { useId, useState } from "react";
import { getPasswordStrength, getPasswordStrengthDisplayLabel } from "@/lib/account/password-strength";
import { cn } from "@/lib/utils";

const defaultInputClass =
  "w-full rounded-xl border border-[#e8dfd3]/90 bg-[linear-gradient(180deg,#ffffff_0%,#faf8f5_100%)] py-2.5 pl-4 pr-12 text-stone-900 outline-none transition-all duration-200 ease-out placeholder:text-stone-400 focus:border-[#C6A36D] focus:bg-white focus:shadow-[0_0_0_2px_rgba(198,163,109,0.15)] focus:ring-0 disabled:opacity-60";

type PasswordFieldProps = {
  id: string;
  name?: string;
  autoComplete: "new-password" | "current-password";
  disabled?: boolean;
  required?: boolean;
  placeholder?: string;
  showStrength?: boolean;
  helperText?: string;
  showMinLengthError?: boolean;
  onValueChange?: (value: string) => void;
  className?: string;
  inputClassName?: string;
};

function EyeIcon({ open }: { open: boolean }) {
  if (open) {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-stone-500" aria-hidden>
        <path
          d="M3 3l18 18M10.58 10.58a2 2 0 002.83 2.83M9.88 9.88A3 3 0 0112 5c4.42 0 8.18 3.13 9 7a9.77 9.77 0 01-2.25 3.92M6.53 6.53A9.77 9.77 0 003 12c.82 3.87 4.58 7 9 7 1.55 0 3-.42 4.28-1.16"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M12 19c-4.42 0-8.18-3.13-9-7a9.77 9.77 0 012.09-3.47"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-stone-500" aria-hidden>
      <path
        d="M12 5C7.58 5 3.82 8.13 3 12c.82 3.87 4.58 7 9 7s8.18-3.13 9-7c-.82-3.87-4.58-7-9-7zm0 12a5 5 0 110-10 5 5 0 010 10z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function PasswordField({
  id,
  name = "password",
  autoComplete,
  disabled,
  required = true,
  placeholder,
  showStrength = false,
  helperText,
  showMinLengthError = false,
  onValueChange,
  className,
  inputClassName,
}: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);
  const [value, setValue] = useState("");
  const strengthId = useId();
  const helperId = useId();
  const errorId = useId();

  const strength = getPasswordStrength(value);
  const describedBy = [
    helperText ? helperId : null,
    showStrength ? strengthId : null,
    showMinLengthError ? errorId : null,
  ]
    .filter(Boolean)
    .join(" ") || undefined;

  return (
    <div className={cn("space-y-0", className)}>
      <div className="relative">
        <input
          id={id}
          name={name}
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          required={required}
          disabled={disabled}
          placeholder={placeholder}
          value={value}
          onChange={(e) => {
            const v = e.target.value;
            setValue(v);
            onValueChange?.(v);
          }}
          aria-describedby={describedBy}
          aria-invalid={showMinLengthError}
          className={cn(defaultInputClass, inputClassName)}
        />
        <button
          type="button"
          tabIndex={0}
          disabled={disabled}
          onClick={() => setVisible((v) => !v)}
          className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-stone-500 transition-colors hover:bg-stone-100/80 hover:text-stone-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--brand-gold)]/50 disabled:pointer-events-none disabled:opacity-40"
          aria-label={visible ? "Şifreyi gizle" : "Şifreyi göster"}
          aria-pressed={visible}
        >
          <EyeIcon open={visible} />
        </button>
      </div>

      {helperText ? (
        <p id={helperId} className="mt-2 text-xs leading-relaxed text-stone-500">
          {helperText}
        </p>
      ) : null}

      {showStrength ? (
        <div id={strengthId} className="mt-2 min-h-[2.75rem] space-y-1.5" aria-live="polite">
          <p className="text-xs text-stone-500 transition-colors duration-200">
            Şifre gücü:{" "}
            <span
              className={cn(
                "font-medium transition-colors duration-200",
                strength.label === "Zayıf" && "text-stone-600",
                strength.label === "Orta" && "text-amber-800/70",
                strength.label === "Güçlü" && "text-emerald-800/65",
              )}
            >
              {getPasswordStrengthDisplayLabel(strength.label)}
            </span>
          </p>
          <div className="h-1 overflow-hidden rounded-full bg-stone-200/90" aria-hidden>
            <div
              className={cn(
                "h-full rounded-full transition-[width,background-color] duration-300 ease-out",
                strength.label === "Zayıf" && "bg-stone-400/70",
                strength.label === "Orta" && "bg-amber-400/55",
                strength.label === "Güçlü" && "bg-emerald-600/45",
              )}
              style={{ width: `${strength.percent}%` }}
            />
          </div>
        </div>
      ) : null}

      {showStrength ? (
        <div className="mt-1.5 min-h-[1.25rem]">
          <p
            id={errorId}
            role={showMinLengthError ? "alert" : undefined}
            aria-hidden={!showMinLengthError}
            className={cn(
              "text-xs text-rose-600/75 transition-opacity duration-200 ease-out",
              showMinLengthError ? "opacity-100" : "opacity-0 select-none",
            )}
          >
            Şifren en az 8 karakter olmalı.
          </p>
        </div>
      ) : null}
    </div>
  );
}
