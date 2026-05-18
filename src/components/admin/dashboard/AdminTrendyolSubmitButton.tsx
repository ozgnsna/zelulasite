"use client";

import { useFormStatus } from "react-dom";
import { cn } from "@/lib/utils";

export function AdminTrendyolSubmitButton({
  children,
  pendingLabel,
  variant = "secondary",
  className,
  name,
  value,
}: {
  children: React.ReactNode;
  pendingLabel: string;
  variant?: "primary" | "secondary" | "ghost";
  className?: string;
  name?: string;
  value?: string;
}) {
  const { pending } = useFormStatus();
  const base =
    variant === "primary"
      ? "bg-stone-900 text-white hover:bg-stone-800 border-transparent"
      : variant === "ghost"
        ? "border-transparent bg-transparent text-stone-600 hover:bg-stone-100"
        : "border-stone-200 bg-white text-stone-800 hover:border-stone-300 hover:bg-stone-50";

  return (
    <button
      type="submit"
      name={name}
      value={value}
      disabled={pending}
      className={cn(
        "inline-flex items-center justify-center rounded-lg border px-3 py-2 text-xs font-medium transition disabled:cursor-wait disabled:opacity-70",
        base,
        className,
      )}
    >
      {pending ? pendingLabel : children}
    </button>
  );
}
