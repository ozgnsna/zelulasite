import { Star } from "lucide-react";

export function StarRatingDisplay({
  rating,
  size = "md",
  className,
}: {
  rating: number;
  size?: "sm" | "md";
  className?: string;
}) {
  const starClass = size === "sm" ? "size-3.5" : "size-4";
  const rounded = Math.max(0, Math.min(5, Math.round(rating)));

  return (
    <div className={`inline-flex items-center gap-0.5 ${className ?? ""}`} aria-label={`${rounded} / 5 yıldız`}>
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          className={`${starClass} ${i < rounded ? "fill-[#c6a15b] text-[#c6a15b]" : "fill-stone-200 text-stone-200"}`}
          strokeWidth={1.5}
          aria-hidden
        />
      ))}
    </div>
  );
}

export function StarRatingInput({
  name,
  value,
  onChange,
  disabled,
}: {
  name: string;
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center gap-1" role="radiogroup" aria-label="Puan seçin">
      {Array.from({ length: 5 }, (_, i) => {
        const starValue = i + 1;
        const active = starValue <= value;
        return (
          <button
            key={starValue}
            type="button"
            name={name}
            disabled={disabled}
            aria-label={`${starValue} yıldız`}
            aria-pressed={active}
            onClick={() => onChange(starValue)}
            className="rounded p-0.5 transition hover:scale-105 disabled:opacity-50"
          >
            <Star
              className={`size-6 ${active ? "fill-[#c6a15b] text-[#c6a15b]" : "fill-stone-200 text-stone-300"}`}
              strokeWidth={1.5}
            />
          </button>
        );
      })}
      <input type="hidden" name={name} value={value > 0 ? String(value) : ""} />
    </div>
  );
}
