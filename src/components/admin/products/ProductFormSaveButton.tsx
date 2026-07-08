"use client";

import { cn } from "@/lib/utils";
import { useFormStatus } from "react-dom";

export function ProductFormSaveButton({
  className,
  label,
}: {
  className?: string;
  label?: string;
}) {
  const { pending } = useFormStatus();
  const buttonLabel = pending ? "Kaydediliyor..." : (label ?? "Değişiklikleri kaydet");

  return (
    <button
      type="submit"
      disabled={pending}
      className={cn(
        "w-full rounded-xl bg-stone-800 px-5.5 py-2.5 text-base font-normal text-[#fdfcfa] shadow-[0_8px_20px_rgba(30,24,18,0.18)] transition-[transform,box-shadow,background-color] hover:-translate-y-[0.5px] hover:bg-stone-700 hover:shadow-[0_10px_22px_rgba(30,24,18,0.2)] disabled:cursor-not-allowed disabled:opacity-85",
        className,
      )}
    >
      <span className="inline-flex items-center gap-1.5">
        {pending ? null : <span className="text-[0.72em]">💾</span>}
        {buttonLabel}
      </span>
    </button>
  );
}
