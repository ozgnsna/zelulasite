export function ListingIntro({
  text,
  children,
}: {
  text?: string | null;
  children: React.ReactNode;
}) {
  const intro = text?.trim();
  if (intro) {
    return <p className="mt-3 text-sm leading-relaxed text-stone-600">{intro}</p>;
  }
  return children;
}

export function ListingSeoBody({ text }: { text?: string | null }) {
  const body = text?.trim();
  if (!body) return null;
  const paragraphs = body
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (paragraphs.length === 0) return null;
  return (
    <section className="mx-auto mt-16 max-w-3xl border-t border-[#e8e2d9] pt-10">
      {paragraphs.map((paragraph) => (
        <p key={paragraph.slice(0, 48)} className="mt-4 text-sm leading-relaxed text-stone-600 first:mt-0">
          {paragraph}
        </p>
      ))}
    </section>
  );
}
